import { Communication } from "../../../schema/src/vircadia.schema.general";

export interface RestAssetCoreConfig {
    apiRestAssetUri: string;
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

export class RestAssetCore {
    constructor(private config: RestAssetCoreConfig) {}

    updateConfig(newConfig: RestAssetCoreConfig): void {
        this.config = newConfig;
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


