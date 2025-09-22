import { Communication } from "../../../schema/src/vircadia.schema.general";

export interface RestAuthCoreConfig {
    apiRestAuthUri: string;
    authToken: string;
    authProvider: string;
    sessionId?: string;
    debug?: boolean;
    suppress?: boolean;
}

const debugLog = (
    config: { debug?: boolean; suppress?: boolean },
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: debug args
    ...args: any[]
) => {
    if (config.debug && !config.suppress) {
        console.log(message, ...args);
    }
};

const debugError = (
    config: { suppress?: boolean },
    message: string,
    // biome-ignore lint/suspicious/noExplicitAny: debug args
    ...args: any[]
) => {
    if (!config.suppress) {
        console.error(message, ...args);
    }
};

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


