import type { z } from "zod";
import { Communication } from "../../../schema/src/vircadia.schema.general";

// TODO: Make errors clearer from here to UI on why a request failed, especially on asset gets which may bypass the browser core, so we need clear Zod schemas for all responses so we can process errors.
// TODO: Use browser storage sync here so this is the source of truth from now on to prevent auth complications.

// ---------------- Shared REST response types (Zod-inferred) ----------------
type RestErrorEnvelope = z.infer<typeof Communication.REST.Z.ErrorEnvelope>;

export type AuthSessionValidateResponse =
    | z.infer<typeof Communication.REST.Z.AuthSessionValidateSuccess>
    | RestErrorEnvelope;
export type AuthAnonymousLoginResponse =
    | z.infer<typeof Communication.REST.Z.AuthAnonymousLoginSuccess>
    | RestErrorEnvelope;
export type OAuthAuthorizeResponse =
    | z.infer<typeof Communication.REST.Z.OAuthAuthorizeSuccess>
    | RestErrorEnvelope;
export type OAuthCallbackResponse =
    | z.infer<typeof Communication.REST.Z.OAuthCallbackSuccess>
    | RestErrorEnvelope;
export type LogoutResponse =
    | z.infer<typeof Communication.REST.Z.LogoutSuccess>
    | RestErrorEnvelope;
export type LinkProviderResponse =
    | z.infer<typeof Communication.REST.Z.LinkProviderSuccess>
    | RestErrorEnvelope;
export type UnlinkProviderResponse =
    | z.infer<typeof Communication.REST.Z.UnlinkProviderSuccess>
    | RestErrorEnvelope;
export type ListProvidersResponse =
    | z.infer<typeof Communication.REST.Z.ListProvidersSuccess>
    | RestErrorEnvelope;
export type WsUpgradeValidateResponse = z.infer<
    typeof Communication.REST.Z.WsUpgradeValidateResponse
>;

