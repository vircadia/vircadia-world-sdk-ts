import {
    type Engine,
    type NullEngine,
    Scene,
    type WebGPUEngine,
} from "@babylonjs/core";
import { Communication, type Entity } from "../../../schema/schema.general";

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

    constructor(private config: VircadiaBabylonCoreConfig) {}

    // Connect to the server and handle authentication
    async connect(): Promise<boolean> {
        if (this.isClientConnected() || this.isConnecting())
            return this.isClientConnected();

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

                // Define a handler for connection errors
                const handleConnectionError = (event: CloseEvent) => {
                    // Try to extract detailed error information from the close event
                    let errorMessage = "Connection failed";

                    // If there's a meaningful reason phrase
                    if (event.reason) {
                        errorMessage = event.reason;
                    }

                    reject(
                        new Error(
                            `WebSocket connection failed: ${errorMessage}`,
                        ),
                    );
                };

                this.ws.onopen = () => {
                    // Remove the error handler once connected
                    if (this.ws) this.ws.onclose = this.handleClose.bind(this);
                    resolve();
                };

                // Enhanced error handling
                this.ws.onerror = (err) => {
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
    async sendQueryAsync<T = unknown>(
        query: string,
        parameters: unknown[] = [],
        timeoutMs = 10000,
    ): Promise<Communication.WebSocket.QueryResponseMessage<T>> {
        if (!this.isClientConnected()) {
            throw new Error("Not connected to server");
        }

        const requestId = crypto.randomUUID();
        const message = new Communication.WebSocket.QueryRequestMessage({
            query,
            parameters,
            requestId,
            errorMessage: null,
        });

        return new Promise<Communication.WebSocket.QueryResponseMessage<T>>(
            (resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Request timeout"));
                }, timeoutMs);

                this.pendingRequests.set(requestId, {
                    resolve: resolve as (value: unknown) => void,
                    reject,
                    timeout,
                });
                this.ws?.send(JSON.stringify(message));
            },
        );
    }

    // Connection state methods
    isConnecting(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
    }

    isClientConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    isReconnecting(): boolean {
        return this.reconnectTimer !== null;
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

        console.error("WebSocket error:", errorMessage);
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
}

// Handles asset loading and management
class AssetManager {
    private assets = new Map<string, Entity.Asset.I_Asset>();
    private assetUpdateListeners: Array<(asset: Entity.Asset.I_Asset) => void> =
        [];

    constructor(private connectionManager: ConnectionManager) {}

    // Load an asset from the server
    async loadAsset(assetName: string): Promise<Entity.Asset.I_Asset> {
        const queryResponse = await this.connectionManager.sendQueryAsync<
            Entity.Asset.I_Asset[]
        >(
            "SELECT * FROM entity.entity_assets WHERE general__asset_file_name = $1",
            [assetName],
        );

        if (!queryResponse.result.length)
            throw new Error(`Asset ${assetName} not found`);

        const asset = queryResponse.result[0];
        this.assets.set(assetName, asset);
        return asset;
    }

    // Reload an asset and notify listeners
    async reloadAsset(assetName: string): Promise<void> {
        const asset = await this.loadAsset(assetName);
        this.notifyAssetUpdated(asset);
    }

    // Get an already loaded asset
    getAsset(assetName: string): Entity.Asset.I_Asset | undefined {
        return this.assets.get(assetName);
    }

    // Register for asset update notifications
    addAssetUpdateListener(
        listener: (asset: Entity.Asset.I_Asset) => void,
    ): void {
        this.assetUpdateListeners.push(listener);
    }

    // Notify all listeners about an asset update
    private notifyAssetUpdated(asset: Entity.Asset.I_Asset): void {
        for (const listener of this.assetUpdateListeners) {
            listener(asset);
        }
    }
}

// Handles script loading, execution, and management
class ScriptManager {
    private scripts = new Map<string, Entity.Script.I_Script>();
    private scriptInstances = new Map<
        string,
        {
            script: Entity.Script.I_Script;
            hooks: Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"];
            context: Entity.Script.Babylon.I_Context;
            entityId?: string;
            assets?: Entity.Asset.I_Asset[];
        }
    >();

    constructor(
        private connectionManager: ConnectionManager,
        private scene: Scene,
        private entityManager: EntityManager, // Will be set after EntityManager is created
        private assetManager: AssetManager,
    ) {}

    // Load a script from the server
    async loadScript(scriptName: string): Promise<Entity.Script.I_Script> {
        const queryResponse = await this.connectionManager.sendQueryAsync<
            Entity.Script.I_Script[]
        >(
            "SELECT * FROM entity.entity_scripts WHERE general__script_file_name = $1",
            [scriptName],
        );

        if (!queryResponse.result.length) {
            throw new Error(`Script ${scriptName} not found`);
        }

        const script = queryResponse.result[0];
        this.scripts.set(scriptName, script);
        return script;
    }

