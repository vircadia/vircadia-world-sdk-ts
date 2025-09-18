import { Communication } from "../../../schema/src/vircadia.schema.general";

/**
 * Represents the possible connection states for the client
 */
export type ClientCoreConnectionState =
    | "connected"
    | "connecting"
    | "disconnected";

/**
 * Represents the possible session validation states
 */
export type ClientCoreSessionStatus =
    | "valid"
    | "validating"
    | "expired"
    | "invalid";

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
    /** Duration of the current connection in milliseconds */
    connectionDuration?: number;
    /** List of pending requests with their IDs and elapsed time */
    pendingRequests: Array<{
        requestId: string;
        elapsedMs: number;
    }>;
    /** Identifier of the agent assigned by the server */
    agentId: string | null;
    /** Identifier of the session assigned by the server */
    sessionId: string | null;
    /** Identifier for this browser tab (stable for the life of the tab) */
    instanceId: string | null;
    /** Combined session-and-instance identifier (sessionId-instanceId) */
    fullSessionId: string | null;
    /** Session validation information from REST API checks */
    sessionValidation?: {
        /** Current session status */
        status: ClientCoreSessionStatus;
        /** Timestamp when the session was last checked */
        lastChecked: number;
        /** Error message from session validation, if any */
        error?: string;
    };
    /** Last WebSocket close info, if available */
    lastClose?: {
        code: number;
        reason: string;
    };
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
    /** Current session id if available (populated after WS handshake) */
    sessionId?: string;

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
 * Manages connection and message passing
 */
class CoreConnectionManager {
    private ws: WebSocket | null = null;
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
    // Session validation information
    private sessionValidation: {
        status: ClientCoreSessionStatus;
        lastChecked: number;
        error?: string;
    } | null = null;
    // Track if session was previously valid to distinguish expired vs invalid
    private wasSessionValid = false;
    // Stable per-tab instance identifier
    private instanceId: string;
    // Reflect subscriptions: key => listeners
    private reflectListeners = new Map<
        string,
        Set<(msg: Communication.WebSocket.ReflectDeliveryMessage) => void>
    >();
    private lastCloseCode: number | null = null;
    private lastCloseReason: string | null = null;

    /**
     * Creates a new CoreConnectionManager instance
     * @param {ClientCoreConfig} config - Configuration for the connection
     */
    constructor(private config: ClientCoreConfig) {
        this.instanceId = this.getOrCreateInstanceId();
    }