export type WsConnectionCoreState = "connected" | "connecting" | "disconnected";

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
    // Expose auth config surface without leaking raw tokens
    authProvider: string;
    hasAuthToken: boolean;
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
        console.debug(message, ...args);
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
            createdAt: number;
        }
    >();
    private eventListeners = new Map<
        string,
        Set<ClientCoreConnectionEventListener>
    >();
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

    addEventListener(
        event: string,
        listener: ClientCoreConnectionEventListener,
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(listener);
    }

    removeEventListener(
        event: string,
        listener: ClientCoreConnectionEventListener,
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

    async connect(options?: {
        timeoutMs?: number;
    }): Promise<WsConnectionCoreInfo> {
        if (this.isClientConnected()) {
            debugLog(
                this.config,
                "Already connected to WebSocket server, returning connection info",
            );
            return this.getConnectionInfo();
        }
        if (this.connectionPromise && this.isConnecting()) {
            debugLog(
                this.config,
                "Already connecting to WebSocket server, returning connection promise",
            );
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                this.updateConnectionStatus("connecting");

                const url = new URL(
                    this.config.apiWsUri +
                        Communication.REST.Endpoint.WS_UPGRADE_REQUEST.path,
                );
                if (url.protocol === "http:") url.protocol = "ws:";
                else if (url.protocol === "https:") url.protocol = "wss:";
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

                const connectionTimeoutMs = options?.timeoutMs || 30000;

                await Promise.race([
                    new Promise<void>((resolve, reject) => {
                        if (!this.ws)
                            return reject(
                                new Error("WebSocket not initialized"),
                            );

                        const handleConnectionError = (event: CloseEvent) => {
                            let errorMessage = "Connection failed";
                            if (event.reason) errorMessage = event.reason;
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
                            this.sessionValidation = null;
                            debugLog(
                                this.config,
                                "WebSocket connection established",
                            );
                            resolve();
                        };

                        this.ws.onerror = () => {
                            this.updateConnectionStatus("disconnected");
                            reject(new Error("WebSocket error"));
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
        const messageData = {
            type: Communication.WebSocket.MessageType.QUERY_REQUEST,
            timestamp: Date.now(),
            requestId,
            errorMessage: null,
            query: data.query,
            parameters: data.parameters,
        };

        // Validate message structure with Zod
        const parsed =
            Communication.WebSocket.Z.QueryRequest.safeParse(messageData);
        if (!parsed.success) {
            throw new Error(`Invalid query request: ${parsed.error.message}`);
        }

        debugLog(this.config, `Sending query with requestId: ${requestId}`);

        return new Promise<Communication.WebSocket.QueryResponseMessage<T>>(
            (resolve, reject) => {
                const createdAt = Date.now();
                const timeout = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Request timeout"));
                }, data.timeoutMs ?? 10000);

                this.pendingRequests.set(requestId, {
                    resolve: resolve as (value: unknown) => void,
                    reject,
                    timeout,
                    createdAt,
                });
                this.ws?.send(JSON.stringify(parsed.data));
            },
        );
    }

    getConnectionInfo(): WsConnectionCoreInfo {
        const now = Date.now();

        const connectionDuration = this.connectionStartTime
            ? now - this.connectionStartTime
            : undefined;

        const pendingRequests = Array.from(this.pendingRequests.entries()).map(
            ([requestId, request]) => {
                const elapsedMs = now - request.createdAt;
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
            authProvider: this.config.authProvider,
            hasAuthToken: !!this.config.authToken,
            sessionValidation: this.sessionValidation || undefined,
            lastClose:
                this.lastCloseCode !== null
                    ? {
                          code: this.lastCloseCode,
                          reason: this.lastCloseReason || "",
                      }
                    : undefined,
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
        this.sessionValidation = null;
        this.config.sessionId = undefined;
        debugLog(this.config, "WebSocket disconnected");
    }

    async publishReflect(data: {
        syncGroup: string;
        channel: string;
        payload: unknown;
        timeoutMs?: number;
    }): Promise<Communication.WebSocket.ReflectAckResponseMessage | null> {
        if (!this.isClientConnected()) {
            throw new Error("Not connected to server");
        }
        const requestId = crypto.randomUUID();
        const messageData = {
            type: Communication.WebSocket.MessageType.REFLECT_PUBLISH_REQUEST,
            timestamp: Date.now(),
            requestId,
            errorMessage: null,
            syncGroup: data.syncGroup,
            channel: data.channel,
            payload: data.payload,
        };

        const parsed =
            Communication.WebSocket.Z.ReflectPublishRequest.safeParse(
                messageData,
            );
        if (!parsed.success) {
            throw new Error(
                `Invalid reflect publish request: ${parsed.error.message}`,
            );
        }

        // Send and register a pending entry to optionally receive ACK errors.
        // Timeout resolves silently; only explicit error ACKs will reject.
        return new Promise<Communication.WebSocket.ReflectAckResponseMessage | null>(
            (resolve, reject) => {
                const createdAt = Date.now();
                const timeout = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    // Silent resolve on timeout (server sends ACK only on error)
                    resolve(null);
                }, data.timeoutMs ?? 5000);

                this.pendingRequests.set(requestId, {
                    resolve: (value: unknown) =>
                        resolve(
                            value as Communication.WebSocket.ReflectAckResponseMessage | null,
                        ),
                    reject,
                    timeout,
                    createdAt,
                });

                this.ws?.send(JSON.stringify(parsed.data));
            },
        );
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
            debugLog(
                this.config,
                "Received message:",
                `${event.data.toString().slice(0, 200)}...`,
            );

            const maybe = JSON.parse(event.data) as unknown;
            const parsed =
                Communication.WebSocket.Z.AnyMessage.safeParse(maybe);
            if (!parsed.success) {
                debugError(
                    this.config,
                    "Invalid WS message envelope",
                    parsed.error,
                );
                return;
            }
            const message = parsed.data;

            if (
                message.type ===
                Communication.WebSocket.MessageType.SESSION_INFO_RESPONSE
            ) {
                this.agentId = message.agentId;
                this.sessionId = message.sessionId;
                this.config.sessionId = message.sessionId;
                this.emitEvent("statusChange");
                return;
            }

            debugLog(
                this.config,
                `Parsed message request ID: ${message.requestId}`,
            );

            if (
                message.type ===
                Communication.WebSocket.MessageType.REFLECT_MESSAGE_DELIVERY
            ) {
                const key = `${message.syncGroup}:${message.channel}`;
                const listeners = this.reflectListeners.get(key);
                if (listeners) {
                    for (const listener of listeners) listener(message);
                }
                return;
            }

            // Handle unsolicited reflect ACK errors (server may send only on errors)
            if (
                message.type ===
                Communication.WebSocket.MessageType.REFLECT_ACK_RESPONSE
            ) {
                const pending = this.pendingRequests.get(message.requestId);
                if (!pending && message.errorMessage) {
                    // Only log unsolicited errors if no pending entry exists
                    debugError(
                        this.config,
                        `Reflect ACK error (unsolicited, requestId=${message.requestId}): ${message.errorMessage}`,
                    );
                }
                // Do not return; allow pendingRequests match to handle resolve/reject
            }

            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                debugLog(
                    this.config,
                    `Processing request with ID: ${message.requestId}`,
                );
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);

                if (
                    message.type ===
                    Communication.WebSocket.MessageType.GENERAL_ERROR_RESPONSE
                ) {
                    const err = message.errorMessage || "General error";
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
                    if (message.errorMessage) {
                        const error = new Error(
                            `Query failed (requestId=${message.requestId}): ${message.errorMessage}`,
                        );
                        request.reject(error);
                        return;
                    }
                }

                // Handle reflect ACKs for publishReflect pending entries
                if (
                    message.type ===
                    Communication.WebSocket.MessageType.REFLECT_ACK_RESPONSE
                ) {
                    if (message.errorMessage) {
                        const error = new Error(
                            `Reflect publish failed (requestId=${message.requestId}): ${message.errorMessage}`,
                        );
                        request.reject(error);
                        return;
                    }
                    // Success ACK (if ever sent) resolves
                }

                // Message is already validated by AnyMessage discriminated union,
                // so no additional validation needed for specific response types
                request.resolve(message);
            }
        } catch (error) {
            debugError(this.config, "Error handling WebSocket message:", error);
        }
    }

    private handleClose(event: CloseEvent): void {
        debugLog(
            this.config,
            `WebSocket connection closed: ${event.reason || "No reason provided"}, code: ${event.code}`,
        );
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

export interface RestAssetCoreConfig {
    apiRestAssetUri: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    debug?: boolean;
    suppress?: boolean;
}

export class RestAssetCore {
    constructor(private config: RestAssetCoreConfig) {}

    updateConfig(newConfig: RestAssetCoreConfig): void {
        this.config = newConfig;
    }

    buildAssetGetByKeyUrl(params: { key: string }): string {
        const endpoint = Communication.REST.Endpoint.ASSET_GET_BY_KEY;
        const finalParams = {
            key: params.key,
            sessionId: this.config.sessionId,
            token: this.config.authToken,
            provider: this.config.authProvider,
        };
        const valid =
            Communication.REST.Z.AssetGetByKeyQuery.safeParse(finalParams);
        if (!valid.success) {
            throw new Error("Invalid asset request parameters");
        }
        const query = endpoint.createRequest(finalParams);
        const url = new URL(
            `${endpoint.path}${query}`,
            this.config.apiRestAssetUri,
        );
        return url.toString();
    }

    async assetGetByKey(params: { key: string }): Promise<Response> {
        const endpoint = Communication.REST.Endpoint.ASSET_GET_BY_KEY;
        const finalParams = {
            key: params.key,
            sessionId: this.config.sessionId,
            token: this.config.authToken,
            provider: this.config.authProvider,
        };
        const query = endpoint.createRequest(finalParams);
        const url = new URL(
            `${endpoint.path}${query}`,
            this.config.apiRestAssetUri,
        );
        debugLog(this.config, "Fetching asset:", url.toString(), {
            hasToken: !!finalParams.token,
            hasProvider: !!finalParams.provider,
            hasSessionId: !!finalParams.sessionId,
            tokenLength: (finalParams.token as string | undefined)?.length,
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
}

export interface RestAuthCoreConfig {
    apiRestAuthUri: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    debug?: boolean;
    suppress?: boolean;
}

export class RestAuthCore {
    constructor(private config: RestAuthCoreConfig) {}

    updateConfig(newConfig: RestAuthCoreConfig): void {
        this.config = newConfig;
    }

    private async makeRequest<TSuccess = unknown>(
        url: string,
        method: string,
        // biome-ignore lint/suspicious/noExplicitAny: Flexible body
        body?: any,
        headers: Record<string, string> = {},
        responseSchema?: z.ZodType<TSuccess>,
    ): Promise<TSuccess | RestErrorEnvelope> {
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
            const responseData = await response.json();
            if (!response.ok) {
                debugLog(this.config, `Request failed:`, {
                    url: url.toString(),
                    method,
                    status: response.status,
                    statusText: response.statusText,
                    response: responseData,
                });
                const message =
                    (responseData && (responseData.message as string)) ||
                    (responseData && (responseData.error as string)) ||
                    `HTTP ${response.status}: ${response.statusText}`;
                const errorCode =
                    (responseData && (responseData.errorCode as string)) ||
                    "SERVER_ERROR";
                return {
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                };
            }
            if (responseSchema) {
                const parsed = responseSchema.safeParse(responseData);
                if (!parsed.success) {
                    debugError(
                        this.config,
                        "Response schema validation failed",
                        parsed.error,
                    );
                    return {
                        success: false,
                        timestamp: Date.now(),
                        errorCode: "INVALID_REQUEST",
                        message: "Invalid response format",
                    };
                }
                debugLog(this.config, `Request succeeded:`, {
                    url: url.toString(),
                    method,
                    response: parsed.data,
                });
                return parsed.data;
            }
            debugLog(this.config, `Request succeeded:`, {
                url: url.toString(),
                method,
                response: responseData,
            });
            return responseData as TSuccess;
        } catch (error) {
            debugError(this.config, "REST request failed:", error);
            return {
                success: false,
                timestamp: Date.now(),
                errorCode: "UNKNOWN_ERROR",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async validateSession(data: {
        token: string;
        provider: string;
    }): Promise<AuthSessionValidateResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_SESSION_VALIDATE;
        const parsed =
            Communication.REST.Z.AuthSessionValidateRequest.safeParse(data);
        if (!parsed.success) {
            return {
                success: false,
                timestamp: Date.now(),
                errorCode: "INVALID_REQUEST",
                message: "Invalid request",
            };
        }
        const requestBody = endpoint.createRequest(parsed.data);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            requestBody,
            {},
            Communication.REST.Z.AuthSessionValidateSuccess,
        );
    }

    async loginAnonymous(): Promise<AuthAnonymousLoginResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_ANONYMOUS_LOGIN;
        const requestBody = endpoint.createRequest();
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            requestBody,
            {},
            Communication.REST.Z.AuthAnonymousLoginSuccess,
        );
    }

    async authorizeOAuth(provider: string): Promise<OAuthAuthorizeResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_AUTHORIZE;
        // Try to include the current website origin as redirectUri so the server can validate and use it
        let redirectUri: string | undefined;
        try {
            redirectUri = window.location.origin;
        } catch {}
        const qp = Communication.REST.Z.OAuthAuthorizeQuery.parse({
            provider,
            redirectUri,
        });
        const queryParams = endpoint.createRequest(qp.provider, qp.redirectUri);
        const url = new URL(
            `${endpoint.path}${queryParams}`,
            this.config.apiRestAuthUri,
        );
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            undefined,
            {},
            Communication.REST.Z.OAuthAuthorizeSuccess,
        );
    }

    async handleOAuthCallback(params: {
        provider: string;
        code: string;
        state?: string;
    }): Promise<OAuthCallbackResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_CALLBACK;
        const qp = Communication.REST.Z.OAuthCallbackQuery.parse(params);
        const queryParams = endpoint.createRequest(qp);
        const url = new URL(
            `${endpoint.path}${queryParams}`,
            this.config.apiRestAuthUri,
        );
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            undefined,
            {},
            Communication.REST.Z.OAuthCallbackSuccess,
        );
    }

    async logout(sessionId: string): Promise<LogoutResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_LOGOUT;
        const requestBody = endpoint.createRequest(
            Communication.REST.Z.LogoutRequest.parse({ sessionId }).sessionId,
        );
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            requestBody,
            {},
            Communication.REST.Z.LogoutSuccess,
        );
    }

    async linkProvider(data: {
        provider: string;
        sessionId: string;
    }): Promise<LinkProviderResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_LINK_PROVIDER;
        const v = Communication.REST.Z.LinkProviderRequest.parse(data);
        const requestBody = endpoint.createRequest(v);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            requestBody,
            {},
            Communication.REST.Z.LinkProviderSuccess,
        );
    }

    async unlinkProvider(data: {
        provider: string;
        providerUid: string;
        sessionId: string;
    }): Promise<UnlinkProviderResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_UNLINK_PROVIDER;
        const v = Communication.REST.Z.UnlinkProviderRequest.parse(data);
        const requestBody = endpoint.createRequest(v);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            requestBody,
            {},
            Communication.REST.Z.UnlinkProviderSuccess,
        );
    }

    async listProviders(sessionId: string): Promise<ListProvidersResponse> {
        const endpoint = Communication.REST.Endpoint.AUTH_LIST_PROVIDERS;
        const qp = Communication.REST.Z.ListProvidersQuery.parse({ sessionId });
        const queryParams = endpoint.createRequest(qp.sessionId);
        const url = new URL(
            `${endpoint.path}${queryParams}`,
            this.config.apiRestAuthUri,
        );
        return this.makeRequest(
            url.toString(),
            endpoint.method,
            undefined,
            {},
            Communication.REST.Z.ListProvidersSuccess,
        );
    }
}

