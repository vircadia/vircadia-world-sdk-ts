import { Communication, Entity } from "../../../schema/schema.general";
import type { Babylon } from "../../../schema/schema.babylon.script";

import babylonPackageJson from "@babylonjs/core/package.json";
import vircadiaSdkTsPackageJson from "../../../package.json";
import { log } from "../../general/log";
import type { Scene } from "@babylonjs/core";

// Error interface with originalMessage property
interface ErrorWithOriginalMessage extends Error {
    originalMessage: Communication.WebSocket.Message;
}

export interface VircadiaBabylonCoreConfig {
    // Connection settings
    serverUrl: string;
    authToken: string;
    authProvider: string;

    scene: Scene;

    // Reconnection settings
    reconnectAttempts?: number;
    reconnectDelay?: number;

    // Debug settings
    debug?: boolean;
    suppress?: boolean;
}

// Script Helper Functions - Vue-inspired Composition API
export function createVircadiaScript(
    setupFn: Babylon.ScriptSetupFunction,
): Babylon.VircadiaScriptFunction {
    return (context: Babylon.I_Context): Babylon.ScriptReturn => {
        // Create hooks container
        const hooks: Babylon.I_Hooks = {};

        // Ensure Babylon context exists
        if (!context.Babylon) {
            context.Babylon = {
                Version: babylonPackageJson.version,
                Scene: null as unknown as Scene, // Will be properly set by caller
            };
        }

        // Create the composable API using the new pattern
        const api: Babylon.ScriptAPI = {
            // Full context access
            context,

            // Direct access to hooks for registration
            hooks,

            // Method chaining support for fluent API
            register: (hookUpdates: Partial<Babylon.I_Hooks>) => {
                // Apply hook updates to the hooks object
                Object.assign(hooks, hookUpdates);
                return api;
            },
        };

        // Run the setup function to register hooks
        setupFn(api);

        // Return the expected format
        return { hooks };
    };
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

                request.resolve(message);
            }
        } catch (error) {
            log({
                message: "Error handling WebSocket message:",
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
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

        log({
            message: "WebSocket error:",
            type: "error",
            error: errorMessage,
            debug: this.config.debug,
            suppress: this.config.suppress,
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectTimer !== null) return;

        const maxAttempts = this.config.reconnectAttempts ?? 5;
        const delay = this.config.reconnectDelay ?? 5000;

        if (this.reconnectCount >= maxAttempts) {
            log({
                message: "Max reconnection attempts reached",
                type: "error",
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
            return;
        }

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectCount++;

            try {
                await this.connect();
            } catch (error) {
                log({
                    message: "Reconnection attempt failed:",
                    type: "error",
                    error,
                    debug: this.config.debug,
                    suppress: this.config.suppress,
                });
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

        // Convert the base64 string back to ArrayBuffer
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
            hooks: Babylon.I_Hooks;
            context: Babylon.I_Context;
            entityId?: string;
            assets?: Entity.Asset.I_Asset[];
        }
    >();
    private currentPlatform: Entity.Script.E_ScriptType;

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connectionManager: ConnectionManager,
        private scene: Scene,
        private entityManager: EntityManager,
        private assetManager: AssetManager,
    ) {
        // Determine the current platform
        this.currentPlatform = this.detectPlatform();
    }

    // Detect the current platform
    public detectPlatform(): Entity.Script.E_ScriptType {
        if (
            typeof process !== "undefined" &&
            process.versions &&
            process.versions.bun
        ) {
            return Entity.Script.E_ScriptType.BABYLON_BUN;
        }
        if (
            typeof process !== "undefined" &&
            process.versions &&
            process.versions.node
        ) {
            return Entity.Script.E_ScriptType.BABYLON_NODE;
        }
        return Entity.Script.E_ScriptType.BABYLON_BROWSER;
    }

    // Load a script from the server, filtered by platform
    async loadScript(scriptName: string): Promise<Entity.Script.I_Script> {
        // First check if any variants of this script exist
        const allVariantsResponse = await this.connectionManager.sendQueryAsync<
            Entity.Script.I_Script[]
        >(
            "SELECT DISTINCT script__platform FROM entity.entity_scripts WHERE general__script_file_name = $1",
            [scriptName],
        );

        if (!allVariantsResponse.result.length) {
            throw new Error(`Script ${scriptName} not found in any platform`);
        }

        // Then try to get the specific platform version
        const queryResponse = await this.connectionManager.sendQueryAsync<
            Entity.Script.I_Script[]
        >(
            "SELECT * FROM entity.entity_scripts WHERE general__script_file_name = $1 AND script__platform = $2",
            [scriptName, this.currentPlatform],
        );

        if (!queryResponse.result.length) {
            const availablePlatforms = allVariantsResponse.result
                .map((r) => r.script__platform)
                .join(", ");

            throw new Error(
                `Script ${scriptName} not available for platform ${this.currentPlatform}. ` +
                    `Available platforms: ${availablePlatforms}`,
            );
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
        try {
            // Create script context with the simplified flat structure
            const context: Babylon.I_Context = {
                Vircadia: {
                    // Top-level version identifier
                    Version: vircadiaSdkTsPackageJson.version,
                    Debug: this.config.debug ?? false,
                    Suppress: this.config.suppress ?? false,

                    // Core APIs with flat structure
                    Query: {
                        execute: this.connectionManager.sendQueryAsync.bind(
                            this.connectionManager,
                        ),
                    },

                    // Script management
                    Script: {
                        reload: async () => {
                            await this.reloadScript(
                                script.general__script_file_name,
                            );
                        },
                    },
                },
                Babylon: {
                    Version: babylonPackageJson.version,
                    Scene: this.scene,
                },
            };

            // Execute script with enhanced support for the script definition utility
            try {
                const funcBody =
                    script.script__compiled__data ||
                    script.script__source__data;

                // Store script name outside the function scope
                const scriptName = script.general__script_file_name;

                // Execute with the createVircadiaScript helper available
                const scriptFunc = new Function(
                    "context",
                    "createVircadiaScript",
                    `
                    try {
                        ${funcBody}
                        
                        // Look for vircadiaScriptMain function first (our preferred name)
                        if (typeof vircadiaScriptMain === 'function') {
                            return vircadiaScriptMain(context);
                        }
                        
                        // Fall back to main for compatibility
                        if (typeof main === 'function') {
                            return main(context);
                        }
                        
                        // If neither function exists, throw error
                        throw new Error("Script must define either vircadiaScriptMain or main function");
                    } catch (err) {
                        err.message = \`Script execution error in ${scriptName}: \${err.message}\`;
                        throw err;
                    }
                    `,
                );

                // Execute the script with appropriate parameters
                const instance = scriptFunc(
                    context,
                    createVircadiaScript,
                ) as Babylon.ScriptReturn;

                // Validate returned structure
                if (
                    !instance ||
                    typeof instance !== "object" ||
                    !instance.hooks
                ) {
                    throw new Error(
                        `Script ${script.general__script_file_name} did not return a valid ScriptReturn object`,
                    );
                }

                // Store the instance with its hooks
                this.scriptInstances.set(script.general__script_file_name, {
                    script,
                    hooks: instance.hooks,
                    context,
                    entityId: entity.general__entity_id,
                    assets,
                });

                // Initialize script
                if (instance.hooks.onScriptInitialize) {
                    await instance.hooks.onScriptInitialize(entity, assets);
                }
            } catch (error) {
                log({
                    message: `Error executing script code ${script.general__script_file_name}:`,
                    type: "error",
                    error,
                    debug: this.config.debug,
                    suppress: this.config.suppress,
                });
                throw error;
            }
        } catch (error) {
            log({
                message: `Error executing script ${script.general__script_file_name}:`,
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
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
                    log({
                        message: `Could not reload script ${scriptName}: Entity or assets not found`,
                        type: "warn",
                        debug: this.config.debug,
                        suppress: this.config.suppress,
                    });
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
        this.scene = config.scene;

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
            log({
                message: "Failed to load entities:",
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
            throw error;
        }
    }

    // Process a group of entities with the same priority
    private async processEntityGroup(
        entities: Entity.I_Entity[],
    ): Promise<void> {
        // Store entities in our map and process their scripts
        for (const entity of entities) {
            this.entities.set(entity.general__entity_id, entity);

            // Load and execute any scripts associated with this entity
            if (entity.script__names && entity.script__names.length > 0) {
                try {
                    // First, check which scripts are available for our platform
                    const availableScripts =
                        await this.connectionManager.sendQueryAsync<
                            Pick<
                                Entity.Script.I_Script,
                                "general__script_file_name"
                            >[]
                        >(
                            "SELECT DISTINCT general__script_file_name FROM entity.entity_scripts WHERE general__script_file_name = ANY($1) AND script__platform = $2",
                            [
                                entity.script__names,
                                this.scriptManager.detectPlatform(),
                            ],
                        );

                    // Load assets required by the entity
                    const assets: Entity.Asset.I_Asset[] = [];
                    if (entity.asset__names && entity.asset__names.length > 0) {
                        for (const assetName of entity.asset__names) {
                            try {
                                // Try to get already loaded asset first
                                let asset =
                                    this.assetManager.getAsset(assetName);

                                // If not loaded yet, load it from server
                                if (!asset) {
                                    asset =
                                        await this.assetManager.loadAsset(
                                            assetName,
                                        );
                                }

                                assets.push(asset);
                            } catch (error) {
                                log({
                                    message: `Error loading asset ${assetName} for entity ${entity.general__entity_id}:`,
                                    type: "error",
                                    error,
                                    debug: this.config.debug,
                                    suppress: this.config.suppress,
                                });
                            }
                        }
                    }

                    // Only process scripts that are available for our platform
                    for (const {
                        general__script_file_name,
                    } of availableScripts.result) {
                        // Load the script if not already loaded
                        const script = await this.scriptManager.loadScript(
                            general__script_file_name,
                        );

                        // Execute the script for this entity with the loaded assets
                        await this.scriptManager.executeScript(
                            script,
                            entity,
                            assets,
                        );
                    }

                    // Log any scripts that were skipped due to platform incompatibility
                    const skippedScripts = entity.script__names.filter(
                        (name) =>
                            !availableScripts.result.some(
                                (s) => s.general__script_file_name === name,
                            ),
                    );
                    if (skippedScripts.length > 0) {
                        log({
                            message: `Skipped incompatible scripts for entity ${entity.general__entity_id}: ${skippedScripts.join(", ")}`,
                            type: "debug",
                            debug: this.config.debug,
                            suppress: this.config.suppress,
                        });
                    }
                } catch (error) {
                    log({
                        message: `Error loading scripts for entity ${entity.general__entity_id}:`,
                        type: "error",
                        error,
                        debug: this.config.debug,
                        suppress: this.config.suppress,
                    });
                }
            }
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
        const scene = config.scene;

        // Create asset manager
        this.assetManager = new AssetManager(this.connectionManager);

        // Create script manager with a temporary null entity manager
        this.scriptManager = new ScriptManager(
            config,
            this.connectionManager,
            scene,
            null as unknown as EntityManager, // Will be set after EntityManager is created
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
