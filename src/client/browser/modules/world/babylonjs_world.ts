/* eslint-disable @typescript-eslint/no-throw-literal */
import { log } from "../../../../server/modules/general/log.js";
import { Supabase } from '../providers/supabase/supabase.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Agent, World } from "../../../../../meta/meta.js";

export namespace World_Babylon {
    const WORLD_BABYLON_LOG_PREFIX = '[WORLD: BABYLON]';

    export namespace Meta {
        export const create = async (metadata: Omit<World.I_WorldMetadata, 'id'>, scene: Scene): Promise<string> => {
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

                log(`${WORLD_BABYLON_LOG_PREFIX} Created new world with ID: ${data.id}`, 'info');
                return data.id;
            } catch (error) {
                log(`${WORLD_BABYLON_LOG_PREFIX} Failed to create world: ${error}`, 'error');
                throw error;
            }
        };

        export const remove = async (worldId: string): Promise<void> => {
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

                log(`${WORLD_BABYLON_LOG_PREFIX} Deleted world with ID: ${worldId}`, 'info');
            } catch (error) {
                log(`${WORLD_BABYLON_LOG_PREFIX} Failed to delete world: ${error}`, 'error');
                throw error;
            }
        };

        export const update = async (worldId: string, metadata: Partial<World.Metadata>): Promise<void> => {
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

                log(`${WORLD_BABYLON_LOG_PREFIX} Updated metadata for world with ID: ${worldId}`, 'info');
            } catch (error) {
                log(`${WORLD_BABYLON_LOG_PREFIX} Failed to update world metadata: ${error}`, 'error');
                throw error;
            }
        };

        export const setupWorldSync = (callbacks:
            {
                onWorldCreated: (worldId: string, metadata: World.I_WorldMetadata) => void;
                onWorldDeleted: (worldId: string) => void;
                onWorldMetadataUpdated: (worldId: string, oldMetadata: World.I_WorldMetadata, newMetadata: World.I_WorldMetadata) => void;
            }) => {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                log(`${WORLD_BABYLON_LOG_PREFIX} Supabase client not initialized`, 'error');
                return;
            }

            // Local cache to store world metadata
            const worldMetadataCache: { [worldId: string]: World.I_WorldMetadata } = {};

            supabaseClient
                .channel(Agent.E_WorldTransportChannel.WORLD_METADATA)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'worlds' }, (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT': {
                            const newWorld = payload.new as World.I_WorldMetadata;
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
                            const oldData = payload.old as World.I_WorldData;
                            const newData = payload.new as World.I_WorldData;
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
                            log(`${WORLD_BABYLON_LOG_PREFIX} Unhandled event type: ${payload.eventType}`, 'warn');
                            break;
                    }
                })
                .subscribe();

            log(`${WORLD_BABYLON_LOG_PREFIX} Set up world sync`, 'info');
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

            export const get = (worldId: string, scriptId: string): Script | null => currentScripts[worldId]?.[scriptId] || null;

            export const set = (worldId: string, scriptId: string, script: Script): void => {
                currentScripts[worldId] = currentScripts[worldId] || {};
                currentScripts[worldId][scriptId] = script;
            };

            export const remove = (worldId: string, scriptId: string): void => {
                delete currentScripts[worldId]?.[scriptId];
            };

            export const list = (worldId: string): Script[] => Object.values(currentScripts[worldId] || {});

            export const clear = (worldId: string): void => {
                currentScripts[worldId] = {};
            };

            export const update = (worldId: string, scriptId: string, script: Script): void => {
                currentScripts[worldId] = currentScripts[worldId] || {};
                currentScripts[worldId][scriptId] = script;
            };
        }
    }