// ======================= Unified Browser Client =======================

export interface VircadiaBrowserClientConfig {
    apiWsUri: string;
    apiRestAuthUri: string;
    apiRestAssetUri: string;
    // REST base for WS manager (HTTP) used for diagnostics
    apiRestWsUri?: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    storageKey?: string;
    debug?: boolean;
    suppress?: boolean;
}

export class VircadiaBrowserClient {
    private sharedConfig: VircadiaBrowserClientConfig;
    private wsCore: WsConnectionCore;
    private restAuthCore: RestAuthCore;
    private restAssetCore: RestAssetCore;
    private authListeners = new Set<() => void>();
    private lastPersisted = {
        tokenPresent: false,
        provider: "",
        sessionId: undefined as string | undefined,
        agentId: undefined as string | undefined,
    };
    private restWs: {
        validateUpgrade: (params: {
            token?: string;
            provider?: string;
        }) => Promise<WsUpgradeValidateResponse>;
    };
    public readonly connection: {
        connect: (options?: {
            timeoutMs?: number;
        }) => Promise<WsConnectionCoreInfo>;
        disconnect: () => void;
        addEventListener: (
            event: string,
            listener: ClientCoreConnectionEventListener,
        ) => void;
        removeEventListener: (
            event: string,
            listener: ClientCoreConnectionEventListener,
        ) => void;
        query: <T = unknown>(data: {
            query: string;
            parameters?: unknown[];
            timeoutMs?: number;
        }) => Promise<Communication.WebSocket.QueryResponseMessage<T>>;
        publishReflect: (data: {
            syncGroup: string;
            channel: string;
            payload: unknown;
            timeoutMs?: number;
        }) => Promise<Communication.WebSocket.ReflectAckResponseMessage | null>;
        subscribeReflect: (
            syncGroup: string,
            channel: string,
            listener: (
                msg: Communication.WebSocket.ReflectDeliveryMessage,
            ) => void,
        ) => () => void;
        getConnectionInfo: () => WsConnectionCoreInfo;
    };
    public readonly restAuth: {
        validateSession: (data: {
            token: string;
            provider: string;
        }) => Promise<AuthSessionValidateResponse>;
        loginAnonymous: () => Promise<AuthAnonymousLoginResponse>;
        authorizeOAuth: (provider: string) => Promise<OAuthAuthorizeResponse>;
        handleOAuthCallback: (params: {
            provider: string;
            code: string;
            state?: string;
        }) => Promise<OAuthCallbackResponse>;
        logout: () => Promise<LogoutResponse>;
        linkProvider: (data: {
            provider: string;
            sessionId: string;
        }) => Promise<LinkProviderResponse>;
        unlinkProvider: (data: {
            provider: string;
            providerUid: string;
            sessionId: string;
        }) => Promise<UnlinkProviderResponse>;
        listProviders: (sessionId: string) => Promise<ListProvidersResponse>;
    };
    public readonly restAsset: {
        assetGetByKey: (params: { key: string }) => Promise<Response>;
    };

