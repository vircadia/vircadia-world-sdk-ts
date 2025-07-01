import { Communication } from "../../../schema/src/vircadia.schema.general";

/**
 * Represents the possible connection states for the client
 */
export type ClientCoreConnectionState =
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected";

/**
 * Contains detailed information about the current connection state
 */
export type ClientCoreConnectionInfo = {
    /** Current connection status */
    status: ClientCoreConnectionState;
    /** Whether the client is currently connected */
    isConnected: boolean;
    /** Whether the client is currently connecting */
    isConnecting: boolean;
    /** Whether the client is currently reconnecting */
    isReconnecting: boolean;
    /** Duration of the current connection in milliseconds */
    connectionDuration?: number;
    /** Number of reconnection attempts made */
    reconnectAttempts: number;
    /** List of pending requests with their IDs and elapsed time */
    pendingRequests: Array<{
        requestId: string;
        elapsedMs: number;
    }>;
    /** Identifier of the agent assigned by the server */
    agentId: string | null;
    /** Identifier of the session assigned by the server */
    sessionId: string | null;
};

/**
 * Event listener function type for connection events
 */
export type ClientCoreConnectionEventListener = () => void;

/**
 * Configuration options for the ClientCore
 */
interface ClientCoreConfig {
    // Connection settings
    /** URL of the Vircadia server to connect to */
    serverUrl: string;
    /** Authentication token for the server */
    authToken: string;
    /** Authentication provider name */
    authProvider: string;

    // Reconnection settings
    /** Maximum number of reconnection attempts (default: 5) */
    reconnectAttempts?: number;
    /** Delay between reconnection attempts in milliseconds (default: 5000) */
    reconnectDelay?: number;

    // Debug settings
    /** Enable debug logging */
    debug?: boolean;
    /** Suppress all console output */
    suppress?: boolean;
}

/**
 * Helper function for debug logging when debug mode is enabled
 * @param {ClientCoreConfig} config - The client configuration
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 */
const debugLog = (
    config: ClientCoreConfig,
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: Needed for flexible debug logging
    ...args: any[]
) => {
    if (config.debug && !config.suppress) {
        console.log(message, ...args);
    }
};

/**
 * Helper function for error logging
 * @param {ClientCoreConfig} config - The client configuration
 * @param {string} message - The error message to log
 * @param {...any} args - Additional arguments to log
 */
const debugError = (
    config: ClientCoreConfig,
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: Needed for flexible debug logging
    ...args: any[]
) => {
    if (!config.suppress) {
        console.error(message, ...args);
    }
};

/**
 * Handles all WebSocket communication with the Vircadia server
 * Manages connection, reconnection, and message passing
 */
class CoreConnectionManager {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectCount = 0;
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();
    private eventListeners = new Map<
        string,
        Set<ClientCoreConnectionEventListener>
    >();
    private lastStatus: ClientCoreConnectionState = "disconnected";
    private connectionStartTime: number | null = null;
    private connectionPromise: Promise<ClientCoreConnectionInfo> | null = null;
    // Fields to store session information received from the server
    private agentId: string | null = null;
    private sessionId: string | null = null;

    /**
     * Creates a new CoreConnectionManager instance
     * @param {ClientCoreConfig} config - Configuration for the connection
     */
    constructor(private config: ClientCoreConfig) {}

    /**
     * Adds an event listener for connection events
     * @param {string} event - The event name to listen for
     * @param {ClientCoreConnectionEventListener} listener - The callback function
     */
    addEventListener(
        event: string,
        listener: ClientCoreConnectionEventListener,
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(listener);
    }

    /**
     * Removes an event listener
     * @param {string} event - The event name
     * @param {ClientCoreConnectionEventListener} listener - The callback function to remove
     */
    removeEventListener(
        event: string,
        listener: ClientCoreConnectionEventListener,
    ): void {
        this.eventListeners.get(event)?.delete(listener);
    }

