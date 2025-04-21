import { Communication } from "../../../schema/schema.general";
import { log } from "../../general/log";

// Define event types
export type ConnectionStatus =
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected";

export type ConnectionStats = {
    status: ConnectionStatus;
    isConnected: boolean;
    isConnecting: boolean;
    isReconnecting: boolean;
    connectionDuration?: number;
};
type ConnectionEventListener = () => void;

export interface VircadiaClientCoreConfig {
    // Connection settings
    serverUrl: string;
    authToken: string;
    authProvider: string;

    // Reconnection settings
    reconnectAttempts?: number;
    reconnectDelay?: number;

    // Debug settings
    debug?: boolean;
    suppress?: boolean;
}

// Handles all WebSocket communication with the server
class ConnectionManager {
    private ws: WebSocket | null = null;
    private reconnectTimer: Timer | null = null;
    private reconnectCount = 0;
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
            timeout: Timer;
        }
    >();
    private eventListeners = new Map<string, Set<ConnectionEventListener>>();
    private lastStatus: ConnectionStatus = "disconnected";
    private connectionStartTime: number | null = null;

    constructor(private config: VircadiaClientCoreConfig) {}

    // Event handling methods
    addEventListener(event: string, listener: ConnectionEventListener): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(listener);
    }

    removeEventListener(
        event: string,
        listener: ConnectionEventListener,
    ): void {
        this.eventListeners.get(event)?.delete(listener);
    }

    private emitEvent(event: string): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener();
            }
        }
    }

    private updateConnectionStatus(status: ConnectionStatus): void {
        if (this.lastStatus !== status) {
            this.lastStatus = status;
            this.emitEvent("statusChange");
        }
    }

    // Connect to the server and handle authentication
    async connect(): Promise<boolean> {
        if (this.isClientConnected() || this.isConnecting())
            return this.isClientConnected();

        try {
            this.updateConnectionStatus("connecting");

            const url = new URL(this.config.serverUrl);
            url.searchParams.set("token", this.config.authToken);
            url.searchParams.set("provider", this.config.authProvider);

            this.ws = new WebSocket(url);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);

            await new Promise<void>((resolve, reject) => {
                if (!this.ws)
                    return reject(new Error("WebSocket not initialized"));

                // Define a handler for connection errors
                const handleConnectionError = (event: CloseEvent) => {
                    // Try to extract detailed error information from the close event
                    let errorMessage = "Connection failed";

                    // If there's a meaningful reason phrase
                    if (event.reason) {
                        errorMessage = event.reason;
                    }

                    this.updateConnectionStatus("disconnected");
                    reject(
                        new Error(
                            `WebSocket connection failed: ${errorMessage}`,
                        ),
                    );
                };

                this.ws.onopen = () => {
                    // Remove the error handler once connected
                    if (this.ws) this.ws.onclose = this.handleClose.bind(this);
                    this.updateConnectionStatus("connected");
                    this.connectionStartTime = Date.now();
                    resolve();
                };

                // Enhanced error handling
                this.ws.onerror = (err) => {
                    this.updateConnectionStatus("disconnected");
                    reject(
                        new Error(
                            `WebSocket error: ${err instanceof Error ? err.message : "Unknown error"}`,
                        ),
                    );
                };

                // Temporarily override onclose to catch authentication failures
                this.ws.onclose = handleConnectionError;
            });

            this.reconnectCount = 0;
            return true;
        } catch (error) {
            // Attempt reconnection
            this.attemptReconnect();

            // Re-throw with enhanced error info if possible
            if (error instanceof Error) {
                // Check if this is an authentication error
                if (
                    error.message.includes("401") ||
                    error.message.includes("Invalid token") ||
                    error.message.includes("Authentication")
                ) {
                    throw new Error(`Authentication failed: ${error.message}`);
                }
            }

            throw error;
        }
    }

    // Send a query to the server and wait for response
    async sendQueryAsync<T = unknown>(data: {
        query: string;
        parameters?: unknown[];
        timeoutMs?: number;
    }): Promise<Communication.WebSocket.QueryResponseMessage<T>> {
        if (!this.isClientConnected()) {
            throw new Error("Not connected to server");
        }

        const requestId = crypto.randomUUID();
        const message = new Communication.WebSocket.QueryRequestMessage({
            query: data.query,
            parameters: data.parameters,
            requestId,
            errorMessage: null,
        });

        return new Promise<Communication.WebSocket.QueryResponseMessage<T>>(
            (resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Request timeout"));
                }, data.timeoutMs ?? 10000);

                this.pendingRequests.set(requestId, {
                    resolve: resolve as (value: unknown) => void,
                    reject,
                    timeout,
                });
                this.ws?.send(JSON.stringify(message));
            },
        );
    }

    // Connection state methods - keep these as internal methods
    private isConnecting(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
    }

    private isClientConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    private isReconnecting(): boolean {
        return this.reconnectTimer !== null;
    }

    // Enhanced connection status method that replaces individual status methods
    getConnectionStatus(): {
        status: ConnectionStatus;
        isConnected: boolean;
        isConnecting: boolean;
        isReconnecting: boolean;
        connectionDuration?: number;
    } {
        const connectionDuration = this.connectionStartTime
            ? Date.now() - this.connectionStartTime
            : undefined;

        return {
            status: this.lastStatus,
            isConnected: this.isClientConnected(),
            isConnecting: this.isConnecting(),
            isReconnecting: this.isReconnecting(),
            connectionDuration,
        };
    }

    // Clean up and disconnect
    disconnect(): void {
        // Clear any reconnect timer
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Clear all pending requests with a disconnection error
        for (const [requestId, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeout);
            request.reject(new Error("Connection closed"));
            this.pendingRequests.delete(requestId);
        }

        // Close WebSocket if it exists
        if (this.ws) {
            // Remove event handlers first to prevent reconnection attempts
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;

            // Close the connection if it's not already closed
            if (
                this.ws.readyState === WebSocket.OPEN ||
                this.ws.readyState === WebSocket.CONNECTING
            ) {
                this.ws.close();
            }
            this.ws = null;
        }

        this.updateConnectionStatus("disconnected");
        this.connectionStartTime = null;
    }

    // Private methods for WebSocket handling
    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(
                event.data,
            ) as Communication.WebSocket.Message;
            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);

                request.resolve(message);
            }
        } catch (error) {
            log({
                message: "Error handling WebSocket message:",
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
        }
    }

    private handleClose(event: CloseEvent): void {
        this.updateConnectionStatus("disconnected");
        this.attemptReconnect();
    }

    private handleError(event: Event): void {
        let errorMessage = "Unknown WebSocket error";

        // Try to extract more specific error info
        if (event instanceof ErrorEvent) {
            errorMessage = event.message;
        } else if (event instanceof CloseEvent) {
            errorMessage = event.reason || `Code: ${event.code}`;
        }

        this.updateConnectionStatus("disconnected");

        log({
            message: "WebSocket error:",
            type: "error",
            error: errorMessage,
            debug: this.config.debug,
            suppress: this.config.suppress,
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectTimer !== null) return;

        const maxAttempts = this.config.reconnectAttempts ?? 5;
        const delay = this.config.reconnectDelay ?? 5000;

        if (this.reconnectCount >= maxAttempts) {
            log({
                message: "Max reconnection attempts reached",
                type: "error",
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
            return;
        }

        this.updateConnectionStatus("reconnecting");

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectCount++;

            try {
                await this.connect();
            } catch (error) {
                log({
                    message: "Reconnection attempt failed:",
                    type: "error",
                    error,
                    debug: this.config.debug,
                    suppress: this.config.suppress,
                });
            }
        }, delay);
    }

    // New methods for debugging and monitoring
    getPendingRequests(): {
        requestId: string;
        elapsedMs: number;
        query?: string;
    }[] {
        const now = Date.now();
        return Array.from(this.pendingRequests.entries()).map(
            ([requestId, request]) => {
                const elapsedMs = now - (request.timeout as unknown as number);
                return { requestId, elapsedMs };
            },
        );
    }

    getConnectionStats(): {
        reconnectAttempts: number;
        pendingRequestsCount: number;
        connectionDuration?: number;
    } {
        const connectionDuration = this.connectionStartTime
            ? Date.now() - this.connectionStartTime
            : undefined;
        return {
            reconnectAttempts: this.reconnectCount,
            pendingRequestsCount: this.pendingRequests.size,
            connectionDuration,
        };
    }
}

// Main class that coordinates all components and exposes utilities
export class VircadiaClientCore {
    private connectionManager: ConnectionManager;

    constructor(private config: VircadiaClientCoreConfig) {
        this.connectionManager = new ConnectionManager(config);
    }

    // Expose utilities
    get Utilities() {
        return {
            Connection: {
                // Connection methods
                connect: async (): Promise<boolean> => {
                    return this.connectionManager.connect();
                },
                disconnect: (): void => {
                    this.connectionManager.disconnect();
                },
                addEventListener: (
                    event: string,
                    listener: ConnectionEventListener,
                ): void => {
                    this.connectionManager.addEventListener(event, listener);
                },
                removeEventListener: (
                    event: string,
                    listener: ConnectionEventListener,
                ): void => {
                    this.connectionManager.removeEventListener(event, listener);
                },
                query: async <T>(data: {
                    query: string;
                    parameters?: unknown[];
                    timeoutMs?: number;
                }): Promise<
                    Communication.WebSocket.QueryResponseMessage<T>
                > => {
                    return this.connectionManager.sendQueryAsync<T>(data);
                },
                // Debug monitoring
                getPendingRequests: (): {
                    requestId: string;
                    elapsedMs: number;
                    query?: string;
                }[] => {
                    return this.connectionManager.getPendingRequests();
                },
                getConnectionStatus: (): {
                    status: ConnectionStatus;
                    isConnected: boolean;
                    isConnecting: boolean;
                    isReconnecting: boolean;
                    connectionDuration?: number;
                } => {
                    return this.connectionManager.getConnectionStatus();
                },
                getConnectionStats: (): {
                    reconnectAttempts: number;
                    pendingRequestsCount: number;
                } => {
                    return {
                        reconnectAttempts:
                            this.connectionManager.getConnectionStats()
                                .reconnectAttempts,
                        pendingRequestsCount:
                            this.connectionManager.getConnectionStats()
                                .pendingRequestsCount,
                    };
                },
            },
        };
    }

    // Clean up resources
    dispose(): void {
        if (this.connectionManager) {
            this.connectionManager.disconnect();
        }
    }
}