    constructor(config: VircadiaBrowserClientConfig) {
        this.sharedConfig = config;
        this.loadPersistedAuth();
        // Pass the SAME object reference so sessionId updates propagate across cores
        this.wsCore = new WsConnectionCore(this.sharedConfig);
        this.restAuthCore = new RestAuthCore(this.sharedConfig);
        this.restAssetCore = new RestAssetCore(this.sharedConfig);

        // Namespaced helpers that use shared variables directly
        this.connection = {
            connect: (options) => this.connect(options),
            disconnect: () => this.disconnect(),
            addEventListener: (event, listener) =>
                this.wsCore.addEventListener(event, listener),
            removeEventListener: (event, listener) =>
                this.wsCore.removeEventListener(event, listener),
            query: (data) => this.wsCore.query(data),
            publishReflect: (data) => this.wsCore.publishReflect(data),
            subscribeReflect: (syncGroup, channel, listener) =>
                this.wsCore.subscribeReflect(syncGroup, channel, listener),
            getConnectionInfo: () => this.wsCore.getConnectionInfo(),
        };

        this.restAuth = {
            validateSession: (data) => this.restAuthCore.validateSession(data),
            loginAnonymous: () => this.loginAnonymous(),
            authorizeOAuth: (provider) =>
                this.restAuthCore.authorizeOAuth(provider),
            handleOAuthCallback: (params) => this.handleOAuthCallback(params),
            logout: () => this.logout(),
            linkProvider: (data) => this.restAuthCore.linkProvider(data),
            unlinkProvider: (data) => this.restAuthCore.unlinkProvider(data),
            listProviders: (sessionId) =>
                this.restAuthCore.listProviders(sessionId),
        };

        this.restAsset = {
            assetGetByKey: (params) => this.restAssetCore.assetGetByKey(params),
        };

        // Minimal WS REST helper for diagnostics only
        this.restWs = {
            validateUpgrade: async (params) => {
                try {
                    const ep = Communication.REST.Endpoint.WS_UPGRADE_VALIDATE;
                    const base =
                        this.sharedConfig.apiRestWsUri ||
                        this.sharedConfig.apiWsUri;
                    const baseUrl = new URL(base);
                    // ensure HTTP(S) scheme for REST
                    if (baseUrl.protocol === "ws:") baseUrl.protocol = "http:";
                    if (baseUrl.protocol === "wss:")
                        baseUrl.protocol = "https:";
                    const qp =
                        Communication.REST.Z.WsUpgradeValidateQuery.parse({
                            token: params.token,
                            provider: params.provider,
                        });
                    const url = new URL(
                        `${ep.path}${ep.createRequest(qp)}`,
                        baseUrl,
                    );
                    const resp = await fetch(url.toString(), {
                        method: ep.method,
                    });
                    const json = await resp.json().catch(() => ({
                        success: false,
                        errorCode: "UNKNOWN_ERROR",
                        message: `HTTP ${resp.status}`,
                    }));
                    const parsed =
                        Communication.REST.Z.WsUpgradeValidateResponse.safeParse(
                            json,
                        );
                    if (!parsed.success)
                        return {
                            success: false,
                            errorCode: "INVALID_REQUEST",
                            message: "Invalid response",
                            timestamp: Date.now(),
                        } as RestErrorEnvelope;
                    return parsed.data;
                } catch (e) {
                    return {
                        success: false,
                        errorCode: "UNKNOWN_ERROR",
                        message: e instanceof Error ? e.message : String(e),
                        timestamp: Date.now(),
                    } as RestErrorEnvelope;
                }
            },
        };

        this.wsCore.addEventListener("statusChange", () => {
            const info = this.wsCore.getConnectionInfo();
            if (info.sessionId !== this.lastPersisted.sessionId) {
                this.sharedConfig.sessionId = info.sessionId || undefined;
                this.persistAuth();
                this.emitAuthChange();
            }
            if (info.agentId && info.agentId !== this.lastPersisted.agentId) {
                this.persistAgentId(info.agentId);
                this.emitAuthChange();
            }
        });
    }

