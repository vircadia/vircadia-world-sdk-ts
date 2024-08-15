/* eslint-disable @typescript-eslint/no-throw-literal */
import { log } from "../../../modules/log.js";
import { Supabase } from '../supabase/supabase.js';
import { Scene } from '@babylonjs/core/scene.js';
import { SceneSerializer } from '@babylonjs/core/Misc/sceneSerializer.js';
import { E_WorldTransportChannel } from "../../../routes/meta.js";

export namespace World_Babylon {
    const BABYLON_LOG_PREFIX = '[BABYLON]';

    interface WorldMetadata {
        id: string;
        name: string;
        description?: string;
        version?: string;
        author?: string;
        created?: string;
        updated?: string;
        autoClear?: boolean;
        clearColor?: { r: number; g: number; b: number };
        ambientColor?: { r: number; g: number; b: number };
        gravity?: { x: number; y: number; z: number };
        activeCamera_?: string;
        collisionsEnabled?: boolean;
        physicsEnabled?: boolean;
        physicsGravity?: { x: number; y: number; z: number };
        physicsEngine?: 'oimo' | 'cannon';
        autoAnimate?: boolean;
        autoAnimateFrom?: number;
        autoAnimateTo?: number;
        autoAnimateLoop?: boolean;
        autoAnimateSpeed?: number;
    }

    interface WorldData {
        id: string;
        name: string;
        description: string;
        metadata: WorldMetadata;
        scene_data: any;
        version: string;
        created_by: string;
        created_at: number;
        updated_by: string;
        updated_at: number;
    }

    interface WorldCallbacks {
        onWorldCreated?: (worldId: string, metadata: WorldMetadata) => void;
        onWorldDeleted?: (worldId: string) => void;
        onWorldMetadataUpdated?: (worldId: string, oldMetadata: WorldMetadata, newMetadata: WorldMetadata) => void;
        onWorldSceneDataUpdated?: (worldId: string, sceneData: any) => void;
    }

    export const createWorld = async (metadata: Omit<WorldMetadata, 'id'>, scene: Scene): Promise<string> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const sceneData = SceneSerializer.Serialize(scene);
            const { data, error } = await supabaseClient
                .from('worlds')
                .insert({
                    ...metadata,
                    scene_data: sceneData
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

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
                .from('worlds')
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

    export const updateWorldMetadata = async (worldId: string, metadata: Partial<WorldMetadata>): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await supabaseClient
                .from('worlds')
                .update(metadata)
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

    export const updateWorldSceneData = async (worldId: string, scene: Scene): Promise<void> => {
        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            const sceneData = SceneSerializer.Serialize(scene);
            const { error } = await supabaseClient
                .from('worlds')
                .update({ scene_data: sceneData })
                .eq('id', worldId);

            if (error) {
                throw error;
            }

            log(`${BABYLON_LOG_PREFIX} Updated scene data for world with ID: ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to update world scene data: ${error}`, 'error');
            throw error;
        }
    };

    export const setupWorldSync = (callbacks: WorldCallbacks = {}) => {
        const supabaseClient = Supabase.getSupabaseClient();
        if (!supabaseClient) {
            log(`${BABYLON_LOG_PREFIX} Supabase client not initialized`, 'error');
            return;
        }

        // Local cache to store world metadata
        const worldMetadataCache: { [worldId: string]: WorldMetadata } = {};

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
                            oldMetadata[key as keyof WorldMetadata] !== newMetadata[key as keyof WorldMetadata]
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
}
