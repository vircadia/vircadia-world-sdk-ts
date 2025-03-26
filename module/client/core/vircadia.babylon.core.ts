import { Engine, NullEngine, Scene, WebGPUEngine } from "@babylonjs/core";
import { Communication, Entity } from "../../../schema/schema.general";

export interface VircadiaBabylonCoreConfig {
    // Connection settings
    serverUrl: string;
    authToken: string;
    authProvider: string;

    // Engine/Scene settings
    engine: Engine | NullEngine | WebGPUEngine;
    scene?: Scene;

    // Reconnection settings
    reconnectAttempts?: number;
    reconnectDelay?: number;

    // Debug settings
    debug?: boolean;
    suppress?: boolean;
}

class VircadiaConnection {
    private ws: WebSocket | null = null;
    private isConnecting = false;
    private isConnected = false;
    private reconnectTimer: Timer | null = null;
    private reconnectCount = 0;
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: any) => void;
            reject: (reason: any) => void;
            timeout: Timer;
        }
    >();

    constructor(private config: VircadiaBabylonCoreConfig) {}

    async connect(): Promise<boolean> {
        if (this.isConnected || this.isConnecting) return this.isConnected;
        this.isConnecting = true;

        try {
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
                this.ws.onopen = () => resolve();
                this.ws.onerror = (err) => reject(err);
            });

            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectCount = 0;
            return true;
        } catch (error) {
            this.isConnecting = false;
            this.attemptReconnect();
            throw error;
        }
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(
                event.data,
            ) as Communication.WebSocket.Message;
            const request = this.pendingRequests.get(message.requestId);

            if (request) {
                clearTimeout(request.timeout);
                this.pendingRequests.delete(message.requestId);

                if (message.errorMessage) {
                    request.reject(new Error(message.errorMessage));
                } else {
                    request.resolve(message);
                }
            }
        } catch (error) {
            console.error("Error handling WebSocket message:", error);
        }
    }

    private handleClose(event: CloseEvent): void {
        this.isConnected = false;
        this.attemptReconnect();
    }

    private handleError(event: Event): void {
        console.error("WebSocket error:", event);
        this.isConnected = false;
    }

    private attemptReconnect(): void {
        if (this.reconnectTimer !== null) return;

        const maxAttempts = this.config.reconnectAttempts ?? 5;
        const delay = this.config.reconnectDelay ?? 5000;

        if (this.reconnectCount >= maxAttempts) {
            console.error("Max reconnection attempts reached");
            return;
        }

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectCount++;

            try {
                await this.connect();
            } catch (error) {
                console.error("Reconnection attempt failed:", error);
            }
        }, delay);
    }

    async sendQueryAsync<T = any>(
        query: string,
        parameters: any[] = [],
        timeoutMs = 10000,
    ): Promise<T> {
        if (!this.isConnected || !this.ws) {
            throw new Error("Not connected to server");
        }

        const requestId = crypto.randomUUID();
        const message = new Communication.WebSocket.QueryRequestMessage({
            query,
            parameters,
            requestId,
            errorMessage: null,
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error("Request timeout"));
            }, timeoutMs);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });
            this.ws?.send(JSON.stringify(message));
        });
    }

    isClientConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Disconnects from the server and cleans up resources
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

        // Update connection state
        this.isConnected = false;
        this.isConnecting = false;
    }
}

class EntityManager {
    private entities = new Map<string, Entity.I_Entity>();
    private scene: Scene;

    // Internal managers for script and asset handling
    private scriptManager: {
        scripts: Map<string, Entity.Script.I_Script>;
        scriptInstances: Map<
            string,
            {
                script: Entity.Script.I_Script;
                hooks: Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"];
                context: Entity.Script.Babylon.I_Context;
                entityId?: string;
                assets?: Entity.Asset.I_Asset[];
            }
        >;

        loadScript: (scriptName: string) => Promise<Entity.Script.I_Script>;
        executeScript: (
            script: Entity.Script.I_Script,
            entity: Entity.I_Entity,
            assets: Entity.Asset.I_Asset[],
            scene: Scene,
        ) => Promise<void>;
        executeScriptInContext: (
            script: Entity.Script.I_Script,
            context: Entity.Script.Babylon.I_Context,
        ) => Promise<Entity.Script.Babylon.I_Return>;
        reloadScript: (
            scriptName: string,
            entityManager: EntityManager,
        ) => Promise<void>;
    };

