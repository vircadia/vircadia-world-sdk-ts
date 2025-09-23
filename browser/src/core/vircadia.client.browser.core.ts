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
        const query = endpoint.createRequest(finalParams);
        const url = new URL(`${endpoint.path}${query}`, this.config.apiRestAssetUri);
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
        const url = new URL(`${endpoint.path}${query}`, this.config.apiRestAssetUri);
        debugLog(this.config, "Fetching asset:", url.toString(), {
            hasToken: !!finalParams.token,
            hasProvider: !!finalParams.provider,
            hasSessionId: !!finalParams.sessionId,
            tokenLength: (finalParams.token as string | undefined)?.length,
            provider: finalParams.provider,
        });
        try {
            const resp = await fetch(url.toString(), { method: endpoint.method });
            if (!resp.ok) {
                debugError(this.config, `Asset fetch failed: ${resp.status} ${resp.statusText} → ${url.toString()}`);
            }
            return resp;
        } catch (err) {
            debugError(this.config, `Asset fetch threw before response: ${url.toString()}`, err);
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

    private async makeRequest(
        url: string,
        method: string,
        // biome-ignore lint/suspicious/noExplicitAny: Flexible body
        body?: any,
        headers: Record<string, string> = {},
        // biome-ignore lint/suspicious/noExplicitAny: Flexible response
    ): Promise<any> {
        debugLog(this.config, `Making ${method} request to:`, url.toString(), { headers });

        const requestOptions: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        if (body && (method === "POST" || method === "PUT")) {
            requestOptions.body = typeof body === "string" ? body : JSON.stringify(body);
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
                return {
                    success: false,
                    timestamp: Date.now(),
                    error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
                };
            }
            debugLog(this.config, `Request succeeded:`, { url: url.toString(), method, response: responseData });
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

    async validateSession(data: { token: string; provider: string }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_SESSION_VALIDATE;
        const requestBody = endpoint.createRequest(data);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method, requestBody);
    }

    async loginAnonymous(): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_ANONYMOUS_LOGIN;
        const requestBody = endpoint.createRequest();
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method, requestBody);
    }

    async authorizeOAuth(provider: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_AUTHORIZE;
        const queryParams = endpoint.createRequest(provider);
        const url = new URL(`${endpoint.path}${queryParams}`, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method);
    }

    async handleOAuthCallback(params: { provider: string; code: string; state?: string }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_OAUTH_CALLBACK;
        const queryParams = endpoint.createRequest(params);
        const url = new URL(`${endpoint.path}${queryParams}`, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method);
    }

    async logout(sessionId: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LOGOUT;
        const requestBody = endpoint.createRequest(sessionId);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method, requestBody);
    }

    async linkProvider(data: { provider: string; sessionId: string }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LINK_PROVIDER;
        const requestBody = endpoint.createRequest(data);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method, requestBody);
    }

    async unlinkProvider(data: { provider: string; providerUid: string; sessionId: string }): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_UNLINK_PROVIDER;
        const requestBody = endpoint.createRequest(data);
        const url = new URL(endpoint.path, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method, requestBody);
    }

    async listProviders(sessionId: string): Promise<any> {
        const endpoint = Communication.REST.Endpoint.AUTH_LIST_PROVIDERS;
        const queryParams = endpoint.createRequest(sessionId);
        const url = new URL(`${endpoint.path}${queryParams}`, this.config.apiRestAuthUri);
        return this.makeRequest(url.toString(), endpoint.method);
    }
}

// ======================= Unified Browser Client =======================

export interface VircadiaBrowserClientConfig {
    apiWsUri: string;
    apiRestAuthUri: string;
    apiRestAssetUri: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    debug?: boolean;
    suppress?: boolean;
}

