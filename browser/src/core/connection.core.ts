import { Communication } from "../../../schema/src/vircadia.schema.general";

export type WsConnectionCoreState =
    | "connected"
    | "connecting"
    | "disconnected";

export type WsConnectionCoreAuthStatus =
    | "valid"
    | "validating"
    | "expired"
    | "invalid";

export type WsConnectionCoreInfo = {
    status: WsConnectionCoreState;
    isConnected: boolean;
    isConnecting: boolean;
    connectionDuration?: number;
    pendingRequests: Array<{
        requestId: string;
        elapsedMs: number;
    }>;
    agentId: string | null;
    sessionId: string | null;
    instanceId: string | null;
    fullSessionId: string | null;
    sessionValidation?: {
        status: WsConnectionCoreAuthStatus;
        lastChecked: number;
        error?: string;
    };
    lastClose?: {
        code: number;
        reason: string;
    };
};

export type ClientCoreConnectionEventListener = () => void;

export interface WsConnectionCoreConfig {
    apiWsUri: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    debug?: boolean;
    suppress?: boolean;
}

const debugLog = (
    config: { debug?: boolean; suppress?: boolean },
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: Flexible debug args
    ...args: any[]
) => {
    if (config.debug && !config.suppress) {
        console.log(message, ...args);
    }
};

const debugError = (
    config: { suppress?: boolean },
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: Flexible debug args
    ...args: any[]
) => {
    if (!config.suppress) {
        console.error(message, ...args);
    }
};

export class WsConnectionCore {
    private ws: WebSocket | null = null;
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();
    private eventListeners = new Map<string, Set<ClientCoreConnectionEventListener>>();
    private lastStatus: WsConnectionCoreState = "disconnected";
    private connectionStartTime: number | null = null;
    private connectionPromise: Promise<WsConnectionCoreInfo> | null = null;
    private agentId: string | null = null;
    private sessionId: string | null = null;
    private sessionValidation: {
        status: WsConnectionCoreAuthStatus;
        lastChecked: number;
        error?: string;
    } | null = null;
    private wasSessionValid = false;
    private instanceId: string;
    private reflectListeners = new Map<
        string,
        Set<(msg: Communication.WebSocket.ReflectDeliveryMessage) => void>
    >();
    private lastCloseCode: number | null = null;
    private lastCloseReason: string | null = null;

    constructor(private config: WsConnectionCoreConfig) {
        this.instanceId = this.getOrCreateInstanceId();
    }