    private assetManager: {
        assets: Map<string, Entity.Asset.I_Asset>;

        loadAsset: (assetName: string) => Promise<Entity.Asset.I_Asset>;
        reloadAsset: (
            assetName: string,
            scriptManager: EntityManager["scriptManager"],
        ) => Promise<void>;
    };

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connection: VircadiaConnection,
    ) {
        this.scene = config.scene || new Scene(config.engine);

        // Initialize internal managers with proper self-references
        const self = this;

        this.scriptManager = {
            scripts: new Map(),
            scriptInstances: new Map(),

            async loadScript(
                scriptName: string,
            ): Promise<Entity.Script.I_Script> {
                const result = await connection.sendQueryAsync<
                    Entity.Script.I_Script[]
                >(
                    `
                    SELECT * FROM entity.entity_scripts 
                    WHERE general__script_file_name = $1
                `,
                    [scriptName],
                );

                if (!result.length)
                    throw new Error(`Script ${scriptName} not found`);
                const script = result[0];
                this.scripts.set(scriptName, script);
                return script;
            },

            async executeScript(
                script: Entity.Script.I_Script,
                entity: Entity.I_Entity,
                assets: Entity.Asset.I_Asset[],
                scene: Scene,
            ): Promise<void> {
                // Create script context with reload capability
                const context: Entity.Script.Babylon.I_Context = {
                    Vircadia: {
                        v1: {
                            Query: {
                                execute:
                                    connection.sendQueryAsync.bind(connection),
                            },
                            Hook: {},
                            Script: {
                                reload: async () => {
                                    await this.reloadScript(
                                        script.general__script_file_name,
                                        self,
                                    );
                                },
                            },
                            Babylon: {
                                Scene: scene,
                            },
                        },
                    },
                };

                // Execute script and store instance
                const instance = await this.executeScriptInContext(
                    script,
                    context,
                );
                this.scriptInstances.set(script.general__script_file_name, {
                    script,
                    hooks: instance.hooks as Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"],
                    context,
                    entityId: entity.general__entity_id,
                    assets,
                });

                // Initialize script with entity and assets
                if (instance.hooks.onScriptInitialize) {
                    await instance.hooks.onScriptInitialize(entity, assets);
                }
            },

            async executeScriptInContext(
                script: Entity.Script.I_Script,
                context: Entity.Script.Babylon.I_Context,
            ): Promise<Entity.Script.Babylon.I_Return> {
                try {
                    // Execute the compiled script in the provided context
                    const funcBody =
                        script.script__compiled__data ||
                        script.script__source__data;
                    // Use Function constructor to create a function from the script code
                    const scriptFunc = new Function(
                        "context",
                        `
                        ${funcBody}
                        return {
                            scriptFunction: main,
                            hooks: context.Vircadia.v1.Hook
                        };
                    `,
                    );

                    // Execute the function with the context
                    return scriptFunc(
                        context,
                    ) as Entity.Script.Babylon.I_Return;
                } catch (error) {
                    console.error(
                        `Error executing script ${script.general__script_file_name}:`,
                        error,
                    );
                    throw error;
                }
            },

            async reloadScript(
                scriptName: string,
                entityManager: EntityManager,
            ): Promise<void> {
                const script = await this.loadScript(scriptName);
                const instance = this.scriptInstances.get(scriptName);
                if (instance) {
                    // Call teardown if it exists
                    if (instance.hooks.onScriptTeardown) {
                        await instance.hooks.onScriptTeardown();
                    }

                    // Get entity from the entities map using the stored entityId
                    if (instance.entityId) {
                        const entity = entityManager.getEntity(
                            instance.entityId,
                        );
                        if (entity && instance.assets) {
                            await this.executeScript(
                                script,
                                entity,
                                instance.assets,
                                entityManager.getScene(),
                            );
                        } else {
                            console.warn(
                                `Could not reload script ${scriptName}: Entity or assets not found`,
                            );
                        }
                    } else {
                        console.warn(
                            `Could not reload script ${scriptName}: No entity ID stored`,
                        );
                    }
                }
            },
        };

        this.assetManager = {
            assets: new Map(),

            async loadAsset(assetName: string): Promise<Entity.Asset.I_Asset> {
                const result = await connection.sendQueryAsync<
                    Entity.Asset.I_Asset[]
                >(
                    `
                    SELECT * FROM entity.entity_assets 
                    WHERE general__asset_file_name = $1
                `,
                    [assetName],
                );

                if (!result.length)
                    throw new Error(`Asset ${assetName} not found`);
                const asset = result[0];
                this.assets.set(assetName, asset);
                return asset;
            },

            async reloadAsset(
                assetName: string,
                scriptManager: EntityManager["scriptManager"],
            ): Promise<void> {
                const asset = await this.loadAsset(assetName);
                // Notify all scripts that use this asset
                for (const instance of scriptManager.scriptInstances.values()) {
                    if (instance.hooks.onAssetUpdate) {
                        await instance.hooks.onAssetUpdate(asset);
                    }
                }
            },
        };
    }

    async loadEntitiesByPriority(): Promise<void> {
        try {
            // Get all entities ordered by priority
            const result = await this.connection.sendQueryAsync<
                Entity.I_Entity[]
            >(`
                SELECT *
                FROM entity.entities
                ORDER BY 
                    COALESCE(group__load_priority, 2147483647),
                    general__created_at ASC
            `);

            // Group entities by priority
            const priorityGroups = new Map<number, Entity.I_Entity[]>();

            for (const entity of result) {
                const priority =
                    entity.group__load_priority ?? Number.MAX_SAFE_INTEGER;
                if (!priorityGroups.has(priority)) {
                    priorityGroups.set(priority, []);
                }
                priorityGroups.get(priority)?.push(entity);
            }

            // Process each priority group in order
            for (const [priority, entities] of [
                ...priorityGroups.entries(),
            ].sort((a, b) => a[0] - b[0])) {
                await this.processEntityGroup(entities);
            }
        } catch (error) {
            console.error("Failed to load entities:", error);
            throw error;
        }
    }

    private async processEntityGroup(
        entities: Entity.I_Entity[],
    ): Promise<void> {
        // Store entities in our map
        for (const entity of entities) {
            this.entities.set(entity.general__entity_id, entity);
        }
    }

    getScene(): Scene {
        return this.scene;
    }

    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.entities.get(entityId);
    }

    getEntities(): Map<string, Entity.I_Entity> {
        return this.entities;
    }
}

export class VircadiaBabylonCore {
    private connection: VircadiaConnection;
    private entityManager: EntityManager;

    constructor(private config: VircadiaBabylonCoreConfig) {
        // Fix ordering - create connection first
        this.connection = new VircadiaConnection(config);
        this.entityManager = new EntityManager(config, this.connection);
    }

    async initialize(): Promise<void> {
        await this.connection.connect();
        await this.entityManager.loadEntitiesByPriority();
    }

    getConnection(): VircadiaConnection {
        return this.connection;
    }

    getScene(): Scene {
        return this.entityManager.getScene();
    }

    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.entityManager.getEntity(entityId);
    }

    getEntities(): Map<string, Entity.I_Entity> {
        return this.entityManager.getEntities();
    }

    /**
     * Disposes the VircadiaBabylonCore instance and cleans up all resources
     */
    dispose(): void {
        // Disconnect from the server
        if (this.connection) {
            this.connection.disconnect();
        }

        // No need to dispose the scene or engine here since they're provided externally
        // and should be managed by the application
    }
}