    // ---------------- Configuration setters ----------------
    setApiWsUri(url: string): void {
        this.sharedConfig.apiWsUri = url;
    }

    setApiRestAuthUri(url: string): void {
        this.sharedConfig.apiRestAuthUri = url;
    }

    setApiRestAssetUri(url: string): void {
        this.sharedConfig.apiRestAssetUri = url;
    }

    setAuthToken(token: string): void {
        this.sharedConfig.authToken = token;
        this.persistAuth();
        this.emitAuthChange();
    }

    setAuthProvider(provider: string): void {
        this.sharedConfig.authProvider = provider;
        this.persistAuth();
        this.emitAuthChange();
    }

    setDebug(isDebug: boolean): void {
        this.sharedConfig.debug = isDebug;
    }

    setSuppress(isSuppressed: boolean): void {
        this.sharedConfig.suppress = isSuppressed;
    }

    setSessionId(sessionId: string | undefined): void {
        this.sharedConfig.sessionId = sessionId;
        this.persistAuth();
        this.emitAuthChange();
    }

    getSessionId(): string | undefined {
        return this.sharedConfig.sessionId;
    }

    // ---------------- High-level flows ----------------
    async connect(options?: {
        timeoutMs?: number;
    }): Promise<WsConnectionCoreInfo> {
        try {
            return await this.wsCore.connect({ timeoutMs: options?.timeoutMs });
        } catch (err) {
            // On connect failure, run diagnostics in order: session validation then upgrade check
            let sessionIsValid: boolean | undefined;
            let sessionError: string | undefined;
            try {
                const sessionResp = await this.restAuthCore.validateSession({
                    token: this.sharedConfig.authToken,
                    provider: this.sharedConfig.authProvider,
                });
                sessionIsValid = !!(sessionResp as { success?: boolean })
                    ?.success;
                if (!sessionIsValid) {
                    sessionError =
                        ("message" in (sessionResp as object)
                            ? (sessionResp as { message?: string }).message
                            : undefined) ||
                        ("error" in (sessionResp as object)
                            ? (sessionResp as { error?: string }).error
                            : undefined);
                }
            } catch (e) {
                sessionIsValid = false;
                sessionError = e instanceof Error ? e.message : String(e);
            }

            let upgradeDiagnostics:
                | {
                      success?: boolean;
                      errorCode?: string;
                      message?: string;
                      timestamp?: number;
                      ok?: boolean;
                      reason?: string;
                      details?: Record<string, unknown>;
                  }
                | undefined;
            try {
                upgradeDiagnostics = await this.restWs.validateUpgrade({
                    token: this.sharedConfig.authToken,
                    provider: this.sharedConfig.authProvider,
                });
            } catch (e) {
                upgradeDiagnostics = {
                    success: false,
                    errorCode: "UNKNOWN_ERROR",
                    message: e instanceof Error ? e.message : String(e),
                };
            }

            if (sessionIsValid === false) {
                const reason = sessionError ? `: ${sessionError}` : "";
                throw new Error(`Authentication failed${reason}`);
            }

            if (sessionIsValid === true) {
                if (upgradeDiagnostics && !upgradeDiagnostics.success) {
                    const errorMsg =
                        upgradeDiagnostics.message || "Unknown upgrade error";
                    throw new Error(
                        `Connection failed (session valid). Upgrade diagnostic error: ${errorMsg}`,
                    );
                }
            }

            const baseMsg = err instanceof Error ? err.message : String(err);
            const upgradeMsg = upgradeDiagnostics?.message
                ? ` Upgrade check error: ${upgradeDiagnostics.message}`
                : "";
            throw new Error(`Connection failed: ${baseMsg}.${upgradeMsg}`);
        }
    }

