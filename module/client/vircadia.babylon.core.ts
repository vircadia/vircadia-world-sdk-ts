import { Communication, Entity } from "../../schema/schema.general";

import babylonPackageJson from "@babylonjs/core/package.json";
import vircadiaSdkTsPackageJson from "../../package.json";
import { log } from "../general/log";
import type { Scene } from "@babylonjs/core";
// import "@babylonjs/loaders";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

// Extend the Entity.Asset.I_Asset interface to include the hash property
declare module "../../schema/schema.general" {
    namespace Entity {
        namespace Asset {
            interface I_Asset {
                asset__data_hash?: string;
            }
        }
    }
}

// Babylon Script
export namespace VircadiaBabylonScript {
    export const VERSION = babylonPackageJson.version;

    // Script hooks container
    export interface I_Hooks {
        // Script lifecycle hooks
        onScriptInitialize?: (entityData: Entity.I_Entity) => void;
        onScriptTeardown?: () => void;

        // Network state hooks
        onConnected?: () => void;
        onDisconnected?: (reason?: string) => void;
    }

    // The context provided to scripts
    export interface I_Context {
        Vircadia: {
            Debug: boolean;
            Suppress: boolean;

            // Top-level version identifier
            Version: string;

            // Script management
            Script: {
                reload: () => Promise<void>;
            };

            // Utilities for asset and resource management
            Utilities: {
                Query: {
                    execute: <T>(data: {
                        query: string;
                        parameters?: unknown[];
                        timeoutMs?: number;
                    }) => Promise<
                        Communication.WebSocket.QueryResponseMessage<T>
                    >;
                };
            };
        };
        Babylon: {
            Version: typeof VERSION;
            Scene: Scene;
        };
    }

    // Script API interface - to be used with the setup function
    export interface ScriptAPI {
        // Context properties
        context: I_Context;

        // Direct access to hooks for registration
        hooks: I_Hooks;

        // Method chaining support for fluent API
        register: (hooks: Partial<I_Hooks>) => ScriptAPI;
    }

    // Script function expected return type
    export interface ScriptReturn {
        hooks: I_Hooks;
    }

    // Type for the script setup function
    export type ScriptSetupFunction = (api: ScriptAPI) => void;

