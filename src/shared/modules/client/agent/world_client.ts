import { SupabaseClient } from "@supabase/supabase-js";
import { World } from '../../vircadia-world-meta/meta/meta.ts';
import { log } from "../../vircadia-world-meta/general/modules/log.ts";
import * as BABYLON from 'npm:@babylonjs/core';
import Script from './helpers/script.ts';

export class World_Client {
    private supabaseClient: SupabaseClient | null = null;
    private url: string;
    private key: string;

    constructor({
        url,
        key,
    }: {
        url: string;
        key: string;
    }) {
        this.url = url;
        this.key = key;
        this.initializeClient();
    }

    private initializeClient(): void {
        log({
            message: `Initializing Supabase client at [${this.url}], with key [${this.key}], key length: [${this.key.length}]`,
            type: "info",
        });
        this.supabaseClient = new SupabaseClient(this.url, this.key);
        this.supabaseClient.realtime.connect();
        log({
            message: `Supabase client initialized`,
            type: "info",
        });
    }

    public getClient(): World_Client {
        return this;
    }

    public getSupabaseClient(): SupabaseClient | null {
        return this.supabaseClient;
    }

    public async destroyClient(): Promise<null> {
        if (this.supabaseClient) {
            log({
                message: `Deinitializing Supabase client`,
                type: "info",
            });
            this.supabaseClient.realtime.disconnect();
            await this.supabaseClient.removeAllChannels();
            log({
                message: `Supabase client deinitialized`,
                type: "info",
            });
            this.supabaseClient = null;
        }
        return null;
    }

