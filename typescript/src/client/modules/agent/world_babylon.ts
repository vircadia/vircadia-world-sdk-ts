/* eslint-disable @typescript-eslint/no-throw-literal */
import { log } from "../../../modules/log.js";
import { Supabase } from '../supabase/supabase.js';
import { Scene } from '@babylonjs/core/scene.js';
import { SceneSerializer } from '@babylonjs/core/Misc/sceneSerializer.js';
import { E_WorldTransportChannel, World } from "../../../meta.js";

export namespace World_Babylon {
    const BABYLON_LOG_PREFIX = '[BABYLON]';

    interface WorldCallbacks {
        onWorldCreated?: (worldId: string, metadata: World.Metadata) => void;
        onWorldDeleted?: (worldId: string) => void;
        onWorldMetadataUpdated?: (worldId: string, oldMetadata: World.Metadata, newMetadata: World.Metadata) => void;
    }

    export const createWorld = async (metadata: Omit<World.Metadata, 'id'>, scene: Scene): Promise<string> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await supabaseClient
                .from('worlds_gltf')
                .insert({
                    name: metadata.name,
                    version: metadata.version || '1.0',
                    asset: {}, // You might want to define this based on your needs
                    extras: {
                        metadata
                    }
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

            // Now create related entities (scenes, nodes, etc.) based on the Babylon.js scene
            await createSceneEntities(data.id, scene);

            log(`${BABYLON_LOG_PREFIX} Created new world with ID: ${data.id}`, 'info');
            return data.id;
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to create world: ${error}`, 'error');
            throw error;
        }
    };

    export const deleteWorld = async (worldId: string): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await supabaseClient
                .from('worlds_gltf')
                .delete()
                .eq('id', worldId);

            if (error) {
                throw error;
            }

            log(`${BABYLON_LOG_PREFIX} Deleted world with ID: ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to delete world: ${error}`, 'error');
            throw error;
        }
    };

    export const updateWorldMetadata = async (worldId: string, metadata: Partial<World.Metadata>): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await supabaseClient
                .from('worlds_gltf')
                .update({
                    extras: {
                        metadata
                    }
                })
                .eq('id', worldId);

            if (error) {
                throw error;
            }

            log(`${BABYLON_LOG_PREFIX} Updated metadata for world with ID: ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to update world metadata: ${error}`, 'error');
            throw error;
        }
    };

    // New functions to handle individual entity updates

    export const updateSceneEntity = async (worldId: string, sceneData: any): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await supabaseClient
                .from('scenes')
                .upsert({
                    gltf_asset_id: worldId,
                    ...sceneData
                })
                .eq('gltf_asset_id', worldId);

            if (error) {
                throw error;
            }

            log(`${BABYLON_LOG_PREFIX} Updated scene for world with ID: ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to update scene: ${error}`, 'error');
            throw error;
        }
    };

    // Similar functions for other entities (nodes, meshes, materials, etc.)
    // Example for nodes:
    export const updateNodeEntity = async (worldId: string, nodeId: string, nodeData: any): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await supabaseClient
                .from('nodes')
                .upsert({
                    id: nodeId,
                    gltf_asset_id: worldId,
                    ...nodeData
                });

            if (error) {
                throw error;
            }

            log(`${BABYLON_LOG_PREFIX} Updated node for world with ID: ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to update node: ${error}`, 'error');
            throw error;
        }
    };

    // ... implement similar functions for other entities ...

    // Helper function to create all related entities for a new world
    const createSceneEntities = async (worldId: string, scene: Scene): Promise<void> => {
        // Implement the logic to create scenes, nodes, meshes, etc. based on the Babylon.js scene
        // This will involve multiple inserts into different tables
    };

    export const setupWorldSync = (callbacks: WorldCallbacks = {}) => {
        const supabaseClient = Supabase.getSupabaseClient();
        if (!supabaseClient) {
            log(`${BABYLON_LOG_PREFIX} Supabase client not initialized`, 'error');
            return;
        }

        // Local cache to store world metadata
        const worldMetadataCache: { [worldId: string]: World.Metadata } = {};

        supabaseClient
            .channel(E_WorldTransportChannel.WORLD_METADATA)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'worlds' }, (payload) => {
                switch (payload.eventType) {
                    case 'INSERT': {
                        const newWorld = payload.new as WorldMetadata;
                        worldMetadataCache[newWorld.id] = newWorld;
                        if (callbacks.onWorldCreated) {
                            callbacks.onWorldCreated(newWorld.id, newWorld);
                        }
                        break;
                    }
                    case 'DELETE': {
                        const deletedWorldId = payload.old.id;
                        if (callbacks.onWorldDeleted) {
                            callbacks.onWorldDeleted(deletedWorldId);
                        }
                        delete worldMetadataCache[deletedWorldId];
                        break;
                    }
                    case 'UPDATE': {
                        const oldData = payload.old as WorldData;
                        const newData = payload.new as WorldData;
                        const worldId = newData.id;

                        const oldMetadata = worldMetadataCache[worldId] || {};
                        const newMetadata = newData.metadata as WorldMetadata;

                        // Check if metadata actually changed
                        const metadataChanged = Object.keys(newMetadata).some((key) =>
                            oldMetadata[key as keyof World.Metadata] !== newMetadata[key as keyof World.Metadata]
                        );

                        if (metadataChanged && callbacks.onWorldMetadataUpdated) {
                            callbacks.onWorldMetadataUpdated(worldId, oldMetadata, newMetadata);
                        }

                        // ... rest of the update case ...

                        // Update the cache
                        worldMetadataCache[worldId] = newMetadata;
                        break;
                    }
                    default:
                        log(`${BABYLON_LOG_PREFIX} Unhandled event type: ${payload.eventType}`, 'warn');
                        break;
                }
            })
            .subscribe();

        log(`${BABYLON_LOG_PREFIX} Set up world sync`, 'info');
    };

    export namespace Script {
        export interface Script {
            data: string;
        }

        export const currentScripts: {
            [worldId: string]: {
                [scriptId: string]: Script
            }
        } = {};

        export const get = (worldId: string, scriptId: string): Script | null => {
            return currentScripts[worldId]?.[scriptId] || null;
        };

        export const set = (worldId: string, scriptId: string, script: Script): void => {
            currentScripts[worldId] = currentScripts[worldId] || {};
            currentScripts[worldId][scriptId] = script;
        };

        export const delete = (worldId: string, scriptId: string): void => {
            delete currentScripts[worldId]?.[scriptId];
        };

        export const list = (worldId: string): Script[] => {
            return Object.values(currentScripts[worldId] || {});
        };

        export const clear = (worldId: string): void => {
            currentScripts[worldId] = {};
        };

        export const update = (worldId: string, scriptId: string, script: Script): void => {
            currentScripts[worldId] = currentScripts[worldId] || {};
            currentScripts[worldId][scriptId] = script;
        };
    }
}
