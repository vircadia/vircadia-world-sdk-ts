import {
    type Engine,
    Scene,
    Vector3,
    Mesh,
    Observable,
    Color3,
    HemisphericLight,
    ArcRotateCamera,
} from "@babylonjs/core";
import { log } from "../general/log";
import {
    Communication,
    type Entity,
    type Config,
    Tick,
} from "../../schema/schema.general";

/**
 * Vircadia Client Configuration
 */
export interface VircadiaBabylonClientConfig {
    // Connection settings
    serverUrl: string;
    authToken: string;
    authProvider: string;
    syncGroup: string;

    // Engine/Scene settings
    engine: Engine;
    scene?: Scene;

    // Reconnection settings
    reconnectAttempts?: number;
    reconnectDelay?: number;

    // Debug settings
    debug?: boolean;
    suppress?: boolean;
}

/**
 * Namespaced API for scripts to use
 */
export namespace Vircadia {
    export namespace v1 {
        /**
         * Entity lifecycle hooks that scripts can implement
         */
        export interface EntityHooks {
            onBeforeEntityMount?: (entity: Entity.I_Entity) => void;
            onEntityUpdate?: (
                entity: Entity.I_Entity,
                oldEntity?: Entity.I_Entity,
            ) => void;
            onEntityBeforeUnmount?: () => void;
        }

        /**
         * Context provided to scripts
         */
        export interface ScriptContext {
            entity: Entity.I_Entity;
            scene: Scene;
            engine: Engine;
            scriptId: string;
            entityId: string;
            // Add more utilities/helpers here
        }
    }
}

/**
 * Internal representation of a loaded entity script
 */
interface LoadedScript {
    scriptId: string;
    scriptContent: string;
    hooks: Vircadia.v1.EntityHooks;
    context: Vircadia.v1.ScriptContext;
}

/**
 * Internal representation of an entity with its associated scripts
 */
interface ManagedEntity {
    entity: Entity.I_Entity;
    scripts: LoadedScript[];
}

/**
 * A lightweight client for connecting to the Vircadia World API
 * and managing entity scripts in a BabylonJS scene.
 */
export class VircadiaBabylonClient {
    // Core properties
    private ws: WebSocket | null = null;
    private scene: Scene;
    private engine: Engine;

    // State tracking
    private entities = new Map<string, ManagedEntity>();
    private scripts = new Map<string, Entity.Script.I_Script>();
    private assets = new Map<string, Entity.Asset.I_Asset>();

    // Connection state
    private isConnecting = false;
    private isConnected = false;
    private reconnectTimer: number | null = null;
    private reconnectCount = 0;

    // Observables
    public readonly onConnectedObservable = new Observable<void>();
    public readonly onDisconnectedObservable = new Observable<string>();
    public readonly onErrorObservable = new Observable<string>();
    public readonly onEntityAddedObservable = new Observable<Entity.I_Entity>();
    public readonly onEntityUpdatedObservable =
        new Observable<Entity.I_Entity>();
    public readonly onEntityRemovedObservable = new Observable<string>();

    /**
     * Creates a new Vircadia Babylon Client
     */
    constructor(private config: VircadiaBabylonClientConfig) {
        // Set default config values
        this.config = {
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            debug: false,
            suppress: false,
            ...config,
        };

        this.engine = config.engine;

        // Use provided scene or create a new one
        if (config.scene) {
            this.scene = config.scene;
        } else {
            this.scene = new Scene(this.engine);
            this.setupBasicScene();
        }

        log({
            message: "Vircadia Babylon Client initialized",
            type: "info",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });
    }

    /**
     * Sets up a basic scene with camera and lighting
     * Only used if no scene was provided
     */
    private setupBasicScene(): void {
        // Create a camera
        const camera = new ArcRotateCamera(
            "vircadiaDefaultCamera",
            -Math.PI / 2,
            Math.PI / 3,
            10,
            Vector3.Zero(),
            this.scene,
        );

        // Create a light
        const light = new HemisphericLight(
            "vircadiaDefaultLight",
            new Vector3(0, 1, 0),
            this.scene,
        );
        light.intensity = 0.7;
    }

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
                this.onErrorObservable.notifyObservers(
                    `Session validation failed: ${validationResult.error}`,
                );
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
                    this.onConnectedObservable.notifyObservers();
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
            this.onErrorObservable.notifyObservers(
                `Connection error: ${error}`,
            );
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
        if (this.ws) {
            // Clean up entities first
            this.cleanupAllEntities();

            this.ws.close(1000, "Client disconnected");
            this.ws = null;
        }

        this.isConnected = false;