    disconnect(): void {
        this.wsCore.disconnect();
        // Clear sessionId in shared config to avoid stale state for REST
        this.sharedConfig.sessionId = undefined;
        this.persistAuth();
        this.emitAuthChange();
    }

    // Auth convenience methods that also update shared token/provider/sessionId
    async loginAnonymous(): Promise<AuthAnonymousLoginResponse> {
        const resp = await this.restAuthCore.loginAnonymous();
        if (resp?.success && (resp as { data?: unknown })?.data) {
            if (typeof resp.data.token === "string")
                this.sharedConfig.authToken = resp.data.token;
            // Anonymous provider constant from schema (fallback to "anon")
            this.sharedConfig.authProvider =
                this.sharedConfig.authProvider || "anon";
            if (typeof resp.data.sessionId === "string")
                this.sharedConfig.sessionId = resp.data.sessionId;
            this.persistAuth();
            this.emitAuthChange();
        }
        return resp;
    }

    async authorizeOAuth(provider: string): Promise<OAuthAuthorizeResponse> {
        // This just triggers a redirect URL; no state to update yet
        return this.restAuthCore.authorizeOAuth(provider);
    }

    async handleOAuthCallback(params: {
        provider: string;
        code: string;
        state?: string;
    }): Promise<OAuthCallbackResponse> {
        const resp = await this.restAuthCore.handleOAuthCallback(params);
        if (resp?.success) {
            if (typeof resp.token === "string")
                this.sharedConfig.authToken = resp.token;
            if (typeof resp.provider === "string")
                this.sharedConfig.authProvider = resp.provider;
            if (typeof resp.sessionId === "string")
                this.sharedConfig.sessionId = resp.sessionId;
            this.persistAuth();
            this.emitAuthChange();
        }
        return resp;
    }

