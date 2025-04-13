import type { ISceneLoaderAsyncResult, Scene } from "@babylonjs/core";
import babylonPackageJson from "@babylonjs/core/package.json";
import type { Communication, Entity } from "./schema.general";

// TODO: Rename to VircadiaBabylonScript
export namespace Babylon {
    export const VERSION = babylonPackageJson.version;

    // Script hooks container
    export interface I_Hooks {
        // Script lifecycle hooks
        onScriptInitialize?: (entityData: Entity.I_Entity) => void;
        onEntityUpdate?: (entityData: Entity.I_Entity) => void;
        onScriptUpdate?: (scriptData: Entity.Script.I_Script) => void;
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
                Asset: {
                    loadGLTFAssetAsMesh: (data: {
                        asset: Entity.Asset.I_Asset;
                        scene: Scene;
                    }) => Promise<ISceneLoaderAsyncResult>;
                    getAssetFromServer: (data: {
                        assetName: string;
                    }) => Promise<Entity.Asset.I_Asset | null>;
                    getAssetHashFromServer: (data: {
                        assetName: string;
                    }) => Promise<string | null>;
                    storeAssetInIndexedDB: (data: {
                        asset: Entity.Asset.I_Asset;
                    }) => Promise<boolean>;
                    getAssetFromIndexedDB: (data: {
                        assetName: string;
                    }) => Promise<Entity.Asset.I_Asset | null>;
                    storeAssetInFileSystem: (data: {
                        asset: Entity.Asset.I_Asset;
                    }) => Promise<boolean>;
                    getAssetFromFileSystem: (data: {
                        assetName: string;
                    }) => Promise<Entity.Asset.I_Asset | null>;
                };
                Query: {
                    execute: (data: {
                        query: string;
                        parameters?: unknown[];
                    }) => Promise<
                        Communication.WebSocket.QueryResponseMessage<unknown>
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