    /**
     * Returns a stable per-tab instance ID, creating and storing one in sessionStorage if needed
     */
    private getOrCreateInstanceId(): string {
        try {
            const key = "vircadia-instance-id";
            const existing = sessionStorage.getItem(key);
            if (existing && existing.length > 0) return existing;
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let value = "";
            for (let i = 0; i < 6; i++) {
                value += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            sessionStorage.setItem(key, value);
            return value;
        } catch {
            // Fallback if sessionStorage is unavailable
            const fallback = crypto.randomUUID().slice(0, 6).toLowerCase();
            return fallback;
        }
    }

    /**
     * Validates the current session via REST API
     * @param {CoreRestManager} restManager - REST manager instance to use for validation
     * @returns {Promise<void>} Promise that resolves when validation is complete
     * @private
     */
    private async validateSessionViaRest(
        restManager: CoreRestManager,
    ): Promise<void> {
        // Set status to validating
        this.sessionValidation = {
            status: "validating",
            lastChecked: Date.now(),
        };

        try {
            debugLog(this.config, "Validating session via REST API");

            const result = await restManager.validateSession({
                token: this.config.authToken,
                provider: this.config.authProvider,
            });

            const isValid = result.success === true;

            // Determine the appropriate status
            let status: ClientCoreSessionStatus;
            if (isValid) {
                status = "valid";
                this.wasSessionValid = true;
            } else {
                // If session was valid before but now invalid, it's expired
                // Otherwise it's just invalid
                status = this.wasSessionValid ? "expired" : "invalid";
            }

            this.sessionValidation = {
                status,
                lastChecked: Date.now(),
                error: result.success === false ? result.error : undefined,
            };

            debugLog(this.config, `Session validation result: ${status}`);
        } catch (error) {
            this.sessionValidation = {
                status: this.wasSessionValid ? "expired" : "invalid",
                lastChecked: Date.now(),
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown validation error",
            };
            debugError(this.config, "Session validation failed:", error);
        }
    }

    /**
     * Manually validates the current session via REST API
     * @param {CoreRestManager} restManager - REST manager instance to use for validation
     * @returns {Promise<ClientCoreConnectionInfo>} Promise that resolves with updated connection info
     */
    async validateSession(
        restManager: CoreRestManager,
    ): Promise<ClientCoreConnectionInfo> {
        await this.validateSessionViaRest(restManager);
        return this.getConnectionInfo();
    }

    /**
     * Updates the configuration of the connection manager.
     * @param {ClientCoreConfig} newConfig - The new configuration object.
     */
    updateConfig(newConfig: ClientCoreConfig): void {
        this.config = newConfig;
    }

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
     * @param {CoreRestManager} [options.restManager] - REST manager for session validation on failure
     * @returns {Promise<ClientCoreConnectionInfo>} - Promise resolving to connection information
     * @throws {Error} If connection or authentication fails
     */
    async connect(options?: {
        timeoutMs?: number;
        restManager?: CoreRestManager;
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
                // Ensure correct WebSocket protocol even if HTTP(S) base is provided
                if (url.protocol === "http:") {
                    url.protocol = "ws:";
                } else if (url.protocol === "https:") {
                    url.protocol = "wss:";
                }
                url.searchParams.set("token", this.config.authToken);
                url.searchParams.set("provider", this.config.authProvider);

                debugLog(
                    this.config,
                    "Connecting to WebSocket server:",
                    url.toString(),
                );

                // Additional debug logging
                console.log(
                    "[CoreConnectionManager] WebSocket connection details:",
                    {
                        originalUrl: this.config.serverUrl,
                        finalUrl: url.toString(),
                        protocol: url.protocol,
                        host: url.host,
                        pathname: url.pathname,
                        hasToken: !!this.config.authToken,
                        tokenLength: this.config.authToken?.length,
                        provider: this.config.authProvider,
                    },
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
                            // Clear any previous session validation on successful connection
                            this.sessionValidation = null;
                            // Mark session as valid since connection succeeded
                            this.wasSessionValid = true;
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

                return this.getConnectionInfo();
            } catch (error) {
                // Validate session via REST when WebSocket connection fails
                if (options?.restManager) {
                    debugLog(
                        this.config,
                        "WebSocket connection failed, checking session via REST",
                    );
                    await this.validateSessionViaRest(options.restManager);
                }

                // Re-throw with enhanced error info based on session validation
                if (error instanceof Error) {
                    // Check if we have session validation info to provide better error context
                    if (this.sessionValidation) {
                        const status = this.sessionValidation.status;
                        if (status === "invalid" || status === "expired") {
                            // Session is invalid/expired - this is an authentication issue
                            const authError =
                                status === "expired"
                                    ? "Session expired"
                                    : "Invalid session";
                            throw new Error(
                                `Authentication failed (${authError}): ${this.sessionValidation.error || error.message}`,
                            );
                        } else if (status === "valid") {
                            // Session is valid but WebSocket failed - this is likely a network/server issue
                            throw new Error(
                                `Connection failed (session valid): ${error.message}. This may be due to network issues or server downtime.`,
                            );
                        }
                        // If status is "validating", fall through to original logic
                    }

                    // Fallback to original logic if no session validation
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
            connectionDuration,
            pendingRequests,
            agentId: this.agentId,
            sessionId: this.sessionId,
            instanceId: this.instanceId,
            fullSessionId:
                this.sessionId && this.instanceId
                    ? `${this.sessionId}-${this.instanceId}`
                    : null,
            sessionValidation: this.sessionValidation || undefined,
            lastClose:
                this.lastCloseCode !== null
                    ? { code: this.lastCloseCode, reason: this.lastCloseReason || "" }
                    : undefined,
        };
    }

    /**
     * Disconnects from the server and cleans up resources
     * Cancels any pending requests
     */
    disconnect(): void {
        // Clear all pending requests with a disconnection error
        for (const [requestId, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeout);
            request.reject(new Error("Connection closed"));
            this.pendingRequests.delete(requestId);
        }

        // Close WebSocket if it exists
        if (this.ws) {
            // Remove event handlers first
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
        // Clear session validation on disconnect
        this.sessionValidation = null;
        // Reset session validity tracking
        this.wasSessionValid = false;
        // Clear session id from shared config on disconnect
        this.config.sessionId = undefined;
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
                this.config.sessionId = sessionMsg.sessionId;
                this.emitEvent("statusChange");
                return;
            }

            debugLog(
                this.config,
                `Parsed message request ID: ${message.requestId}`,
            );

            // Deliver reflector messages to subscribers immediately (no request/response semantics)
            if (
                message.type ===
                Communication.WebSocket.MessageType.REFLECT_MESSAGE_DELIVERY
            ) {
                const m =
                    message as Communication.WebSocket.ReflectDeliveryMessage;
                const key = `${m.syncGroup}:${m.channel}`;
                const listeners = this.reflectListeners.get(key);
                if (listeners) {
                    for (const listener of listeners) listener(m);
                }
                return;
            }

            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                debugLog(
                    this.config,
                    `Processing request with ID: ${message.requestId}`,
                );
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);
                // If the server indicates an error, reject with details
                if (
                    message.type ===
                    Communication.WebSocket.MessageType.GENERAL_ERROR_RESPONSE
                ) {
                    const err =
                        (
                            message as Communication.WebSocket.GeneralErrorResponseMessage
                        ).errorMessage || "General error";
                    const error = new Error(
                        `Server error (requestId=${message.requestId}): ${err}`,
                    );
                    request.reject(error);
                    return;
                }

                if (
                    message.type ===
                    Communication.WebSocket.MessageType.QUERY_RESPONSE
                ) {
                    const queryMsg =
                        message as Communication.WebSocket.QueryResponseMessage;
                    if (queryMsg.errorMessage) {
                        const error = new Error(
                            `Query failed (requestId=${message.requestId}): ${queryMsg.errorMessage}`,
                        );
                        request.reject(error);
                        return;
                    }
                }

                request.resolve(message);
            }
        } catch (error) {
            debugError(this.config, "Error handling WebSocket message:", error);
        }
    }