    async logout(): Promise<LogoutResponse> {
        const sessionId = this.sharedConfig.sessionId;
        let resp: LogoutResponse;
        try {
            resp = await this.restAuthCore.logout(sessionId || "");
        } catch (e) {
            resp = {
                success: false,
                errorCode: "UNKNOWN_ERROR",
                message: e instanceof Error ? e.message : String(e),
                timestamp: Date.now(),
            };
        }
        // Always clear local session regardless of server response to ensure client-side logout
        this.sharedConfig.sessionId = undefined;
        this.sharedConfig.authToken = "";
        this.sharedConfig.authProvider = "anon";
        this.wsCore.disconnect();
        this.clearPersistedAuth();
        this.emitAuthChange();
        return resp && typeof resp === "object"
            ? resp
            : { success: true, timestamp: Date.now() };
    }

    // Note: Legacy Utilities getter removed in favor of top-level namespaces.

    // ---------------- Asset URL helpers (for Babylon.js) ----------------

    buildAssetRequestUrl(key: string): string {
        return this.restAssetCore.buildAssetGetByKeyUrl({ key });
    }

    // ---------------- Browser storage helpers ----------------
    private getStorageKeys() {
        const base = this.sharedConfig.storageKey?.trim();
        if (!base) return null;
        const prefix = `vircadia:${base}`;
        return {
            token: `${prefix}:token`,
            provider: `${prefix}:provider`,
            sessionId: `${prefix}:sessionId`,
            agentId: `${prefix}:agentId`,
        } as const;
    }

    private loadPersistedAuth(): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const ls = window.localStorage;
            const token = ls.getItem(keys.token) || "";
            const provider =
                ls.getItem(keys.provider) ||
                this.sharedConfig.authProvider ||
                "anon";
            const sessionId = ls.getItem(keys.sessionId) || undefined;
            const agentId = ls.getItem(keys.agentId) || undefined;