    static Tables = class {
        static World_GLTF = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_WorldGLTF, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_world_gltf', {
                    _name: data.name,
                    _version: data.version,
                    _metadata: data.metadata,
                    _defaultScene: data.defaultScene,
                    _extensionsUsed: data.extensionsUsed,
                    _extensionsRequired: data.extensionsRequired,
                    _extensions: data.extensions,
                    _extras: data.extras,
                    _asset: data.asset,
                });

                if (error) {
                    throw new Error(`Error creating world_gltf: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_WorldGLTF, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_world_gltf', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _version: data.version,
                    _metadata: data.metadata,
                    _defaultScene: data.defaultScene,
                    _extensionsUsed: data.extensionsUsed,
                    _extensionsRequired: data.extensionsRequired,
                    _extensions: data.extensions,
                    _extras: data.extras,
                    _asset: data.asset,
                });

                if (error) {
                    throw new Error(`Error updating world_gltf: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_world_gltf', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting world_gltf: ${error.message}`);
                }
            }
        };

        static Scene = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Scene, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_scene', {
                    _name: data.name,
                    _description: data.description,
                    _metadata: data.metadata,
                });

                if (error) {
                    throw new Error(`Error creating scene: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Scene, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_scene', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _description: data.description,
                    _metadata: data.metadata,
                });

                if (error) {
                    throw new Error(`Error updating scene: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_scene', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting scene: ${error.message}`);
                }
            }
        };

        static Node = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Node, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_node', {
                    _name: data.name,
                    _camera: data.camera,
                    _children: data.children,
                    _skin: data.skin,
                    _matrix: data.matrix,
                    _mesh: data.mesh,
                    _rotation: data.rotation,
                    _scale: data.scale,
                    _translation: data.translation,
                    _weights: data.weights,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating node: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Node, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_node', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _camera: data.camera,
                    _children: data.children,
                    _skin: data.skin,
                    _matrix: data.matrix,
                    _mesh: data.mesh,
                    _rotation: data.rotation,
                    _scale: data.scale,
                    _translation: data.translation,
                    _weights: data.weights,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating node: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_node', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting node: ${error.message}`);
                }
            }
        };

        static Mesh = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Mesh, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_mesh', {
                    _name: data.name,
                    _primitives: data.primitives,
                    _weights: data.weights,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating mesh: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Mesh, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_mesh', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _primitives: data.primitives,
                    _weights: data.weights,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating mesh: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_mesh', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting mesh: ${error.message}`);
                }
            }
        };

        static Material = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Material, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_material', {
                    _name: data.name,
                    _pbrMetallicRoughness: data.pbrMetallicRoughness,
                    _normalTexture: data.normalTexture,
                    _occlusionTexture: data.occlusionTexture,
                    _emissiveTexture: data.emissiveTexture,
                    _emissiveFactor: data.emissiveFactor,
                    _alphaMode: data.alphaMode,
                    _alphaCutoff: data.alphaCutoff,
                    _doubleSided: data.doubleSided,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating material: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Material, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_material', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _pbrMetallicRoughness: data.pbrMetallicRoughness,
                    _normalTexture: data.normalTexture,
                    _occlusionTexture: data.occlusionTexture,
                    _emissiveTexture: data.emissiveTexture,
                    _emissiveFactor: data.emissiveFactor,
                    _alphaMode: data.alphaMode,
                    _alphaCutoff: data.alphaCutoff,
                    _doubleSided: data.doubleSided,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating material: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_material', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting material: ${error.message}`);
                }
            }
        };

        static Texture = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Texture, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_texture', {
                    _name: data.name,
                    _sampler: data.sampler,
                    _source: data.source,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating texture: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Texture, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_texture', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _sampler: data.sampler,
                    _source: data.source,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating texture: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_texture', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting texture: ${error.message}`);
                }
            }
        };

        static Image = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Image, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_image', {
                    _name: data.name,
                    _uri: data.uri,
                    _mimeType: data.mimeType,
                    _bufferView: data.bufferView,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating image: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Image, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_image', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _uri: data.uri,
                    _mimeType: data.mimeType,
                    _bufferView: data.bufferView,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating image: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_image', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting image: ${error.message}`);
                }
            }
        };

        static Sampler = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Sampler, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_sampler', {
                    _name: data.name,
                    _magFilter: data.magFilter,
                    _minFilter: data.minFilter,
                    _wrapS: data.wrapS,
                    _wrapT: data.wrapT,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating sampler: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Sampler, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_sampler', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _magFilter: data.magFilter,
                    _minFilter: data.minFilter,
                    _wrapS: data.wrapS,
                    _wrapT: data.wrapT,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating sampler: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_sampler', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting sampler: ${error.message}`);
                }
            }
        };

        static Animation = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Animation, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_animation', {
                    _name: data.name,
                    _channels: data.channels,
                    _samplers: data.samplers,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating animation: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Animation, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_animation', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _channels: data.channels,
                    _samplers: data.samplers,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating animation: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_animation', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting animation: ${error.message}`);
                }
            }
        };

        static Skin = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Skin, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_skin', {
                    _name: data.name,
                    _inverseBindMatrices: data.inverseBindMatrices,
                    _skeleton: data.skeleton,
                    _joints: data.joints,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating skin: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Skin, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_skin', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _inverseBindMatrices: data.inverseBindMatrices,
                    _skeleton: data.skeleton,
                    _joints: data.joints,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating skin: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_skin', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting skin: ${error.message}`);
                }
            }
        };

        static Camera = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Camera, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_camera', {
                    _name: data.name,
                    _type: data.type,
                    _orthographic: data.orthographic,
                    _perspective: data.perspective,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating camera: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Camera, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_camera', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _type: data.type,
                    _orthographic: data.orthographic,
                    _perspective: data.perspective,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating camera: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_camera', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting camera: ${error.message}`);
                }
            }
        };

        static Buffer = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Buffer, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_buffer', {
                    _name: data.name,
                    _uri: data.uri,
                    _byteLength: data.byteLength,
                    _data: data.data,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating buffer: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Buffer, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_buffer', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _uri: data.uri,
                    _byteLength: data.byteLength,
                    _data: data.data,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating buffer: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_buffer', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting buffer: ${error.message}`);
                }
            }
        };

        static BufferView = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_BufferView, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_buffer_view', {
                    _name: data.name,
                    _buffer: data.buffer,
                    _byteOffset: data.byteOffset,
                    _byteLength: data.byteLength,
                    _byteStride: data.byteStride,
                    _target: data.target,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating buffer view: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_BufferView, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_buffer_view', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _buffer: data.buffer,
                    _byteOffset: data.byteOffset,
                    _byteLength: data.byteLength,
                    _byteStride: data.byteStride,
                    _target: data.target,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating buffer view: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_buffer_view', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting buffer view: ${error.message}`);
                }
            }
        };

        static Accessor = class {
            static async create(
                client: SupabaseClient,
                data: Omit<World.I_Accessor, 'vircadia_uuid' | 'created_at' | 'updated_at'>
            ): Promise<string> {
                const { data: result, error } = await client.rpc('create_accessor', {
                    _name: data.name,
                    _bufferView: data.bufferView,
                    _byteOffset: data.byteOffset,
                    _componentType: data.componentType,
                    _normalized: data.normalized,
                    _count: data.count,
                    _type: data.type,
                    _max: data.max,
                    _min: data.min,
                    _sparse: data.sparse,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error creating accessor: ${error.message}`);
                }

                return result;
            }

            static async update(
                client: SupabaseClient,
                uuid: string,
                data: Partial<Omit<World.I_Accessor, 'vircadia_uuid' | 'created_at' | 'updated_at'>>
            ): Promise<void> {
                const { error } = await client.rpc('update_accessor', {
                    _vircadia_uuid: uuid,
                    _name: data.name,
                    _bufferView: data.bufferView,
                    _byteOffset: data.byteOffset,
                    _componentType: data.componentType,
                    _normalized: data.normalized,
                    _count: data.count,
                    _type: data.type,
                    _max: data.max,
                    _min: data.min,
                    _sparse: data.sparse,
                    _extensions: data.extensions,
                    _extras: data.extras,
                });

                if (error) {
                    throw new Error(`Error updating accessor: ${error.message}`);
                }
            }

            static async delete(
                client: SupabaseClient,
                uuid: string
            ): Promise<void> {
                const { error } = await client.rpc('delete_accessor', {
                    _vircadia_uuid: uuid,
                });

                if (error) {
                    throw new Error(`Error deleting accessor: ${error.message}`);
                }
            }
        };
    };

    static Script = class {
        static async executeBabylonScript(script: string, context: {
            scene: BABYLON.Scene;
            mesh: BABYLON.Mesh;
            BABYLON: typeof BABYLON;
            VIRCADIA_WORLD_CLIENT: typeof World_Client;
        }): Promise<void> {
            try {
                await Script.execute(script, context);
            } catch (error) {
                throw new Error(`Error executing script: ${error.message}`);
            }
        }
    };
}