    // Type for the main entry function in scripts
    export type VircadiaScriptFunction = (context: I_Context) => ScriptReturn;
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
    setupFn: VircadiaBabylonScript.ScriptSetupFunction,
): VircadiaBabylonScript.VircadiaScriptFunction {
    return (
        context: VircadiaBabylonScript.I_Context,
    ): VircadiaBabylonScript.ScriptReturn => {
        // Create hooks container
        const hooks: VircadiaBabylonScript.I_Hooks = {};

        // Ensure Babylon context exists
        if (!context.Babylon) {
            context.Babylon = {
                Version: babylonPackageJson.version,
                Scene: null as unknown as Scene, // Will be properly set by caller
            };
        }

        // Create the composable API using the new pattern
        const api: VircadiaBabylonScript.ScriptAPI = {
            // Full context access
            context,

            // Direct access to hooks for registration
            hooks,

            // Method chaining support for fluent API
            register: (hookUpdates: Partial<VircadiaBabylonScript.I_Hooks>) => {
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
    async sendQueryAsync<T = unknown>(data: {
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

        return new Promise<Communication.WebSocket.QueryResponseMessage<T>>(
            (resolve, reject) => {
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

// Manages entities, scripts, and their relationships
class EntityAndScriptManager {
    // Entity management
    private entities = new Map<string, Entity.I_Entity>();
    private lastEntityUpdateTimestamp: Date = new Date(0); // Initialize with epoch timestamp

    // Script management
    private scripts = new Map<string, Entity.Script.I_Script>();
    private scriptInstances = new Map<
        string,
        {
            script: Entity.Script.I_Script;
            hooks: VircadiaBabylonScript.I_Hooks;
            context: VircadiaBabylonScript.I_Context;
            entityId?: string;
        }
    >();
    private currentPlatform: Entity.Script.E_ScriptType;

    constructor(
        private config: VircadiaBabylonCoreConfig,
        private connectionManager: ConnectionManager,
        private scene: Scene,
    ) {
        // Check for Bun environment
        if (
            typeof process !== "undefined" &&
            process.versions &&
            process.versions.bun
        ) {
            this.currentPlatform = Entity.Script.E_ScriptType.BABYLON_BUN;
        }
        // Check for Browser environment
        else if (typeof window !== "undefined") {
            this.currentPlatform = Entity.Script.E_ScriptType.BABYLON_BROWSER;
        } else {
            throw new Error("Unsupported platform");
        }
    }

    getCurrentPlatform(): Entity.Script.E_ScriptType {
        return this.currentPlatform;
    }

    // SCRIPT MANAGEMENT FUNCTIONS

    // Load a script from the server, filtered by platform
    async loadScript(scriptName: string): Promise<Entity.Script.I_Script> {
        // First check if any variants of this script exist
        const allVariantsResponse = await this.connectionManager.sendQueryAsync<
            Entity.Script.I_Script[]
        >({
            query: "SELECT DISTINCT script__platform FROM entity.entity_scripts WHERE general__script_file_name = $1",
            parameters: [scriptName],
        });

        if (!allVariantsResponse.result.length) {
            throw new Error(`Script ${scriptName} not found in any platform`);
        }

        // Then try to get the specific platform version
        const queryResponse = await this.connectionManager.sendQueryAsync<
            Entity.Script.I_Script[]
        >({
            query: "SELECT * FROM entity.entity_scripts WHERE general__script_file_name = $1 AND $2 = ANY(script__platform)",
            parameters: [scriptName, this.currentPlatform],
        });

        if (!queryResponse.result.length) {
            const availablePlatforms = allVariantsResponse.result
                .flatMap((r) => r.script__platform)
                .filter((v, i, a) => a.indexOf(v) === i) // Unique values
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
    ): Promise<void> {
        try {
            // Create script context with the simplified flat structure
            const context: VircadiaBabylonScript.I_Context = {
                Vircadia: {
                    // Top-level version identifier
                    Version: vircadiaSdkTsPackageJson.version,
                    Debug: this.config.debug ?? false,
                    Suppress: this.config.suppress ?? false,

                    // Script management
                    Script: {
                        reload: async () => {
                            await this.reloadScript(
                                script.general__script_file_name,
                            );
                        },
                    },

                    // Utilities for scripts
                    Utilities: {
                        Query: {
                            execute: this.connectionManager.sendQueryAsync.bind(
                                this.connectionManager,
                            ),
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
                const funcBody: string | null =
                    this.currentPlatform ===
                    Entity.Script.E_ScriptType.BABYLON_BROWSER
                        ? script.script__compiled__babylon_browser__data
                        : this.currentPlatform ===
                            Entity.Script.E_ScriptType.BABYLON_BUN
                          ? script.script__compiled__babylon_bun__data
                          : null;

                if (!funcBody) {
                    throw new Error(
                        `Script ${script.general__script_file_name} not compiled for platform ${this.currentPlatform}`,
                    );
                }

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
                ) as VircadiaBabylonScript.ScriptReturn;

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
                });

                // Initialize script
                if (instance.hooks.onScriptInitialize) {
                    instance.hooks.onScriptInitialize(entity);
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
                const entity = this.getEntity(instance.entityId);
                if (entity) {
                    await this.executeScript(script, entity);
                } else {
                    log({
                        message: `Could not reload script ${scriptName}: Entity not found`,
                        type: "warn",
                        debug: this.config.debug,
                        suppress: this.config.suppress,
                    });
                }
            }
        }
    }

    // Get all script instances
    getScriptInstances(): typeof this.scriptInstances {
        return this.scriptInstances;
    }

    // ENTITY MANAGEMENT FUNCTIONS

    // Load all entities from the server, sorted by priority
    async loadEntitiesByPriority(): Promise<void> {
        try {
            const queryResponse = await this.connectionManager.sendQueryAsync<
                Entity.I_Entity[]
            >({
                query: `
                SELECT *
                FROM entity.entities
                ORDER BY 
                    COALESCE(group__load_priority, 2147483647),
                    general__created_at ASC
            `,
            });

            // Update last timestamp to now, as we have the latest entities
            this.lastEntityUpdateTimestamp = new Date();

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
                        >({
                            query: "SELECT DISTINCT general__script_file_name FROM entity.entity_scripts WHERE general__script_file_name = ANY($1) AND $2 = ANY(script__platform)",
                            parameters: [
                                entity.script__names,
                                this.currentPlatform,
                            ],
                        });

                    // Only process scripts that are available for our platform
                    for (const {
                        general__script_file_name,
                    } of availableScripts.result) {
                        // Load the script if not already loaded
                        const script = await this.loadScript(
                            general__script_file_name,
                        );

                        // Execute the script for this entity
                        await this.executeScript(script, entity);
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
}

// Main class that coordinates all components
export class VircadiaBabylonCore {
    private connectionManager: ConnectionManager;
    private entityScriptManager: EntityAndScriptManager;
    private initialized = false;

    constructor(private config: VircadiaBabylonCoreConfig) {
        // Register Babylon.js loaders first
        registerBuiltInLoaders();

        // Create components in the correct order to resolve dependencies
        this.connectionManager = new ConnectionManager(config);

        // Create the combined entity and script manager
        this.entityScriptManager = new EntityAndScriptManager(
            config,
            this.connectionManager,
            config.scene,
        );
    }

    // Initialize the system
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Connect to the server
        await this.connectionManager.connect();

        // Load initial entity data
        await this.entityScriptManager.loadEntitiesByPriority();

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

    getEntityAndScriptManager(): EntityAndScriptManager {
        return this.entityScriptManager;
    }

    // Clean up resources
    dispose(): void {
        if (this.connectionManager) {
            this.connectionManager.disconnect();
        }
        this.initialized = false;
    }
}