    /**
     * Emits an event to all registered listeners
     * @param {string} event - The event name to emit
     * @private
     */
    private emitEvent(event: string): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener();
            }
        }
    }

    /**
     * Updates the connection status and emits a statusChange event if changed
     * @param {ClientCoreConnectionState} status - The new connection status
     * @private
     */
    private updateConnectionStatus(status: ClientCoreConnectionState): void {
        if (this.lastStatus !== status) {
            this.lastStatus = status;
            this.emitEvent("statusChange");
        }
    }

    /**
     * Connects to the Vircadia server with authentication
     * @param {Object} options - Connection options
     * @param {number} [options.timeoutMs] - Connection timeout in milliseconds (default: 30000)
     * @returns {Promise<ClientCoreConnectionInfo>} - Promise resolving to connection information
     * @throws {Error} If connection or authentication fails
     */
    async connect(options?: {
        timeoutMs?: number;
    }): Promise<ClientCoreConnectionInfo> {
        // If already connected, return immediately
        if (this.isClientConnected()) {
            return this.getConnectionInfo();
        }

        // If connection is in progress, return the existing promise
        if (this.connectionPromise && this.isConnecting()) {
            return this.connectionPromise;
        }

        // Create new connection promise
        this.connectionPromise = (async () => {
            try {
                this.updateConnectionStatus("connecting");

                const url = new URL(this.config.serverUrl);
                url.searchParams.set("token", this.config.authToken);
                url.searchParams.set("provider", this.config.authProvider);

                debugLog(
                    this.config,
                    "Connecting to WebSocket server:",
                    url.toString(),
                );

                this.ws = new WebSocket(url);
                this.ws.onmessage = this.handleMessage.bind(this);
                this.ws.onclose = this.handleClose.bind(this);
                this.ws.onerror = this.handleError.bind(this);

                // Add timeout for connection
                const connectionTimeoutMs = options?.timeoutMs || 30000; // Default 30 seconds timeout

                await Promise.race([
                    new Promise<void>((resolve, reject) => {
                        if (!this.ws)
                            return reject(
                                new Error("WebSocket not initialized"),
                            );

                        // Define a handler for connection errors
                        const handleConnectionError = (event: CloseEvent) => {
                            let errorMessage = "Connection failed";
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
                            if (this.ws)
                                this.ws.onclose = this.handleClose.bind(this);
                            this.updateConnectionStatus("connected");
                            this.connectionStartTime = Date.now();
                            debugLog(
                                this.config,
                                "WebSocket connection established",
                            );
                            resolve();
                        };

                        this.ws.onerror = (err) => {
                            this.updateConnectionStatus("disconnected");
                            reject(
                                new Error(
                                    `WebSocket error: ${err instanceof Error ? err.message : "Unknown error"}`,
                                ),
                            );
                        };

                        this.ws.onclose = handleConnectionError;
                    }),
                    new Promise<never>((_, reject) => {
                        setTimeout(
                            () => reject(new Error("Connection timeout")),
                            connectionTimeoutMs,
                        );
                    }),
                ]);

                this.reconnectCount = 0;
                return this.getConnectionInfo();
            } catch (error) {
                // Attempt reconnection
                this.attemptReconnect();

                // Re-throw with enhanced error info if possible
                if (error instanceof Error) {
                    if (
                        error.message.includes("401") ||
                        error.message.includes("Invalid token") ||
                        error.message.includes("Authentication")
                    ) {
                        throw new Error(
                            `Authentication failed: ${error.message}`,
                        );
                    }
                }

                throw error;
            } finally {
                // Clear the promise reference to allow future connect attempts
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    /**
     * Sends a query to the server and waits for a response
     * @template T - Type of the expected response data
     * @param {Object} data - Query data
     * @param {string} data.query - The query string/command to send
     * @param {unknown[]} [data.parameters] - Optional parameters for the query
     * @param {number} [data.timeoutMs] - Timeout in milliseconds (default: 10000)
     * @returns {Promise<Communication.WebSocket.QueryResponseMessage<T>>} The server's response
     * @throws {Error} If not connected or if the request times out
     */
    async query<T = unknown>(data: {
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

        debugLog(this.config, `Sending query with requestId: ${requestId}`);

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

    /**
     * Checks if the client is currently connecting
     * @returns {boolean} True if connecting
     * @private
     */
    private isConnecting(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
    }

    /**
     * Checks if the client is currently connected
     * @returns {boolean} True if connected
     * @private
     */
    private isClientConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Checks if the client is currently attempting to reconnect
     * @returns {boolean} True if reconnecting
     * @private
     */
    private isReconnecting(): boolean {
        return this.reconnectTimer !== null;
    }

    /**
     * Gets detailed information about the current connection state
     * @returns {ClientCoreConnectionInfo} Current connection information
     */
    getConnectionInfo(): ClientCoreConnectionInfo {
        const now = Date.now();

        const connectionDuration = this.connectionStartTime
            ? now - this.connectionStartTime
            : undefined;

        const pendingRequests = Array.from(this.pendingRequests.entries()).map(
            ([requestId, request]) => {
                const elapsedMs = now - (request.timeout as unknown as number);
                return { requestId, elapsedMs };
            },
        );

        return {
            status: this.lastStatus,
            isConnected: this.isClientConnected(),
            isConnecting: this.isConnecting(),
            isReconnecting: this.isReconnecting(),
            connectionDuration,
            reconnectAttempts: this.reconnectCount,
            pendingRequests,
            agentId: this.agentId,
            sessionId: this.sessionId,
        };
    }

    /**
     * Disconnects from the server and cleans up resources
     * Cancels any pending requests and stops reconnection attempts
     */
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
        debugLog(this.config, "WebSocket disconnected");
    }

    /**
     * Handles incoming WebSocket messages
     * @param {MessageEvent} event - The WebSocket message event
     * @private
     */
    private handleMessage(event: MessageEvent): void {
        try {
            debugLog(
                this.config,
                "Received message:",
                `${event.data.toString().slice(0, 200)}...`,
            );

            const message = JSON.parse(
                event.data,
            ) as Communication.WebSocket.Message;

            // Handle session info message from server
            if (
                message.type ===
                Communication.WebSocket.MessageType.SESSION_INFO_RESPONSE
            ) {
                const sessionMsg =
                    message as Communication.WebSocket.SessionInfoMessage;
                this.agentId = sessionMsg.agentId;
                this.sessionId = sessionMsg.sessionId;
                this.emitEvent("statusChange");
                return;
            }

            debugLog(
                this.config,
                `Parsed message request ID: ${message.requestId}`,
            );

            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                debugLog(
                    this.config,
                    `Processing request with ID: ${message.requestId}`,
                );
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);
                request.resolve(message);
            }
        } catch (error) {
            debugError(this.config, "Error handling WebSocket message:", error);
        }
    }

    /**
     * Handles WebSocket close events
     * @param {CloseEvent} event - The WebSocket close event
     * @private
     */
    private handleClose(event: CloseEvent): void {
        debugLog(
            this.config,
            `WebSocket connection closed: ${event.reason || "No reason provided"}, code: ${event.code}`,
        );
        this.updateConnectionStatus("disconnected");
        this.attemptReconnect();
    }

    /**
     * Handles WebSocket error events
     * @param {Event} event - The WebSocket error event
     * @private
     */
    private handleError(event: Event): void {
        let errorMessage = "Unknown WebSocket error";

        // Try to extract more specific error info
        if (event instanceof ErrorEvent) {
            errorMessage = event.message;
        } else if (event instanceof CloseEvent) {
            errorMessage = event.reason || `Code: ${event.code}`;
        }

        this.updateConnectionStatus("disconnected");
        debugError(this.config, `WebSocket error: ${errorMessage}`);
    }

    /**
     * Attempts to reconnect to the server after a disconnection
     * Uses exponential backoff based on configuration settings
     * @private
     */
    private attemptReconnect(): void {
        if (this.reconnectTimer !== null) return;

        const maxAttempts = this.config.reconnectAttempts ?? 5;
        const delay = this.config.reconnectDelay ?? 5000;

        if (this.reconnectCount >= maxAttempts) {
            debugError(this.config, "Max reconnection attempts reached");
            return;
        }

        this.updateConnectionStatus("reconnecting");
        debugLog(
            this.config,
            `Attempting to reconnect (${this.reconnectCount + 1}/${maxAttempts}) in ${delay}ms`,
        );

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectCount++;

            try {
                await this.connect();
            } catch (error) {
                debugError(this.config, "Reconnection attempt failed:", error);
            }
        }, delay);
    }
}

/**
 * Main class that coordinates all components and manages communication with Vircadia servers.
 * Handles connection management, authentication, and provides utility methods.
 */
export class ClientCore {
    private coreConnectionManager: CoreConnectionManager;

    /**
     * Creates a new ClientCore instance
     * @param {ClientCoreConfig} config - Configuration options for the client
     */
    constructor(private config: ClientCoreConfig) {
        this.coreConnectionManager = new CoreConnectionManager(config);
    }

    /**
     * Provides access to utility methods for connection management
     * @returns {Object} Object containing connection utilities
     */
    get Utilities() {
        const cm = this.coreConnectionManager;

        return {
            Connection: {
                // Direct method bindings for 1:1 mappings
                connect: cm.connect.bind(cm),
                disconnect: cm.disconnect.bind(cm),
                addEventListener: cm.addEventListener.bind(cm),
                removeEventListener: cm.removeEventListener.bind(cm),
                query: cm.query.bind(cm),
                getConnectionInfo: cm.getConnectionInfo.bind(cm),
            },
        };
    }

    /**
     * Cleans up resources and disconnects from the server
     */
    dispose(): void {
        if (this.coreConnectionManager) {
            this.coreConnectionManager.disconnect();
        }
    }
}
