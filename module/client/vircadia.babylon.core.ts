import { Communication, Entity } from "../../schema/schema.general";
import type { Babylon } from "../../schema/schema.babylon.script";

import babylonPackageJson from "@babylonjs/core/package.json";
import vircadiaSdkTsPackageJson from "../../package.json";
import { log } from "../general/log";
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
            hooks: Babylon.I_Hooks;
            context: Babylon.I_Context;
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
        // Check for Node environment
        else if (
            typeof process !== "undefined" &&
            process.versions &&
            process.versions.node
        ) {
            this.currentPlatform = Entity.Script.E_ScriptType.BABYLON_NODE;
        }
        // Check for Browser environment
        else if (
            typeof window !== "undefined" &&
            typeof window.Bun !== "undefined"
        ) {
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
            "SELECT * FROM entity.entity_scripts WHERE general__script_file_name = $1 AND $2 = ANY(script__platform)",
            [scriptName, this.currentPlatform],
        );

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
                    this.currentPlatform ===
                    Entity.Script.E_ScriptType.BABYLON_NODE
                        ? script.script__compiled__babylon_node__data ||
                          script.script__source__data
                        : this.currentPlatform ===
                            Entity.Script.E_ScriptType.BABYLON_BROWSER
                          ? script.script__compiled__babylon_browser__data ||
                            script.script__source__data
                          : this.currentPlatform ===
                              Entity.Script.E_ScriptType.BABYLON_BUN
                            ? script.script__compiled__babylon_bun__data ||
                              script.script__source__data
                            : script.script__source__data;

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

    // Notify all scripts about an entity update
    notifyEntityUpdate(entity: Entity.I_Entity): void {
        for (const instance of this.scriptInstances.values()) {
            if (instance.hooks.onEntityUpdate) {
                instance.hooks.onEntityUpdate(entity);
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
            >(`
                SELECT *
                FROM entity.entities
                ORDER BY 
                    COALESCE(group__load_priority, 2147483647),
                    general__created_at ASC
            `);

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
                        >(
                            "SELECT DISTINCT general__script_file_name FROM entity.entity_scripts WHERE general__script_file_name = ANY($1) AND $2 = ANY(script__platform)",
                            [entity.script__names, this.currentPlatform],
                        );

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

    // Update an entity and notify scripts
    updateEntityAndNotifyScripts(entity: Entity.I_Entity): void {
        this.entities.set(entity.general__entity_id, entity);
        this.notifyEntityUpdate(entity);
    }

    // Poll for both entity and script updates in a single operation
    async pollForUpdates(): Promise<{
        entities: {
            added: Entity.I_Entity[];
            updated: Entity.I_Entity[];
            deleted: string[];
        };
        scripts: {
            added: Entity.Script.I_Script[];
            updated: Entity.Script.I_Script[];
            deleted: string[];
        };
    }> {
        try {
            // Format timestamp for SQL query (ISO format)
            const timestamp = this.lastEntityUpdateTimestamp.toISOString();

            // Get updated and new entities and scripts in parallel queries
            const [updatedEntitiesResponse, allScriptsResponse] =
                await Promise.all([
                    this.connectionManager.sendQueryAsync<Entity.I_Entity[]>(
                        "SELECT * FROM entity.entities WHERE general__updated_at > $1 ORDER BY general__created_at ASC",
                        [timestamp],
                    ),
                    this.connectionManager.sendQueryAsync<
                        Entity.Script.I_Script[]
                    >(
                        "SELECT * FROM entity.entity_scripts WHERE $1 = ANY(script__platform)",
                        [this.currentPlatform],
                    ),
                ]);

            // Update timestamp for next poll
            this.lastEntityUpdateTimestamp = new Date();

            // Process entities
            const updatedEntities: Entity.I_Entity[] = [];
            const newEntities: Entity.I_Entity[] = [];
            const currentEntityIds = Array.from(this.entities.keys());
            let deletedEntityIds: string[] = [];

            // Process entity updates and additions
            for (const entity of updatedEntitiesResponse.result) {
                if (this.entities.has(entity.general__entity_id)) {
                    updatedEntities.push(entity);
                    this.updateEntityAndNotifyScripts(entity);
                } else {
                    newEntities.push(entity);
                }
            }

            // Find deleted entities
            if (currentEntityIds.length > 0) {
                const deletedEntitiesResponse =
                    await this.connectionManager.sendQueryAsync<
                        { general__entity_id: string }[]
                    >(
                        "SELECT general__entity_id FROM UNNEST($1::uuid[]) AS general__entity_id WHERE general__entity_id NOT IN (SELECT general__entity_id FROM entity.entities)",
                        [currentEntityIds],
                    );
                deletedEntityIds = deletedEntitiesResponse.result.map(
                    (e) => e.general__entity_id,
                );
            }

            // Process new entities grouped by priority
            if (newEntities.length > 0) {
                const priorityGroups = new Map<number, Entity.I_Entity[]>();
                for (const entity of newEntities) {
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
            }

            // Process deleted entities
            for (const entityId of deletedEntityIds) {
                // Clean up scripts associated with this entity
                for (const [
                    scriptName,
                    instance,
                ] of this.scriptInstances.entries()) {
                    if (instance.entityId === entityId) {
                        if (instance.hooks.onScriptTeardown) {
                            try {
                                await instance.hooks.onScriptTeardown();
                            } catch (error) {
                                log({
                                    message: `Error in script teardown for ${scriptName}:`,
                                    type: "error",
                                    error,
                                    debug: this.config.debug,
                                    suppress: this.config.suppress,
                                });
                            }
                        }
                        this.scriptInstances.delete(scriptName);
                    }
                }
                this.entities.delete(entityId);
            }

            // Process scripts
            const currentScriptNames = Array.from(this.scripts.keys());
            const updatedScripts: Entity.Script.I_Script[] = [];
            const addedScripts: Entity.Script.I_Script[] = [];
            const deletedScriptNames: string[] = [];

            // Find deleted scripts
            for (const scriptName of currentScriptNames) {
                if (
                    !allScriptsResponse.result.some(
                        (s) => s.general__script_file_name === scriptName,
                    )
                ) {
                    deletedScriptNames.push(scriptName);
                    const instance = this.scriptInstances.get(scriptName);
                    if (instance?.hooks.onScriptTeardown) {
                        try {
                            await instance.hooks.onScriptTeardown();
                        } catch (error) {
                            log({
                                message: `Error in script teardown for ${scriptName}:`,
                                type: "error",
                                error,
                                debug: this.config.debug,
                                suppress: this.config.suppress,
                            });
                        }
                    }
                    this.scriptInstances.delete(scriptName);
                    this.scripts.delete(scriptName);
                }
            }

            // Process script updates and additions
            for (const latestScript of allScriptsResponse.result) {
                const currentScript = this.scripts.get(
                    latestScript.general__script_file_name,
                );
                if (!currentScript) {
                    addedScripts.push(latestScript);
                    this.scripts.set(
                        latestScript.general__script_file_name,
                        latestScript,
                    );
                } else if (
                    new Date(
                        latestScript.general__updated_at as string,
                    ).getTime() >
                    new Date(
                        currentScript.general__updated_at as string,
                    ).getTime()
                ) {
                    updatedScripts.push(latestScript);
                    this.scripts.set(
                        latestScript.general__script_file_name,
                        latestScript,
                    );
                    await this.reloadScript(
                        latestScript.general__script_file_name,
                    );
                }
            }

            return {
                entities: {
                    added: newEntities,
                    updated: updatedEntities,
                    deleted: deletedEntityIds,
                },
                scripts: {
                    added: addedScripts,
                    updated: updatedScripts,
                    deleted: deletedScriptNames,
                },
            };
        } catch (error) {
            log({
                message: "Failed to poll for updates:",
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });

            return {
                entities: { added: [], updated: [], deleted: [] },
                scripts: { added: [], updated: [], deleted: [] },
            };
        }
    }
}

// Main class that coordinates all components
export class VircadiaBabylonCore {
    private connectionManager: ConnectionManager;
    private entityScriptManager: EntityAndScriptManager;
    private initialized = false;
    private pollTimers: Map<string, Timer> = new Map();
    private syncGroups: Map<string, { client__poll__rate_ms: number }> =
        new Map();

    constructor(private config: VircadiaBabylonCoreConfig) {
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

        // Load sync groups configuration
        await this.loadSyncGroups();

        // Set up polling for entity updates
        this.setupPolling();

        this.initialized = true;
    }

    // Load sync groups from the database
    private async loadSyncGroups(): Promise<void> {
        try {
            const syncGroupsResponse =
                await this.connectionManager.sendQueryAsync<
                    {
                        general__sync_group: string;
                        client__poll__rate_ms: number;
                    }[]
                >(`
                SELECT general__sync_group, client__poll__rate_ms
                FROM auth.sync_groups
            `);

            for (const group of syncGroupsResponse.result) {
                this.syncGroups.set(group.general__sync_group, {
                    client__poll__rate_ms: group.client__poll__rate_ms,
                });
            }

            log({
                message: `Loaded ${syncGroupsResponse.result.length} sync groups`,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
        } catch (error) {
            log({
                message: "Failed to load sync groups:",
                type: "error",
                error,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });
        }
    }

    // Set up polling intervals for each sync group
    private setupPolling(): void {
        // Clear any existing poll timers
        for (const [syncGroup, timer] of this.pollTimers.entries()) {
            clearInterval(timer);
            this.pollTimers.delete(syncGroup);
        }

        // Set up a new poll timer for each sync group
        for (const [syncGroup, config] of this.syncGroups.entries()) {
            const pollRate = config.client__poll__rate_ms;

            log({
                message: `Setting up polling for sync group ${syncGroup} at ${pollRate}ms intervals`,
                debug: this.config.debug,
                suppress: this.config.suppress,
            });

            const timer = setInterval(async () => {
                if (
                    !this.initialized ||
                    !this.connectionManager.isClientConnected()
                ) {
                    return;
                }

                try {
                    // Use the combined polling method
                    const updates =
                        await this.entityScriptManager.pollForUpdates();

                    // Log significant changes
                    if (
                        updates.entities.added.length > 0 ||
                        updates.entities.updated.length > 0 ||
                        updates.entities.deleted.length > 0 ||
                        updates.scripts.added.length > 0 ||
                        updates.scripts.updated.length > 0 ||
                        updates.scripts.deleted.length > 0
                    ) {
                        log({
                            message: `Updates: ${updates.entities.added.length} entities added, ${updates.entities.updated.length} entities updated, ${updates.entities.deleted.length} entities deleted, ${updates.scripts.added.length} scripts added, ${updates.scripts.updated.length} scripts updated, ${updates.scripts.deleted.length} scripts deleted`,
                            debug: this.config.debug,
                            suppress: this.config.suppress,
                        });
                    }
                } catch (error) {
                    log({
                        message: `Error polling for updates in sync group ${syncGroup}:`,
                        type: "error",
                        error,
                        debug: this.config.debug,
                        suppress: this.config.suppress,
                    });
                }
            }, pollRate);

            this.pollTimers.set(syncGroup, timer);
        }
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
        // Clear all polling timers
        for (const [syncGroup, timer] of this.pollTimers.entries()) {
            clearInterval(timer);
            this.pollTimers.delete(syncGroup);
        }

        if (this.connectionManager) {
            this.connectionManager.disconnect();
        }
        this.initialized = false;
    }
}