export class VircadiaBrowserClient {
    private sharedConfig: VircadiaBrowserClientConfig;
    private wsCore: WsConnectionCore;
    private restAuthCore: RestAuthCore;
    private restAssetCore: RestAssetCore;
    public readonly connection: {
        connect: (options?: { timeoutMs?: number }) => Promise<WsConnectionCoreInfo>;
        disconnect: () => void;
        addEventListener: (event: string, listener: ClientCoreConnectionEventListener) => void;
        removeEventListener: (event: string, listener: ClientCoreConnectionEventListener) => void;
        query: <T = unknown>(data: { query: string; parameters?: unknown[]; timeoutMs?: number }) => Promise<Communication.WebSocket.QueryResponseMessage<T>>;
        publishReflect: (data: { syncGroup: string; channel: string; payload: unknown; timeoutMs?: number }) => Promise<Communication.WebSocket.ReflectAckResponseMessage>;
        subscribeReflect: (
            syncGroup: string,
            channel: string,
            listener: (msg: Communication.WebSocket.ReflectDeliveryMessage) => void,
        ) => () => void;
        getConnectionInfo: () => WsConnectionCoreInfo;
    };
    public readonly restAuth: {
        validateSession: (data: { token: string; provider: string }) => Promise<any>;
        loginAnonymous: () => Promise<any>;
        authorizeOAuth: (provider: string) => Promise<any>;
        handleOAuthCallback: (params: { provider: string; code: string; state?: string }) => Promise<any>;
        logout: () => Promise<any>;
        linkProvider: (data: { provider: string; sessionId: string }) => Promise<any>;
        unlinkProvider: (data: { provider: string; providerUid: string; sessionId: string }) => Promise<any>;
        listProviders: (sessionId: string) => Promise<any>;
    };
    public readonly restAsset: {
        assetGetByKey: (params: { key: string }) => Promise<Response>;
    };

    constructor(config: VircadiaBrowserClientConfig) {
        this.sharedConfig = config;
        // Pass the SAME object reference so sessionId updates propagate across cores
        this.wsCore = new WsConnectionCore(this.sharedConfig);
        this.restAuthCore = new RestAuthCore(this.sharedConfig);
        this.restAssetCore = new RestAssetCore(this.sharedConfig);

        // Namespaced helpers that use shared variables directly
        this.connection = {
            connect: (options) =>
                this.wsCore.connect({
                    timeoutMs: options?.timeoutMs,
                    validateSession: (data) => this.restAuthCore.validateSession(data),
                }),
            disconnect: () => this.disconnect(),
            addEventListener: (event, listener) => this.wsCore.addEventListener(event, listener),
            removeEventListener: (event, listener) => this.wsCore.removeEventListener(event, listener),
            query: (data) => this.wsCore.query(data),
            publishReflect: (data) => this.wsCore.publishReflect(data),
            subscribeReflect: (syncGroup, channel, listener) => this.wsCore.subscribeReflect(syncGroup, channel, listener),
            getConnectionInfo: () => this.wsCore.getConnectionInfo(),
        };

        this.restAuth = {
            validateSession: (data) => this.restAuthCore.validateSession(data),
            loginAnonymous: () => this.loginAnonymous(),
            authorizeOAuth: (provider) => this.restAuthCore.authorizeOAuth(provider),
            handleOAuthCallback: (params) => this.handleOAuthCallback(params),
            logout: () => this.logout(),
            linkProvider: (data) => this.restAuthCore.linkProvider(data),
            unlinkProvider: (data) => this.restAuthCore.unlinkProvider(data),
            listProviders: (sessionId) => this.restAuthCore.listProviders(sessionId),
        };

        this.restAsset = {
            assetGetByKey: (params) => this.restAssetCore.assetGetByKey(params),
        };
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
    }

    setAuthProvider(provider: string): void {
        this.sharedConfig.authProvider = provider;
    }

    setDebug(isDebug: boolean): void {
        this.sharedConfig.debug = isDebug;
    }

    setSuppress(isSuppressed: boolean): void {
        this.sharedConfig.suppress = isSuppressed;
    }

    setSessionId(sessionId: string | undefined): void {
        this.sharedConfig.sessionId = sessionId;
    }

    getSessionId(): string | undefined {
        return this.sharedConfig.sessionId;
    }