    // Execute a script for a specific entity
    async executeScript(
        script: Entity.Script.I_Script,
        entity: Entity.I_Entity,
        assets: Entity.Asset.I_Asset[],
    ): Promise<void> {
        // Create script context
        const context: Entity.Script.Babylon.I_Context = {
            Vircadia: {
                v1: {
                    Query: {
                        execute: this.connectionManager.sendQueryAsync.bind(
                            this.connectionManager,
                        ),
                    },
                    Hook: {},
                    Script: {
                        reload: async () => {
                            await this.reloadScript(
                                script.general__script_file_name,
                            );
                        },
                    },
                    Babylon: {
                        Scene: this.scene,
                    },
                },
            },
        };

        // Execute script and store instance
        const instance = await this.executeScriptInContext(script, context);

        this.scriptInstances.set(script.general__script_file_name, {
            script,
            hooks: instance.hooks as Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"],
            context,
            entityId: entity.general__entity_id,
            assets,
        });

        // Initialize script
        if (instance.hooks.onScriptInitialize) {
            await instance.hooks.onScriptInitialize(entity, assets);
        }
    }

    // Execute script code in a provided context
    private async executeScriptInContext(
        script: Entity.Script.I_Script,
        context: Entity.Script.Babylon.I_Context,
    ): Promise<Entity.Script.Babylon.I_Return> {
        try {
            const funcBody =
                script.script__compiled__data || script.script__source__data;
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

            return scriptFunc(context) as Entity.Script.Babylon.I_Return;
        } catch (error) {
            console.error(
                `Error executing script ${script.general__script_file_name}:`,
                error,
            );
            throw error;
        }
    }

    // Reload a script and reinitialize it
    async reloadScript(scriptName: string): Promise<void> {
        const script = await this.loadScript(scriptName);
        const instance = this.scriptInstances.get(scriptName);

        if (instance) {
            // Call teardown if it exists
            if (instance.hooks.onScriptTeardown) {
                await instance.hooks.onScriptTeardown();
            }

            // Get entity and reinitialize
            if (instance.entityId) {
                const entity = this.entityManager.getEntity(instance.entityId);
                if (entity && instance.assets) {
                    await this.executeScript(script, entity, instance.assets);
                } else {
                    console.warn(
                        `Could not reload script ${scriptName}: Entity or assets not found`,
                    );
                }
            }
        }
    }

    // Notify all scripts about an entity update
    notifyEntityUpdate(entity: Entity.I_Entity): void {
        for (const instance of this.scriptInstances.values()) {
            if (instance.hooks.onEntityUpdate) {
                instance.hooks.onEntityUpdate(entity);
            }
        }
    }

    // Set the entity manager reference
    setEntityManager(entityManager: EntityManager): void {
        this.entityManager = entityManager;
    }

    // Get all script instances
    getScriptInstances(): typeof this.scriptInstances {
        return this.scriptInstances;
    }
}

// Manages entities and entity-related operations
class EntityManager {
    private entities = new Map<string, Entity.I_Entity>();
    private scene: Scene;

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connectionManager: ConnectionManager,
        private scriptManager: ScriptManager,
        private assetManager: AssetManager,
    ) {
        this.scene = config.scene || new Scene(config.engine);

        // Complete the circular reference
        scriptManager.setEntityManager(this);
    }

    // Load all entities from the server, sorted by priority
    async loadEntitiesByPriority(): Promise<void> {
        try {
            const queryResponse = await this.connectionManager.sendQueryAsync<
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

            for (const entity of queryResponse.result) {
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

    // Process a group of entities with the same priority
    private async processEntityGroup(
        entities: Entity.I_Entity[],
    ): Promise<void> {
        // Store entities in our map
        for (const entity of entities) {
            this.entities.set(entity.general__entity_id, entity);
        }
    }

    // Get the scene instance
    getScene(): Scene {
        return this.scene;
    }

    // Get a specific entity by ID
    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.entities.get(entityId);
    }

    // Get all entities
    getEntities(): Map<string, Entity.I_Entity> {
        return this.entities;
    }

    // Update an entity and notify scripts
    updateEntityAndNotifyScripts(entity: Entity.I_Entity): void {
        this.entities.set(entity.general__entity_id, entity);
        this.scriptManager.notifyEntityUpdate(entity);
    }
}

// Main class that coordinates all components
export class VircadiaBabylonCore {
    private connectionManager: ConnectionManager;
    private entityManager: EntityManager;
    private scriptManager: ScriptManager;
    private assetManager: AssetManager;
    private initialized = false;

    constructor(private config: VircadiaBabylonCoreConfig) {
        // Create components in the correct order to resolve dependencies
        this.connectionManager = new ConnectionManager(config);

        // Create scene first
        const scene = config.scene || new Scene(config.engine);

        // Create asset manager
        this.assetManager = new AssetManager(this.connectionManager);

        // Create script manager with a temporary null entity manager
        this.scriptManager = new ScriptManager(
            this.connectionManager,
            scene,
            null as any, // Will be set after EntityManager is created
            this.assetManager,
        );

        // Create entity manager with all dependencies
        this.entityManager = new EntityManager(
            config,
            this.connectionManager,
            this.scriptManager,
            this.assetManager,
        );
    }

    // Initialize the system
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Connect to the server
        await this.connectionManager.connect();

        // Load initial entity data
        await this.entityManager.loadEntitiesByPriority();

        this.initialized = true;
    }

    // Check if initialized
    isInitialized(): boolean {
        return this.initialized;
    }

    // Get component references
    getConnectionManager(): ConnectionManager {
        return this.connectionManager;
    }

    getEntityManager(): EntityManager {
        return this.entityManager;
    }

    getScriptManager(): ScriptManager {
        return this.scriptManager;
    }

    getAssetManager(): AssetManager {
        return this.assetManager;
    }

    // Clean up resources
    dispose(): void {
        if (this.connectionManager) {
            this.connectionManager.disconnect();
        }
        this.initialized = false;
    }
}