            if (token && token.length > 0) this.sharedConfig.authToken = token;
            if (provider) this.sharedConfig.authProvider = provider;
            if (sessionId) this.sharedConfig.sessionId = sessionId;
            this.lastPersisted.agentId = agentId;
            this.lastPersisted.sessionId = sessionId;
            this.lastPersisted.provider = provider;
            this.lastPersisted.tokenPresent = !!token;
        } catch {
            // ignore storage errors
        }
    }

    private persistAuth(): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const ls = window.localStorage;
            const tokenPresent =
                !!this.sharedConfig.authToken &&
                this.sharedConfig.authToken.length > 0;
            const provider = this.sharedConfig.authProvider || "anon";
            const sessionId = this.sharedConfig.sessionId;
            if (tokenPresent)
                ls.setItem(keys.token, this.sharedConfig.authToken);
            else ls.removeItem(keys.token);
            ls.setItem(keys.provider, provider);
            if (sessionId) ls.setItem(keys.sessionId, sessionId);
            else ls.removeItem(keys.sessionId);
            this.lastPersisted.tokenPresent = tokenPresent;
            this.lastPersisted.provider = provider;
            this.lastPersisted.sessionId = sessionId;
        } catch {
            // no-op
        }
    }

    private persistAgentId(agentId: string): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const ls = window.localStorage;
            if (agentId) ls.setItem(keys.agentId, agentId);
            else ls.removeItem(keys.agentId);
            this.lastPersisted.agentId = agentId || undefined;
        } catch {
            // no-op
        }
    }

    private clearPersistedAuth(): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const ls = window.localStorage;
            ls.removeItem(keys.token);
            ls.removeItem(keys.provider);
            ls.removeItem(keys.sessionId);
            ls.removeItem(keys.agentId);
            this.lastPersisted = {
                tokenPresent: false,
                provider: "",
                sessionId: undefined,
                agentId: undefined,
            };
        } catch {
            // no-op
        }
    }

    // Public getters for stored values (simple strings/objects)
    getAuthToken(): string {
        return this.sharedConfig.authToken || "";
    }

    getStoredToken(): string | null {
        const keys = this.getStorageKeys();
        if (!keys) return null;
        try {
            return window.localStorage.getItem(keys.token);
        } catch {
            return null;
        }
    }

    getStoredProvider(): string {
        const keys = this.getStorageKeys();
        if (!keys) return this.sharedConfig.authProvider || "anon";
        try {
            return (
                window.localStorage.getItem(keys.provider) ||
                this.sharedConfig.authProvider ||
                "anon"
            );
        } catch {
            return this.sharedConfig.authProvider || "anon";
        }
    }

    getStoredSessionId(): string | null {
        const keys = this.getStorageKeys();
        if (!keys) return this.sharedConfig.sessionId || null;
        try {
            return window.localStorage.getItem(keys.sessionId);
        } catch {
            return this.sharedConfig.sessionId || null;
        }
    }

    getStoredAgentId(): string | null {
        const keys = this.getStorageKeys();
        if (!keys) return this.lastPersisted.agentId || null;
        try {
            return window.localStorage.getItem(keys.agentId);
        } catch {
            return this.lastPersisted.agentId || null;
        }
    }

    setStoredAgentId(agentId: string | null): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const ls = window.localStorage;
            if (agentId) ls.setItem(keys.agentId, agentId);
            else ls.removeItem(keys.agentId);
            this.lastPersisted.agentId = agentId || undefined;
            this.emitAuthChange();
        } catch {
            // no-op
        }
    }

    getStoredAccount<T = unknown>(): T | null {
        const keys = this.getStorageKeys();
        if (!keys) return null;
        try {
            const accountKey = `${keys.agentId.replace(/:agentId$/, "")}:account`;
            const raw = window.localStorage.getItem(accountKey);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    setStoredAccount(value: unknown | null): void {
        const keys = this.getStorageKeys();
        if (!keys) return;
        try {
            const accountKey = `${keys.agentId.replace(/:agentId$/, "")}:account`;
            if (value === null || value === undefined)
                window.localStorage.removeItem(accountKey);
            else window.localStorage.setItem(accountKey, JSON.stringify(value));
            this.emitAuthChange();
        } catch {
            // no-op
        }
    }

    getAuthState(): {
        hasToken: boolean;
        provider: string;
        sessionId?: string;
        agentId?: string;
    } {
        const info = this.wsCore.getConnectionInfo();
        return {
            hasToken:
                !!this.sharedConfig.authToken &&
                this.sharedConfig.authToken.length > 0,
            provider:
                this.sharedConfig.authProvider || info.authProvider || "anon",
            sessionId: this.sharedConfig.sessionId,
            agentId: info.agentId || this.lastPersisted.agentId,
        };
    }

    addAuthChangeListener(listener: () => void): () => void {
        this.authListeners.add(listener);
        return () => this.authListeners.delete(listener);
    }

    private emitAuthChange(): void {
        for (const l of this.authListeners) l();
    }

    clearLocalAuth(): void {
        this.sharedConfig.sessionId = undefined;
        this.sharedConfig.authToken = "";
        this.sharedConfig.authProvider = "anon";
        this.wsCore.disconnect();
        this.clearPersistedAuth();
        this.emitAuthChange();
    }
}