    // ---------------- High-level flows ----------------
    async connect(options?: { timeoutMs?: number }): Promise<WsConnectionCoreInfo> {
        return this.wsCore.connect({
            timeoutMs: options?.timeoutMs,
            validateSession: (data) => this.restAuthCore.validateSession(data),
        });
    }

    disconnect(): void {
        this.wsCore.disconnect();
        // Clear sessionId in shared config to avoid stale state for REST
        this.sharedConfig.sessionId = undefined;
    }

    // Auth convenience methods that also update shared token/provider/sessionId
    async loginAnonymous(): Promise<any> {
        const resp = await this.restAuthCore.loginAnonymous();
        if (resp && resp.success && resp.data) {
            if (typeof resp.data.token === "string") this.sharedConfig.authToken = resp.data.token;
            // Anonymous provider constant from schema (fallback to "anon")
            this.sharedConfig.authProvider = this.sharedConfig.authProvider || "anon";
            if (typeof resp.data.sessionId === "string") this.sharedConfig.sessionId = resp.data.sessionId;
        }
        return resp;
    }

    async authorizeOAuth(provider: string): Promise<any> {
        // This just triggers a redirect URL; no state to update yet
        return this.restAuthCore.authorizeOAuth(provider);
    }

    async handleOAuthCallback(params: { provider: string; code: string; state?: string }): Promise<any> {
        const resp = await this.restAuthCore.handleOAuthCallback(params);
        if (resp && resp.success) {
            if (typeof resp.token === "string") this.sharedConfig.authToken = resp.token;
            if (typeof resp.provider === "string") this.sharedConfig.authProvider = resp.provider;
            if (typeof resp.sessionId === "string") this.sharedConfig.sessionId = resp.sessionId;
        }
        return resp;
    }

    async logout(): Promise<any> {
        const sessionId = this.sharedConfig.sessionId;
        let resp: any;
        try {
            resp = await this.restAuthCore.logout(sessionId || "");
        } catch (e) {
            resp = { success: false, error: e instanceof Error ? e.message : String(e) };
        }
        // Always clear local session regardless of server response to ensure client-side logout
        this.sharedConfig.sessionId = undefined;
        this.sharedConfig.authToken = "";
        this.sharedConfig.authProvider = "anon";
        this.wsCore.disconnect();
        return resp && typeof resp === "object" ? resp : { success: true };
    }

    // Note: Legacy Utilities getter removed in favor of top-level namespaces.

    // ---------------- Asset URL helpers (for Babylon.js) ----------------

    buildAssetRequestUrl(key: string): string {
        return this.restAssetCore.buildAssetGetByKeyUrl({ key });
    }

    async fetchAssetAsBabylonUrl(key: string): Promise<{ url: string; mimeType: string; revoke: () => void; source: "data-url" | "object-url" }> {
        const response = await this.restAssetCore.assetGetByKey({ key });
        if (!response.ok) {
            let serverError: string | undefined;
            try {
                const ct = response.headers.get("Content-Type") || "";
                if (ct.includes("application/json")) {
                    const j = await response.clone().json();
                    serverError = (j as any)?.error || JSON.stringify(j);
                }
            } catch {}
            throw new Error(`Asset fetch failed: HTTP ${response.status}${serverError ? ` - ${serverError}` : ""}`);
        }

        const mimeType = response.headers.get("Content-Type") || "application/octet-stream";
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: mimeType });

        const blobToDataUrl = (b: Blob): Promise<string> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Failed to convert blob to data URL"));
                reader.readAsDataURL(b);
            });

        if (mimeType.startsWith("model/")) {
            const url = await blobToDataUrl(blob);
            return { url, mimeType, revoke: () => {}, source: "data-url" };
        }

        const objectUrl = URL.createObjectURL(blob);
        const revoke = () => {
            try {
                URL.revokeObjectURL(objectUrl);
            } catch {}
        };
        return { url: objectUrl, mimeType, revoke, source: "object-url" };
    }
}