    // Publish a reflect message and await ack
    async publishReflect(data: {
        syncGroup: string;
        channel: string;
        payload: unknown;
        timeoutMs?: number;
    }): Promise<Communication.WebSocket.ReflectAckResponseMessage> {
        if (!this.isClientConnected()) {
            throw new Error("Not connected to server");
        }
        const requestId = crypto.randomUUID();
        const message =
            new Communication.WebSocket.ReflectPublishRequestMessage({
                syncGroup: data.syncGroup,
                channel: data.channel,
                payload: data.payload,
                requestId,
            });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error("Reflect publish timeout"));
            }, data.timeoutMs ?? 5000);
            this.pendingRequests.set(requestId, {
                resolve: (value) =>
                    resolve(
                        value as Communication.WebSocket.ReflectAckResponseMessage,
                    ),
                reject,
                timeout,
            });
            this.ws?.send(JSON.stringify(message));
        });
    }

    // Subscribe to reflect deliveries
    subscribeReflect(
        syncGroup: string,
        channel: string,
        listener: (msg: Communication.WebSocket.ReflectDeliveryMessage) => void,
    ): () => void {
        const key = `${syncGroup}:${channel}`;
        if (!this.reflectListeners.has(key)) {
            this.reflectListeners.set(key, new Set());
        }
        const set = this.reflectListeners.get(key);
        if (set) set.add(listener);
        else this.reflectListeners.set(key, new Set([listener]));
        return () => {
            this.reflectListeners.get(key)?.delete(listener);
        };
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
        this.lastCloseCode = event.code;
        this.lastCloseReason = event.reason || "";
        this.updateConnectionStatus("disconnected");
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
            this.lastCloseCode = event.code;
            this.lastCloseReason = event.reason || "";
        }

        this.updateConnectionStatus("disconnected");
        debugError(this.config, `WebSocket error: ${errorMessage}`);
    }
}

