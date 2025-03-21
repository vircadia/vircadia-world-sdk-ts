import {
    type Engine,
    Scene,
    type NullEngine,
    type WebGPUEngine,
} from "@babylonjs/core";
import { log } from "../../general/log";
import {
    Communication,
    type Entity,
    type Tick,
} from "../../../schema/schema.general";

/**
 * Vircadia Client Configuration
 */
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

/**
 * Handles WebSocket connection, authentication, and message handling
 */
class VircadiaConnection {
    // Connection state
    private ws: WebSocket | null = null;
    private isConnecting = false;
    private isConnected = false;
    private reconnectTimer: number | null = null;
    private reconnectCount = 0;

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private sceneManager: VircadiaSceneManager,
    ) {}

    /**
     * Connect to the Vircadia World API server
     */
    async connect(): Promise<boolean> {
        if (this.isConnected || this.isConnecting) return this.isConnected;

        this.isConnecting = true;

        try {
            // First validate session with a REST call
            const validationResult = await this.validateSession();
            if (!validationResult.success) {
                log({
                    message: "Session validation failed:",
                    error: validationResult.error,
                    type: "error",
                    suppress: this.config.suppress,
                    debug: this.config.debug,
                });
                this.isConnecting = false;
                return false;
            }

            // Create WebSocket connection
            const wsProtocol = this.config.serverUrl.startsWith("https")
                ? "wss"
                : "ws";
            const baseUrl = this.config.serverUrl.replace(/^https?:\/\//, "");
            const wsUrl = `${wsProtocol}://${baseUrl}${Communication.WS_UPGRADE_PATH}?token=${encodeURIComponent(this.config.authToken)}&provider=${encodeURIComponent(this.config.authProvider)}`;

            this.ws = new WebSocket(wsUrl);

            // Set up event handlers
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);

            // Wait for connection to open
            return new Promise((resolve) => {
                if (!this.ws) {
                    this.isConnecting = false;
                    resolve(false);
                    return;
                }

                this.ws.onopen = () => {
                    log({
                        message: "WebSocket connection established",
                        type: "info",
                        suppress: this.config.suppress,
                        debug: this.config.debug,
                    });
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectCount = 0;

                    // Start sync group tracking
                    this.sceneManager.startSyncGroupTracking();

                    resolve(true);
                };
            });
        } catch (error) {
            log({
                message: "Connection error:",
                error,
                type: "error",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            this.isConnecting = false;
            return false;
        }
    }

    /**
     * Validate the session with the server
     */
    private async validateSession(): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            const httpProtocol = this.config.serverUrl.startsWith("https")
                ? "https"
                : "http";
            const baseUrl = this.config.serverUrl.replace(/^https?:\/\//, "");
            const validationUrl = `${httpProtocol}://${baseUrl}${Communication.REST.Endpoint.AUTH_SESSION_VALIDATE.path}`;

            const response = await fetch(validationUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: this.config.authToken,
                    provider: this.config.authProvider,
                }),
            });

            const data = await response.json();
            return {
                success: data.success === true,
                error: data.error,
            };
        } catch (error) {
            return {
                success: false,
                error: `Session validation request failed: ${error}`,
            };
        }
    }

    /**
     * Disconnect from the server
     */
    disconnect(): void {
        // Stop sync group tracking first
        this.sceneManager.stopSyncGroupTracking();

        if (this.ws) {
            // Clean up entities first
            this.sceneManager.cleanupAllEntities();

            this.ws.close(1000, "Client disconnected");
            this.ws = null;
        }

        this.isConnected = false;

        // Clear reconnect timer if active
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);

            // Directly dispatch based on message type instead of using the map
            switch (message.type) {
                case Communication.WebSocket.MessageType
                    .SYNC_GROUP_UPDATES_RESPONSE:
                    this.sceneManager.handleSyncGroupUpdates(message);
                    break;

                case Communication.WebSocket.MessageType.TICK_NOTIFICATION:
                    this.sceneManager.handleTickNotification(message);
                    break;

                case Communication.WebSocket.MessageType.QUERY_RESPONSE:
                    this.sceneManager.handleQueryResponse(message);
                    break;

                case Communication.WebSocket.MessageType.GENERAL_ERROR_RESPONSE:
                    log({
                        message: "Server error:",
                        error: message.error,
                        type: "error",
                        suppress: this.config.suppress,
                        debug: this.config.debug,
                    });
                    break;

                default:
                    log({
                        message: "Unknown message type:",
                        data: message.type,
                        type: "warn",
                        suppress: this.config.suppress,
                        debug: this.config.debug,
                    });
            }
        } catch (error) {
            log({
                message: "Failed to parse message:",
                error,
                type: "error",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
        }
    }

    /**
     * Handle WebSocket close event
     */
    private handleClose(event: CloseEvent): void {
        this.isConnected = false;
        log({
            message: `WebSocket closed: ${event.code} - ${event.reason}`,
            type: "info",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });

        // Attempt to reconnect if not a clean closure
        if (
            event.code !== 1000 &&
            this.reconnectCount < (this.config.reconnectAttempts || 5)
        ) {
            this.attemptReconnect();
        }
    }

    /**
     * Handle WebSocket error event
     */
    private handleError(event: Event): void {
        log({
            message: "WebSocket error:",
            error: event,
            type: "error",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });
    }

    /**
     * Attempt to reconnect to the server
     */
    private attemptReconnect(): void {
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
        }

        this.reconnectCount++;
        const delay = this.config.reconnectDelay || 1000;

        log({
            message: `Attempting to reconnect (${this.reconnectCount}/${this.config.reconnectAttempts}) in ${delay}ms`,
            type: "info",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });

        this.reconnectTimer = window.setTimeout(async () => {
            this.reconnectTimer = null;
            const success = await this.connect();

            if (
                !success &&
                this.reconnectCount < (this.config.reconnectAttempts || 5)
            ) {
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * Send a query to the server
     */
    // biome-ignore lint/suspicious/noExplicitAny: Need to send queries
    sendQuery(query: string, parameters: any[] = []): void {
        if (!this.isConnected || !this.ws) {
            log({
                message: "Cannot send query: not connected",
                type: "error",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return;
        }

        const message = new Communication.WebSocket.QueryRequestMessage(
            query,
            parameters,
        );
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Check if the client is connected
     */
    isClientConnected(): boolean {
        return this.isConnected;
    }
}

interface ScriptInstance {
    script_name: string;
    hooks: Entity.Script.Base.I_Context["Vircadia"]["v1"]["Hook"];
    context: Entity.Script.Babylon.I_Context;
}

interface EntityContainer {
    entityId: string;
    entityData: Entity.I_Entity;
    scripts: ScriptInstance[];
    // We don't track Babylon objects directly - scripts do that
}

/**
 * Manages the scene, entities, scripts, and assets
 */
class VircadiaSceneManager {
    private scene: Scene;
    private engine: Engine | NullEngine | WebGPUEngine;

    // Sync group and tick tracking
    private syncGroups = new Set<string>();
    private syncGroupTicks = new Map<string, Tick.I_Tick>();
    private syncGroupQueryInterval: number | null = null;
    private readonly SYNC_GROUP_QUERY_INTERVAL_MS = 30000; // 30 seconds

    // Entity management
    private entityContainers = new Map<string, EntityContainer>();

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connection: VircadiaConnection,
    ) {
        this.engine = config.engine;
        this.scene = config.scene || new Scene(this.engine);

        // Initialize the scene metadata structure
        this.scene.metadata = this.scene.metadata || {};
        this.scene.metadata.vircadia = {
            scripts: new Map(),
            assets: new Map(),
        };
    }

    /**
     * Handle sync group updates from the server
     */
    public handleSyncGroupUpdates(
        message: Communication.WebSocket.SyncGroupUpdatesNotificationMessage,
    ): void {
        // First process script updates as entities may need them
        if (message.scripts && message.scripts.length > 0) {
            this.processScriptUpdates(message.scripts);
        }

        // Then process asset updates
        if (message.assets && message.assets.length > 0) {
            this.processAssetUpdates(message.assets);
        }

        // Finally process entity updates
        if (message.entities && message.entities.length > 0) {
            this.processEntityUpdates(message.entities);
        }
    }

    /**
     * Handle tick notifications
     */
    public handleTickNotification(message: any): void {
        // Implementation for tick notifications
    }

    /**
     * Handle query responses
     */
    public handleQueryResponse(message: any): void {
        // Implementation for query responses
    }

    /**
     * Process script updates from the server
     */
    private processScriptUpdates(
        updates: Array<Communication.WebSocket.ScriptUpdateMessage>,
    ): void {
        for (const update of updates) {
            const { general__script_file_name, operation, changes } = update;

            if (operation === "DELETE") {
                this.scene.metadata.vircadia.scripts.delete(
                    general__script_file_name,
                );
                continue;
            }

            let script = this.scene.metadata.vircadia.scripts.get(
                general__script_file_name,
            );
            if (!script && operation === "INSERT") {
                script = changes as Entity.Script.I_Script;
                this.scene.metadata.vircadia.scripts.set(
                    general__script_file_name,
                    script,
                );
            } else if (script && operation === "UPDATE") {
                Object.assign(script, changes);
            }
        }
    }

    /**
     * Process asset updates from the server
     */
    private processAssetUpdates(
        updates: Array<Communication.WebSocket.AssetUpdateMessage>,
    ): void {
        for (const update of updates) {
            const { general__asset_file_name, operation, changes } = update;

            if (operation === "DELETE") {
                this.scene.metadata.vircadia.assets.delete(
                    general__asset_file_name,
                );
                continue;
            }

            let asset = this.scene.metadata.vircadia.assets.get(
                general__asset_file_name,
            );
            if (!asset && operation === "INSERT") {
                asset = changes as Entity.Asset.I_Asset;
                this.scene.metadata.vircadia.assets.set(
                    general__asset_file_name,
                    asset,
                );
            } else if (asset && operation === "UPDATE") {
                Object.assign(asset, changes);
            }
        }
    }

    /**
     * Process entity updates from the server
     */
    private async processEntityUpdates(
        updates: Array<Communication.WebSocket.EntityUpdateMessage>,
    ): Promise<void> {
        for (const update of updates) {
            const { general__entity_id, operation, changes } = update;

            // Handle entity deletion
            if (operation === "DELETE") {
                await this.unmountEntity(general__entity_id);
                this.entityContainers.delete(general__entity_id);
                continue;
            }

            // Handle entity creation
            if (
                !this.entityContainers.has(general__entity_id) &&
                operation === "INSERT"
            ) {
                const entity = changes as Entity.I_Entity;
                await this.mountEntity(entity);
                continue;
            }

            // Handle entity update
            if (
                this.entityContainers.has(general__entity_id) &&
                operation === "UPDATE"
            ) {
                const container = this.entityContainers.get(general__entity_id);
                if (!container) continue;

                const previousData = container.entityData;
                const updatedData = { ...previousData, ...changes };
                container.entityData = updatedData as Entity.I_Entity;

                // Notify scripts of update
                for (const script of container.scripts) {
                    try {
                        script.hooks.onEntityUpdate?.(updatedData);
                    } catch (error) {
                        // Log error
                    }
                }
            }
        }
    }

    /**
     * Load a script for an entity
     */
    private async loadScriptForEntity(
        scriptName: string,
        entityId: string,
    ): Promise<boolean> {
        const script = this.scene.metadata.vircadia.scripts.get(scriptName);
        if (!script) {
            log({
                message: `Script ${scriptName} not found for entity ${entityId}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        const entityMesh = this.scene.getMeshByName(entityId);
        if (!entityMesh || !entityMesh.metadata) {
            log({
                message: `Entity ${entityId} not found when loading script ${scriptName}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        // Get script content - prefer browser script
        const scriptContent = script.script__compiled__data || "";
        if (!scriptContent) {
            log({
                message: `No browser script content for ${scriptName}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        try {
            // Create context for the script
            const context: Entity.Script.Babylon.I_Context = {
                entity: entityMesh.metadata.entityData,
                scene: this.scene,
                engine: this.engine,
                scriptId: scriptName,
                entityId,
            };

            // Execute the script
            const hooks = await this.executeScript(scriptContent, context);

            // Store the loaded script
            entityMesh.metadata.scripts.push({
                scriptName,
                scriptContent,
                hooks,
                context,
            });

            return true;
        } catch (error) {
            log({
                message: `Error loading script ${scriptName} for entity ${entityId}:`,
                error,
                type: "error",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }
    }

    /**
     * Execute a script and extract its hooks
     */
    private async executeScript(
        script: string,
        context: Entity.Script.Babylon.I_Context,
    ): Promise<Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"]> {
        // Create a wrapped script that will execute in the context provided
        const wrappedScript = `
        return (function(context) {
          with (context) {
            ${script}
          }
          return Vircadia.v1.EntityHooks || {};
        });
      `;

        try {
            // Create a function from the wrapped script
            const scriptFunction = new Function(wrappedScript)();
            if (typeof scriptFunction !== "function") {
                throw new Error(
                    "Failed to create a valid function from the script",
                );
            }

            // Execute the script to get hooks
            const hooks = await scriptFunction(context);

            return hooks as Entity.Script.Babylon.I_Context["Vircadia"]["v1"]["Hook"];
        } catch (error) {
            log({
                message: "Error executing script:",
                error,
                type: "error",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            throw error;
        }
    }

    /**
     * Mount an entity by calling onBeforeEntityMount on all its scripts
     */
    private async mountEntity(entity: Entity.I_Entity): Promise<void> {
        const container: EntityContainer = {
            entityId: entity.general__entity_id,
            entityData: entity,
            scripts: [],
        };

        this.entityContainers.set(entity.general__entity_id, container);

        // Load scripts
        if (entity.script__names && entity.script__names.length > 0) {
            for (const scriptName of entity.script__names) {
                await this.loadScriptForEntity(
                    scriptName,
                    entity.general__entity_id,
                );
            }
        }

        // Initialize scripts after all are loaded
        for (const script of container.scripts) {
            try {
                await Promise.resolve(
                    script.hooks.onScriptInitialize?.(entity, this.scene),
                );
            } catch (error) {
                // Log error
            }
        }
    }

    /**
     * Unmount an entity by calling onScriptTeardown on all its scripts
     */
    private async unmountEntity(entityId: string): Promise<void> {
        const container = this.entityContainers.get(entityId);
        if (!container) return;

        // Call teardown on all scripts in reverse order
        for (let i = container.scripts.length - 1; i >= 0; i--) {
            try {
                await Promise.resolve(
                    container.scripts[i].hooks.onScriptTeardown?.(),
                );
            } catch (error) {
                // Log error
            }
        }
    }

    /**
     * Clean up all entities and their scripts
     */
    cleanupAllEntities(): void {
        // Find all entity meshes
        const entityMeshes = this.scene.meshes.filter(
            (mesh) => mesh.metadata?.entityData,
        );

        // Call cleanup on each entity
        for (const mesh of entityMeshes) {
            this.cleanupEntity(mesh.name);
        }
    }

    /**
     * Clean up a specific entity
     */
    private cleanupEntity(entityId: string): void {
        const entityMesh = this.scene.getMeshByName(entityId);
        if (!entityMesh || !entityMesh.metadata) return;

        // Call onEntityBeforeUnmount on all scripts in reverse order
        for (let i = entityMesh.metadata.scripts.length - 1; i >= 0; i--) {
            try {
                entityMesh.metadata.scripts[i].hooks.onEntityBeforeUnmount?.();
            } catch (error) {
                log({
                    message: `Error executing onEntityBeforeUnmount for entity ${entityId}:`,
                    error,
                    type: "error",
                    suppress: this.config.suppress,
                    debug: this.config.debug,
                });
            }
        }

        // Remove the mesh from the scene
        entityMesh.dispose();
    }

    /**
     * Start tracking sync groups
     * Queries the database for sync groups at regular intervals
     */
    startSyncGroupTracking(): void {
        // Clear existing interval if any
        if (this.syncGroupQueryInterval !== null) {
            window.clearInterval(this.syncGroupQueryInterval);
        }

        // Initial query
        this.querySyncGroups();

        // Set up interval for regular queries
        this.syncGroupQueryInterval = window.setInterval(() => {
            this.querySyncGroups();
        }, this.SYNC_GROUP_QUERY_INTERVAL_MS);
    }

    /**
     * Stop tracking sync groups
     */
    stopSyncGroupTracking(): void {
        if (this.syncGroupQueryInterval !== null) {
            window.clearInterval(this.syncGroupQueryInterval);
            this.syncGroupQueryInterval = null;
        }

        this.syncGroups.clear();
        this.syncGroupTicks.clear();
    }

    /**
     * Query the database for sync groups the current session has access to
     */
    private querySyncGroups(): void {
        const query = `
            SELECT group__sync
            FROM auth.active_sync_group_sessions
            WHERE general__session_id = $1
        `;
        this.connection.sendQuery(query, [this.config.authToken]);
    }

    /**
     * Get all entities
     */
    getEntities(): Map<string, Entity.I_Entity> {
        const result = new Map<string, Entity.I_Entity>();

        for (const mesh of this.scene.meshes) {
            if (mesh.metadata?.entityData) {
                result.set(mesh.name, mesh.metadata.entityData);
            }
        }

        return result;
    }

    /**
     * Get a specific entity by ID
     */
    getEntity(entityId: string): Entity.I_Entity | undefined {
        const mesh = this.scene.getMeshByName(entityId);
        return mesh?.metadata?.entityData;
    }

    /**
     * Get the BabylonJS scene
     */
    getScene(): Scene {
        return this.scene;
    }

    /**
     * Get the BabylonJS engine
     */
    getEngine(): Engine | NullEngine | WebGPUEngine {
        return this.engine;
    }
}

/**
 * A lightweight client for connecting to the Vircadia World API server
 * and managing entity scripts in a BabylonJS scene.
 */
export class VircadiaBabylonCore {
    private connection: VircadiaConnection;
    private sceneManager: VircadiaSceneManager;
    private autoConnectTimer: number | null = null;

    /**
     * Creates a new Vircadia Babylon Client
     */
    constructor(private config: VircadiaBabylonCoreConfig) {
        // Set default config values
        this.config = {
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            debug: false,
            suppress: false,
            ...config,
        };

        // Initialize manager classes with circular references
        // This is a bit tricky but allows them to interact properly
        this.sceneManager = new VircadiaSceneManager(this.config, null as any);
        this.connection = new VircadiaConnection(
            this.config,
            this.sceneManager,
        );

        // Now properly set the connection reference in the scene manager
        Object.defineProperty(this.sceneManager, "connection", {
            value: this.connection,
        });

        log({
            message: "Vircadia Babylon Client initialized",
            type: "info",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });

        // Automatically initiate connection after initialization
        this.ensureConnected();
    }

    /**
     * Ensures the client is connected, attempting connection if necessary
     * This is called automatically by the constructor and when needed
     * @returns Promise that resolves to connection state
     */
    private async ensureConnected(): Promise<boolean> {
        // If we're already connected, just return true
        if (this.connection.isClientConnected()) {
            return true;
        }

        try {
            // Attempt to connect
            return await this.connection.connect();
        } catch (error) {
            log({
                message: "Auto-connection failed, will retry:",
                error,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });

            // Schedule retry
            if (this.autoConnectTimer === null) {
                this.autoConnectTimer = window.setTimeout(() => {
                    this.autoConnectTimer = null;
                    this.ensureConnected();
                }, this.config.reconnectDelay || 1000);
            }

            return false;
        }
    }

    /**
     * Explicitly disconnect from the server
     * Use this only when you want to completely stop all connection attempts
     */
    disconnect(): void {
        // Clear any pending reconnection attempt
        if (this.autoConnectTimer !== null) {
            window.clearTimeout(this.autoConnectTimer);
            this.autoConnectTimer = null;
        }

        this.connection.disconnect();
    }

    /**
     * Send a query to the server
     * Automatically attempts to connect if not already connected
     */
    // biome-ignore lint/suspicious/noExplicitAny: Need to send queries
    async sendQuery(query: string, parameters: any[] = []): Promise<void> {
        // Ensure we're connected before sending
        if (!this.connection.isClientConnected()) {
            await this.ensureConnected();
        }

        this.connection.sendQuery(query, parameters);
    }

    /**
     * Get all entities
     */
    getEntities(): Map<string, Entity.I_Entity> {
        return this.sceneManager.getEntities();
    }

    /**
     * Get a specific entity by ID
     */
    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.sceneManager.getEntity(entityId);
    }

    /**
     * Get the BabylonJS scene
     */
    getScene(): Scene {
        return this.sceneManager.getScene();
    }

    /**
     * Get the BabylonJS engine
     */
    getEngine(): Engine | NullEngine | WebGPUEngine {
        return this.sceneManager.getEngine();
    }

    /**
     * Check if the client is connected
     */
    isClientConnected(): boolean {
        return this.connection.isClientConnected();
    }
}