    updateConfig(newConfig: WsConnectionCoreConfig): void {
        this.config = newConfig;
    }

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
            const fallback = crypto.randomUUID().slice(0, 6).toLowerCase();
            return fallback;
        }
    }

    private updateConnectionStatus(status: WsConnectionCoreState): void {
        if (this.lastStatus !== status) {
            this.lastStatus = status;
            this.emitEvent("statusChange");
        }
    }

    addEventListener(event: string, listener: ClientCoreConnectionEventListener): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(listener);
    }

    removeEventListener(event: string, listener: ClientCoreConnectionEventListener): void {
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

    async connect(options?: {
        timeoutMs?: number;
        validateSession?: (data: { token: string; provider: string }) => Promise<
            | { success: true }
            | { success: false; error?: string }
        >;
    }): Promise<WsConnectionCoreInfo> {
        if (this.isClientConnected()) {
            return this.getConnectionInfo();
        }
        if (this.connectionPromise && this.isConnecting()) {
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                this.updateConnectionStatus("connecting");

                const url = new URL(this.config.apiWsUri);
                if (url.protocol === "http:") url.protocol = "ws:";
                else if (url.protocol === "https:") url.protocol = "wss:";
                url.searchParams.set("token", this.config.authToken);
                url.searchParams.set("provider", this.config.authProvider);

                debugLog(this.config, "Connecting to WebSocket server:", url.toString());

                this.ws = new WebSocket(url);
                this.ws.onmessage = this.handleMessage.bind(this);
                this.ws.onclose = this.handleClose.bind(this);
                this.ws.onerror = this.handleError.bind(this);

                const connectionTimeoutMs = options?.timeoutMs || 30000;

                await Promise.race([
                    new Promise<void>((resolve, reject) => {
                        if (!this.ws) return reject(new Error("WebSocket not initialized"));

                        const handleConnectionError = (event: CloseEvent) => {
                            let errorMessage = "Connection failed";
                            if (event.reason) errorMessage = event.reason;
                            this.updateConnectionStatus("disconnected");
                            reject(new Error(`WebSocket connection failed: ${errorMessage}`));
                        };

                        this.ws.onopen = () => {
                            if (this.ws) this.ws.onclose = this.handleClose.bind(this);
                            this.updateConnectionStatus("connected");
                            this.connectionStartTime = Date.now();
                            this.sessionValidation = null;
                            this.wasSessionValid = true;
                            debugLog(this.config, "WebSocket connection established");
                            resolve();
                        };

                        this.ws.onerror = () => {
                            this.updateConnectionStatus("disconnected");
                            reject(new Error("WebSocket error"));
                        };

                        this.ws.onclose = handleConnectionError;
                    }),
                    new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error("Connection timeout")), connectionTimeoutMs);
                    }),
                ]);

                return this.getConnectionInfo();
            } catch (error) {
                if (options?.validateSession) {
                    debugLog(this.config, "WS failed, validating session via REST");
                    try {
                        const resp = await options.validateSession({
                            token: this.config.authToken,
                            provider: this.config.authProvider,
                        });
                        const status: WsConnectionCoreAuthStatus = resp.success
                            ? "valid"
                            : this.wasSessionValid
                            ? "expired"
                            : "invalid";
                        this.sessionValidation = {
                            status,
                            lastChecked: Date.now(),
                            error: resp.success ? undefined : resp.error,
                        };
                    } catch (e) {
                        this.sessionValidation = {
                            status: this.wasSessionValid ? "expired" : "invalid",
                            lastChecked: Date.now(),
                            error: e instanceof Error ? e.message : "Unknown validation error",
                        };
                    }
                }

                if (error instanceof Error) {
                    if (this.sessionValidation) {
                        const status = this.sessionValidation.status;
                        if (status === "invalid" || status === "expired") {
                            const authError = status === "expired" ? "Session expired" : "Invalid session";
                            throw new Error(
                                `Authentication failed (${authError}): ${this.sessionValidation.error || error.message}`,
                            );
                        } else if (status === "valid") {
                            throw new Error(
                                `Connection failed (session valid): ${error.message}. This may be due to network issues or server downtime.`,
                            );
                        }
                    }
                }

                throw error;
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

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

        return new Promise<Communication.WebSocket.QueryResponseMessage<T>>((resolve, reject) => {
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
        });
    }

    getConnectionInfo(): WsConnectionCoreInfo {
        const now = Date.now();

        const connectionDuration = this.connectionStartTime ? now - this.connectionStartTime : undefined;

        const pendingRequests = Array.from(this.pendingRequests.entries()).map(([requestId, request]) => {
            const elapsedMs = now - (request.timeout as unknown as number);
            return { requestId, elapsedMs };
        });

        return {
            status: this.lastStatus,
            isConnected: this.isClientConnected(),
            isConnecting: this.isConnecting(),
            connectionDuration,
            pendingRequests,
            agentId: this.agentId,
            sessionId: this.sessionId,
            instanceId: this.instanceId,
            fullSessionId: this.sessionId && this.instanceId ? `${this.sessionId}-${this.instanceId}` : null,
            sessionValidation: this.sessionValidation || undefined,
            lastClose: this.lastCloseCode !== null ? { code: this.lastCloseCode, reason: this.lastCloseReason || "" } : undefined,
        };
    }

    disconnect(): void {
        for (const [requestId, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeout);
            request.reject(new Error("Connection closed"));
            this.pendingRequests.delete(requestId);
        }

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;

            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }

        this.updateConnectionStatus("disconnected");
        this.connectionStartTime = null;
        this.sessionValidation = null;
        this.wasSessionValid = false;
        this.config.sessionId = undefined;
        debugLog(this.config, "WebSocket disconnected");
    }

    publishReflect(data: {
        syncGroup: string;
        channel: string;
        payload: unknown;
        timeoutMs?: number;
    }): Promise<Communication.WebSocket.ReflectAckResponseMessage> {
        if (!this.isClientConnected()) {
            throw new Error("Not connected to server");
        }
        const requestId = crypto.randomUUID();
        const message = new Communication.WebSocket.ReflectPublishRequestMessage({
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
                resolve: (value) => resolve(value as Communication.WebSocket.ReflectAckResponseMessage),
                reject,
                timeout,
            });
            this.ws?.send(JSON.stringify(message));
        });
    }

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

    private handleMessage(event: MessageEvent): void {
        try {
            debugLog(this.config, "Received message:", `${event.data.toString().slice(0, 200)}...`);

            const message = JSON.parse(event.data) as Communication.WebSocket.Message;

            if (message.type === Communication.WebSocket.MessageType.SESSION_INFO_RESPONSE) {
                const sessionMsg = message as Communication.WebSocket.SessionInfoMessage;
                this.agentId = sessionMsg.agentId;
                this.sessionId = sessionMsg.sessionId;
                this.config.sessionId = sessionMsg.sessionId;
                this.emitEvent("statusChange");
                return;
            }

            debugLog(this.config, `Parsed message request ID: ${message.requestId}`);

            if (message.type === Communication.WebSocket.MessageType.REFLECT_MESSAGE_DELIVERY) {
                const m = message as Communication.WebSocket.ReflectDeliveryMessage;
                const key = `${m.syncGroup}:${m.channel}`;
                const listeners = this.reflectListeners.get(key);
                if (listeners) {
                    for (const listener of listeners) listener(m);
                }
                return;
            }

            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                debugLog(this.config, `Processing request with ID: ${message.requestId}`);
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);
                if (message.type === Communication.WebSocket.MessageType.GENERAL_ERROR_RESPONSE) {
                    const err = (message as Communication.WebSocket.GeneralErrorResponseMessage).errorMessage ||
                        "General error";
                    const error = new Error(`Server error (requestId=${message.requestId}): ${err}`);
                    request.reject(error);
                    return;
                }

                if (message.type === Communication.WebSocket.MessageType.QUERY_RESPONSE) {
                    const queryMsg = message as Communication.WebSocket.QueryResponseMessage;
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

    private handleClose(event: CloseEvent): void {
        debugLog(this.config, `WebSocket connection closed: ${event.reason || "No reason provided"}, code: ${event.code}`);
        this.lastCloseCode = event.code;
        this.lastCloseReason = event.reason || "";
        this.updateConnectionStatus("disconnected");
    }

    private handleError(event: Event): void {
        let errorMessage = "Unknown WebSocket error";
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

    private isConnecting(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
    }

    private isClientConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}


