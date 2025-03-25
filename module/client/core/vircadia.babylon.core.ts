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
    private pendingRequests = new Map<string, {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
        timeout: number;
    }>();

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
}

class EntityManager {
    private entities = new Map<string, Entity.I_Entity>();
    private scene: Scene;

    // Internal managers for script and asset handling
    private scriptManager: {
        scripts: Map<string, Entity.Script.I_Script>;
        scriptInstances: Map<string, {
            script: Entity.Script.I_Script;
            hooks: Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"];
            context: Entity.Script.Babylon.I_Context;
        }>;
        
        loadScript(scriptName: string): Promise<Entity.Script.I_Script>;
        executeScript(script: Entity.Script.I_Script, entity: Entity.I_Entity, assets: Entity.Asset.I_Asset[]): Promise<void>;
        reloadScript(scriptName: string): Promise<void>;
    };

    private assetManager: {
        assets: Map<string, Entity.Asset.I_Asset>;
        
        loadAsset(assetName: string): Promise<Entity.Asset.I_Asset>;
        reloadAsset(assetName: string): Promise<void>;
    };

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connection: VircadiaConnection
    ) {
        this.scene = config.scene || new Scene(config.engine);
        
        // Initialize internal managers
        this.scriptManager = {
            scripts: new Map(),
            scriptInstances: new Map(),
            
            async loadScript(scriptName: string): Promise<Entity.Script.I_Script> {
                const result = await this.connection.sendQueryAsync<Entity.Script.I_Script[]>(`
                    SELECT * FROM entity.entity_scripts 
                    WHERE general__script_file_name = $1
                `, [scriptName]);
                
                if (!result.length) throw new Error(`Script ${scriptName} not found`);
                const script = result[0];
                this.scripts.set(scriptName, script);
                return script;
            },

            async executeScript(
                script: Entity.Script.I_Script,
                entity: Entity.I_Entity,
                assets: Entity.Asset.I_Asset[]
            ): Promise<void> {
                // Create script context with reload capability
                const context: Entity.Script.Babylon.I_Context = {
                    Vircadia: {
                        v1: {
                            Query: {
                                execute: this.connection.sendQueryAsync.bind(this.connection)
                            },
                            Hook: {},
                            Script: {
                                reload: async () => {
                                    await this.reloadScript(script.general__script_file_name);
                                }
                            },
                            Babylon: {
                                Scene: this.scene
                            }
                        }
                    }
                };

                // Execute script and store instance
                const instance = await this.executeScriptInContext(script, context);
                this.scriptInstances.set(script.general__script_file_name, {
                    script,
                    hooks: instance.hooks,
                    context
                });

                // Initialize script with entity and assets
                if (instance.hooks.onScriptInitialize) {
                    await instance.hooks.onScriptInitialize(entity, assets);
                }
            },

            async reloadScript(scriptName: string): Promise<void> {
                const script = await this.loadScript(scriptName);
                const instance = this.scriptInstances.get(scriptName);
                if (instance) {
                    // Call teardown if it exists
                    if (instance.hooks.onScriptTeardown) {
                        await instance.hooks.onScriptTeardown();
                    }
                    // Re-execute script
                    await this.executeScript(script, /* need to store entity reference */, /* need to store asset references */);
                }
            }
        };

        this.assetManager = {
            assets: new Map(),
            
            async loadAsset(assetName: string): Promise<Entity.Asset.I_Asset> {
                const result = await this.connection.sendQueryAsync<Entity.Asset.I_Asset[]>(`
                    SELECT * FROM entity.entity_assets 
                    WHERE general__asset_file_name = $1
                `, [assetName]);
                
                if (!result.length) throw new Error(`Asset ${assetName} not found`);
                const asset = result[0];
                this.assets.set(assetName, asset);
                return asset;
            },

            async reloadAsset(assetName: string): Promise<void> {
                const asset = await this.loadAsset(assetName);
                // Notify all scripts that use this asset
                for (const instance of this.scriptManager.scriptInstances.values()) {
                    if (instance.hooks.onAssetUpdate) {
                        await instance.hooks.onAssetUpdate(asset);
                    }
                }
            }
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

    getScene(): Scene {
        return this.entityManager.getScene();
    }

    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.entityManager.getEntity(entityId);
    }

    getEntities(): Map<string, Entity.I_Entity> {
        return this.entityManager.getEntities();
    }
}