        // Clear reconnect timer if active
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.onDisconnectedObservable.notifyObservers("Client disconnected");
    }

    /**
     * Clean up all entities and their scripts
     */
    private cleanupAllEntities(): void {
        // Call onEntityBeforeUnmount for all entities
        for (const [entityId, managedEntity] of this.entities) {
            this.cleanupEntity(entityId);
        }

        // Clear entity tracking
        this.entities.clear();
    }

    /**
     * Clean up a specific entity
     */
    private cleanupEntity(entityId: string): void {
        const managedEntity = this.entities.get(entityId);
        if (!managedEntity) return;

        // Call onEntityBeforeUnmount on all scripts in reverse order
        for (let i = managedEntity.scripts.length - 1; i >= 0; i--) {
            try {
                managedEntity.scripts[i].hooks.onEntityBeforeUnmount?.();
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

        this.entities.delete(entityId);
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);

            // Handle different message types
            switch (message.type) {
                case Communication.WebSocket.MessageType
                    .SYNC_GROUP_UPDATES_RESPONSE:
                    this.handleSyncGroupUpdates(message);
                    break;

                case Communication.WebSocket.MessageType.QUERY_RESPONSE:
                    // Could handle query responses if needed
                    break;

                case Communication.WebSocket.MessageType.GENERAL_ERROR_RESPONSE:
                    log({
                        message: "Server error:",
                        error: message.error,
                        type: "error",
                        suppress: this.config.suppress,
                        debug: this.config.debug,
                    });
                    this.onErrorObservable.notifyObservers(message.error);
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
        } else {
            this.onDisconnectedObservable.notifyObservers(
                event.reason || "Connection closed",
            );
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
        this.onErrorObservable.notifyObservers("WebSocket error occurred");
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
     * Handle sync group updates from the server
     */
    private handleSyncGroupUpdates(
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
     * Process script updates from the server
     */
    private processScriptUpdates(
        updates: Array<{
            scriptId: string;
            operation: Config.E_OperationType;
            changes: any;
            error?: string | null;
        }>,
    ): void {
        for (const update of updates) {
            const { scriptId, operation, changes } = update;

            if (operation === "DELETE") {
                this.scripts.delete(scriptId);
                continue;
            }

            let script = this.scripts.get(scriptId);
            if (!script && operation === "INSERT") {
                script = changes as Entity.Script.I_Script;
                this.scripts.set(scriptId, script);
            } else if (script && operation === "UPDATE") {
                Object.assign(script, changes);
            }
        }
    }

    /**
     * Process asset updates from the server
     */
    private processAssetUpdates(
        updates: Array<{
            assetId: string;
            operation: Config.E_OperationType;
            changes: any;
            error?: string | null;
        }>,
    ): void {
        for (const update of updates) {
            const { assetId, operation, changes } = update;

            if (operation === "DELETE") {
                this.assets.delete(assetId);
                continue;
            }

            let asset = this.assets.get(assetId);
            if (!asset && operation === "INSERT") {
                asset = changes as Entity.Asset.I_Asset;
                this.assets.set(assetId, asset);
            } else if (asset && operation === "UPDATE") {
                Object.assign(asset, changes);
            }
        }
    }

    /**
     * Process entity updates from the server
     */
    private processEntityUpdates(
        updates: Array<{
            entityId: string;
            operation: Config.E_OperationType;
            changes: any;
            error?: string | null;
        }>,
    ): void {
        for (const update of updates) {
            const { entityId, operation, changes } = update;

            // Handle entity deletion
            if (operation === "DELETE") {
                this.cleanupEntity(entityId);
                this.onEntityRemovedObservable.notifyObservers(entityId);
                continue;
            }

            const existingEntity = this.entities.get(entityId);

            // Handle entity creation
            if (!existingEntity && operation === "INSERT") {
                const entity = changes as Entity.I_Entity;
                this.createEntity(entity);
                this.onEntityAddedObservable.notifyObservers(entity);
                continue;
            }

            // Handle entity update
            if (existingEntity && operation === "UPDATE") {
                const updatedEntity = { ...existingEntity.entity, ...changes };
                this.updateEntity(
                    entityId,
                    updatedEntity,
                    existingEntity.entity,
                );
                this.onEntityUpdatedObservable.notifyObservers(updatedEntity);
            }
        }
    }

    /**
     * Create a new entity and load its scripts
     */
    private async createEntity(entity: Entity.I_Entity): Promise<void> {
        log({
            message: `Creating entity: ${entity.general__entity_name} (${entity.general__entity_id})`,
            type: "info",
            suppress: this.config.suppress,
            debug: this.config.debug,
        });

        const managedEntity: ManagedEntity = {
            entity,
            scripts: [],
        };

        // Store the entity first
        this.entities.set(entity.general__entity_id, managedEntity);

        // Load scripts for this entity
        if (entity.scripts__ids && entity.scripts__ids.length > 0) {
            for (const scriptId of entity.scripts__ids) {
                await this.loadScriptForEntity(
                    scriptId,
                    entity.general__entity_id,
                );
            }
        }

        // Now that scripts are loaded, mount the entity
        await this.mountEntity(entity.general__entity_id);
    }

    /**
     * Load a script for an entity
     */
    private async loadScriptForEntity(
        scriptId: string,
        entityId: string,
    ): Promise<boolean> {
        const script = this.scripts.get(scriptId);
        if (!script) {
            log({
                message: `Script ${scriptId} not found for entity ${entityId}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        const managedEntity = this.entities.get(entityId);
        if (!managedEntity) {
            log({
                message: `Entity ${entityId} not found when loading script ${scriptId}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        // Get script content - prefer browser script
        const scriptContent = script.compiled__browser__script || "";
        if (!scriptContent) {
            log({
                message: `No browser script content for ${scriptId}`,
                type: "warn",
                suppress: this.config.suppress,
                debug: this.config.debug,
            });
            return false;
        }

        try {
            // Create context for the script
            const context: Vircadia.v1.ScriptContext = {
                entity: managedEntity.entity,
                scene: this.scene,
                engine: this.engine,
                scriptId,
                entityId,
            };

            // Execute the script
            const hooks = await this.executeScript(scriptContent, context);

            // Store the loaded script
            managedEntity.scripts.push({
                scriptId,
                scriptContent,
                hooks,
                context,
            });

            return true;
        } catch (error) {
            log({
                message: `Error loading script ${scriptId} for entity ${entityId}:`,
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
        context: Vircadia.v1.ScriptContext,
    ): Promise<Vircadia.v1.EntityHooks> {
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

            return hooks as Vircadia.v1.EntityHooks;
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
    private async mountEntity(entityId: string): Promise<void> {
        const managedEntity = this.entities.get(entityId);
        if (!managedEntity) return;

        // Call onBeforeEntityMount on all scripts in order
        for (const script of managedEntity.scripts) {
            try {
                await Promise.resolve(
                    script.hooks.onBeforeEntityMount?.(managedEntity.entity),
                );
            } catch (error) {
                log({
                    message: `Error executing onBeforeEntityMount for entity ${entityId}:`,
                    error,
                    type: "error",
                    suppress: this.config.suppress,
                    debug: this.config.debug,
                });
            }
        }
    }

    /**
     * Update an entity and notify its scripts
     */
    private async updateEntity(
        entityId: string,
        updatedEntity: Entity.I_Entity,
        previousEntity: Entity.I_Entity,
    ): Promise<void> {
        const managedEntity = this.entities.get(entityId);
        if (!managedEntity) return;

        // Update the stored entity
        managedEntity.entity = updatedEntity;

        // Call onEntityUpdate on all scripts
        for (const script of managedEntity.scripts) {
            try {
                // Update the context with the new entity
                script.context.entity = updatedEntity;

                // Call the hook
                await Promise.resolve(
                    script.hooks.onEntityUpdate?.(
                        updatedEntity,
                        previousEntity,
                    ),
                );
            } catch (error) {
                log({
                    message: `Error executing onEntityUpdate for entity ${entityId}:`,
                    error,
                    type: "error",
                    suppress: this.config.suppress,
                    debug: this.config.debug,
                });
            }
        }
    }

    /**
     * Send a query to the server
     */
    sendQuery(query: string, parameters: any[] = []): void {
        if (!this.isConnected || !this.ws) {
            this.onErrorObservable.notifyObservers(
                "Cannot send query: not connected",
            );
            return;
        }

        const message = new Communication.WebSocket.QueryRequestMessage(
            query,
            parameters,
        );
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Get all entities
     */
    getEntities(): Map<string, Entity.I_Entity> {
        const result = new Map<string, Entity.I_Entity>();
        for (const [entityId, managedEntity] of this.entities) {
            result.set(entityId, managedEntity.entity);
        }
        return result;
    }

    /**
     * Get a specific entity by ID
     */
    getEntity(entityId: string): Entity.I_Entity | undefined {
        return this.entities.get(entityId)?.entity;
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
    getEngine(): Engine {
        return this.engine;
    }

    /**
     * Check if the client is connected
     */
    isClientConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Clean up resources when the client is no longer needed
     * Note: This doesn't dispose the engine or scene as they were provided externally
     */
    dispose(): void {
        // Disconnect from server
        this.disconnect();

        // Clear all data
        this.scripts.clear();
        this.assets.clear();

        // Clear all observables
        this.onConnectedObservable.clear();
        this.onDisconnectedObservable.clear();
        this.onErrorObservable.clear();
        this.onEntityAddedObservable.clear();
        this.onEntityUpdatedObservable.clear();
        this.onEntityRemovedObservable.clear();
    }
}