/**
 * Handles all REST API communication with the Vircadia server
 * Manages HTTP requests and responses according to the schema definitions
 */
class CoreRestManager {
    /**
     * Creates a new CoreRestManager instance
     * @param {ClientCoreConfig} config - Configuration for the REST client
     */
    constructor(private config: ClientCoreConfig) {}

    /**
     * Updates the configuration of the REST manager.
     * @param {ClientCoreConfig} newConfig - The new configuration object.
     */
    updateConfig(newConfig: ClientCoreConfig): void {
        this.config = newConfig;
    }

    /**
     * Makes a generic HTTP request to the server
     * @param {string} path - The API endpoint path
     * @param {string} method - HTTP method
     * @param {any} body - Request body (for POST requests)
     * @param {Record<string, string>} headers - Additional headers
     * @returns {Promise<any>} The response data
     * @private
     */
    private async makeRequest(
        path: string,
        method: string,
        // biome-ignore lint/suspicious/noExplicitAny: Flexible request body type
        body?: any,
        headers: Record<string, string> = {},
        // biome-ignore lint/suspicious/noExplicitAny: Flexible response type
    ): Promise<any> {
        const url = new URL(path, this.config.serverUrl);

        debugLog(this.config, `Making ${method} request to:`, url.toString(), {
            headers,
        });

        const requestOptions: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        if (body && (method === "POST" || method === "PUT")) {
            requestOptions.body =
                typeof body === "string" ? body : JSON.stringify(body);
        }

        try {
            const response = await fetch(url.toString(), requestOptions);

            debugLog(this.config, `Response status: ${response.status}`);

            // Parse response as JSON
            const responseData = await response.json();

            // For non-2xx responses, create error response using schema pattern
            if (!response.ok) {
                debugLog(this.config, `Request failed:`, {
                    url: url.toString(),
                    method,
                    status: response.status,
                    statusText: response.statusText,
                    response: responseData,
                });
                return {
                    success: false,
                    timestamp: Date.now(),
                    error:
                        responseData.error ||
                        `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            debugLog(this.config, `Request succeeded:`, {
                url: url.toString(),
                method,
                response: responseData,
            });
            return responseData;
        } catch (error) {
            debugError(this.config, "REST request failed:", error);
            return {
                success: false,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Fetches an asset by key using the authenticated asset endpoint.
     * Returns the raw Response to allow callers to stream/parse binary.
     */
    async assetGetByKey(params: { key: string }): Promise<Response> {
        const endpoint = Communication.REST.Endpoint.ASSET_GET_BY_KEY;
        // Default to current client auth if not explicitly provided
        const finalParams = {
            key: params.key,
            sessionId: this.config.sessionId,
            token: this.config.authToken,
            provider: this.config.authProvider,
        };
        const query = endpoint.createRequest(finalParams);
        const url = new URL(`${endpoint.path}${query}`, this.config.serverUrl);
        debugLog(this.config, "Fetching asset:", url.toString(), {
            hasToken: !!finalParams.token,
            hasProvider: !!finalParams.provider,
            hasSessionId: !!finalParams.sessionId,
            tokenLength: finalParams.token?.length,
            provider: finalParams.provider,
        });
        try {
            const resp = await fetch(url.toString(), {
                method: endpoint.method,
            });
            if (!resp.ok) {
                debugError(
                    this.config,
                    `Asset fetch failed: ${resp.status} ${resp.statusText} → ${url.toString()}`,
                );
            }
            return resp;
        } catch (err) {
            debugError(
                this.config,
                `Asset fetch threw before response: ${url.toString()}`,
                err,
            );
            throw err;
        }
    }

    /**
     * Validates a user session token from an authentication provider
     * @param {Object} data - Session validation data
     * @param {string} data.token - Authentication token to validate
     * @param {string} data.provider - Name of the authentication provider
     * @returns {Promise<any>} Response indicating whether the session is valid
     */
    async validateSession(data: {
        token: string;
        provider: string;
    }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_SESSION_VALIDATE;
        const requestBody = endpoint.createRequest(data);

        return this.makeRequest(endpoint.path, endpoint.method, requestBody);
    }

    /**
     * Logs in a user anonymously
     * @returns {Promise<any>} Returns a session token for the anonymous user
     */
    async loginAnonymous(): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_ANONYMOUS_LOGIN;
        const requestBody = endpoint.createRequest();

        return this.makeRequest(endpoint.path, endpoint.method, requestBody);
    }

    /**
     * Initiates OAuth authorization flow for a specified provider
     * @param {string} provider - The OAuth provider to use (e.g., 'azure')
     * @returns {Promise<any>} Response with redirect URL for OAuth authorization
     */
    async authorizeOAuth(provider: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_AUTHORIZE;
        const queryParams = endpoint.createRequest(provider);
        const fullPath = `${endpoint.path}${queryParams}`;

        return this.makeRequest(fullPath, endpoint.method);
    }

    /**
     * Handles OAuth callback from the authorization provider
     * @param {Object} params - OAuth callback parameters
     * @param {string} params.provider - The OAuth provider that sent the callback
     * @param {string} params.code - Authorization code from the OAuth provider
     * @param {string} [params.state] - State parameter for CSRF protection
     * @returns {Promise<any>} Response with authentication token and session information
     */
    async handleOAuthCallback(params: {
        provider: string;
        code: string;
        state?: string;
    }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_CALLBACK;
        const queryParams = endpoint.createRequest(params);
        const fullPath = `${endpoint.path}${queryParams}`;

        return this.makeRequest(fullPath, endpoint.method);
    }

    /**
     * Logs out the current session and invalidates the token
     * @param {string} sessionId - Session ID to invalidate
     * @returns {Promise<any>} Response indicating logout status
     */
    async logout(sessionId: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LOGOUT;
        const requestBody = endpoint.createRequest(sessionId);

        return this.makeRequest(endpoint.path, endpoint.method, requestBody);
    }

    /**
     * Initiates the process to link an additional authentication provider to an existing account
     * @param {Object} data - Provider linking data
     * @param {string} data.provider - The authentication provider to link (e.g., 'azure')
     * @param {string} data.sessionId - Current session ID to associate the new provider with
     * @returns {Promise<any>} Response with redirect URL to complete provider linking
     */
    async linkProvider(data: {
        provider: string;
        sessionId: string;
    }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LINK_PROVIDER;
        const requestBody = endpoint.createRequest(data);

        return this.makeRequest(endpoint.path, endpoint.method, requestBody);
    }

    /**
     * Unlinks an authentication provider from the current account
     * @param {Object} data - Provider unlinking data
     * @param {string} data.provider - The authentication provider to unlink
     * @param {string} data.providerUid - The provider-specific user ID to unlink
     * @param {string} data.sessionId - Current session ID for authentication
     * @returns {Promise<any>} Response indicating unlink status
     */
    async unlinkProvider(data: {
        provider: string;
        providerUid: string;
        sessionId: string;
    }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_UNLINK_PROVIDER;
        const requestBody = endpoint.createRequest(data);

        return this.makeRequest(endpoint.path, endpoint.method, requestBody);
    }

    /**
     * Lists all authentication providers linked to the current account
     * @param {string} sessionId - Current session ID for authentication
     * @returns {Promise<any>} Response with list of linked providers
     */
    async listProviders(sessionId: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LIST_PROVIDERS;
        const queryParams = endpoint.createRequest(sessionId);
        const fullPath = `${endpoint.path}${queryParams}`;

        return this.makeRequest(fullPath, endpoint.method);
    }
}

/**
 * Main class that coordinates all components and manages communication with Vircadia servers.
 * Handles connection management, authentication, and provides utility methods.
 */
export class ClientCore {
    private coreConnectionManager: CoreConnectionManager;
    private coreRestManager: CoreRestManager;

    /**
     * Creates a new ClientCore instance
     * @param {ClientCoreConfig} config - Configuration options for the client
     */
    constructor(private config: ClientCoreConfig) {
        this.coreConnectionManager = new CoreConnectionManager(config);
        this.coreRestManager = new CoreRestManager(config);
    }

    /**
     * Updates the server URL.
     * @param {string} url - The new server URL.
     */
    setServerUrl(url: string): void {
        this.config.serverUrl = url;
        this.coreConnectionManager.updateConfig(this.config);
        this.coreRestManager.updateConfig(this.config);
    }

    /**
     * Updates the authentication token.
     * @param {string} token - The new authentication token.
     */
    setAuthToken(token: string): void {
        this.config.authToken = token;
        this.coreConnectionManager.updateConfig(this.config);
        this.coreRestManager.updateConfig(this.config);
    }

    /**
     * Updates the authentication provider.
     * @param {string} provider - The new authentication provider.
     */
    setAuthProvider(provider: string): void {
        this.config.authProvider = provider;
        this.coreConnectionManager.updateConfig(this.config);
        this.coreRestManager.updateConfig(this.config);
    }

    /**
     * Enables or disables debug logging.
     * @param {boolean} isDebug - True to enable, false to disable.
     */
    setDebug(isDebug: boolean): void {
        this.config.debug = isDebug;
        this.coreConnectionManager.updateConfig(this.config);
        this.coreRestManager.updateConfig(this.config);
    }

    /**
     * Suppresses or unsuppresses console output.
     * @param {boolean} isSuppressed - True to suppress, false to unsuppress.
     */
    setSuppress(isSuppressed: boolean): void {
        this.config.suppress = isSuppressed;
        this.coreConnectionManager.updateConfig(this.config);
        this.coreRestManager.updateConfig(this.config);
    }

    /**
     * Provides access to utility methods for connection management and REST API calls
     * @returns {Object} Object containing connection and REST utilities
     */
    get Utilities() {
        const cm = this.coreConnectionManager;
        const rm = this.coreRestManager;

        return {
            Connection: {
                // Enhanced connect method that includes REST session validation
                connect: (options?: { timeoutMs?: number }) =>
                    cm.connect({ ...options, restManager: rm }),
                disconnect: cm.disconnect.bind(cm),
                addEventListener: cm.addEventListener.bind(cm),
                removeEventListener: cm.removeEventListener.bind(cm),
                query: cm.query.bind(cm),
                getConnectionInfo: cm.getConnectionInfo.bind(cm),
                // Manual session validation
                validateSession: () => cm.validateSession(rm),
                // Reflect API
                publishReflect: cm.publishReflect.bind(cm),
                subscribeReflect: cm.subscribeReflect.bind(cm),
            },
            REST: {
                // Authentication endpoints
                validateSession: rm.validateSession.bind(rm),
                loginAnonymous: rm.loginAnonymous.bind(rm),
                authorizeOAuth: rm.authorizeOAuth.bind(rm),
                handleOAuthCallback: rm.handleOAuthCallback.bind(rm),
                logout: rm.logout.bind(rm),
                linkProvider: rm.linkProvider.bind(rm),
                unlinkProvider: rm.unlinkProvider.bind(rm),
                listProviders: rm.listProviders.bind(rm),
                assetGetByKey: rm.assetGetByKey.bind(rm),
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
        // Note: REST manager doesn't need explicit cleanup as it's stateless
    }
}
