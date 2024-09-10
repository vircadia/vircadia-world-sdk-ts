/* eslint-disable no-unused-vars */

import { z } from 'zod';

export namespace Primitive {
    export const S_Vector3 = z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
    });

    export type I_Vector3 = z.infer<typeof S_Vector3>;

    export class C_Vector3 {
        public x: number;
        public y: number;
        public z: number;

        constructor(_x?: number, _y?: number, _z?: number) {
            this.x = _x ?? 0;
            this.y = _y ?? 0;
            this.z = _z ?? 0;
        }

        static parse(obj: {
            x: number | any
            y: number | any
            z: number | any
        }): C_Vector3 {
            const parsedData = S_Vector3.parse(obj);
            return new C_Vector3(parsedData.x, parsedData.y, parsedData.z);
        }
    }

    export const S_Color3 = z.object({
        r: z.number(),
        g: z.number(),
        b: z.number(),
    });

    export type I_Color3 = z.infer<typeof S_Color3>;

    export class C_Color3 {
        public r: number;
        public g: number;
        public b: number;

        constructor(_r?: number, _g?: number, _b?: number) {
            this.r = _r ?? 0;
            this.g = _g ?? 0;
            this.b = _b ?? 0;
        }

        static parse(obj: {
            r: number | any
            g: number | any
            b: number | any
        }): C_Color3 {
            const parsedData = S_Color3.parse(obj);
            return new C_Color3(parsedData.r, parsedData.g, parsedData.b);
        }
    }
}

export namespace World {
    export interface I_CommonEntityProperties {
        vircadia: {
            name: string;
            version: string;
            createdAt: Date;
            updatedAt: Date;
            babylonjs: {
                [key: string]: unknown;
            }
        }
    }

    export interface I_BabylonEntityScriptProperties {

        client_behaviors: string[];
        client_actions: string[];
        server_behaviors: string[];
        server_actions: string[];
    }

    export interface I_WorldGLTF {
        vircadia_uuid: string;
        name: string;
        version: string;
        created_at: Date;
        updated_at: Date;
        metadata: any; // Consider creating a more specific type for metadata
        defaultScene?: string;
        extensionsUsed?: string[];
        extensionsRequired?: string[];
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
        asset: any; // Consider creating a more specific type for asset
    }

    export interface I_Scene {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        nodes?: any[]; // Consider using a more specific type
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & I_BabylonEntityScriptProperties & {
            autoClear?: boolean;
            clearColor?: Primitive.I_Color3;
            ambientColor?: Primitive.I_Color3;
            gravity?: Primitive.I_Vector3;
            activeCamera?: string;
            collisionsEnabled?: boolean;
            physicsEnabled?: boolean;
            physicsGravity?: Primitive.I_Vector3;
            physicsEngine?: string;
            autoAnimate?: boolean;
            autoAnimateFrom?: number;
            autoAnimateTo?: number;
            autoAnimateLoop?: boolean;
            autoAnimateSpeed?: number;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    }

    export interface I_Node {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        camera?: string;
        children?: any[]; // Consider using a more specific type
        skin?: string;
        matrix?: number[];
        mesh?: string;
        rotation?: number[];
        scale?: number[];
        translation?: number[];
        weights?: any[];
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & I_BabylonEntityScriptProperties & {
            [key: string]: unknown;
        };
    }

    export interface I_Mesh {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        primitives: any[]; // Consider using a more specific type
        weights?: any[];
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Material {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        pbrMetallicRoughness?: any; // Consider using a more specific type
        normalTexture?: any;
        occlusionTexture?: any;
        emissiveTexture?: any;
        emissiveFactor?: number[];
        alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND';
        alphaCutoff?: number;
        doubleSided?: boolean;
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        };
    }

    export interface I_Texture {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        sampler?: string;
        source?: string;
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Image {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        uri?: string;
        mimeType?: string;
        bufferView?: string;
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Sampler {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        magFilter?: number;
        minFilter?: number;
        wrapS?: number;
        wrapT?: number;
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Animation {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        channels: any[]; // Consider using a more specific type
        samplers: any[]; // Consider using a more specific type
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Skin {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        inverseBindMatrices?: string;
        skeleton?: string;
        joints: any[]; // Consider using a more specific type
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Camera {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        type: 'perspective' | 'orthographic';
        orthographic?: any; // Consider using a more specific type
        perspective?: any; // Consider using a more specific type
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & I_BabylonEntityScriptProperties & {
            [key: string]: unknown;
        };
    }

    export interface I_Buffer {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        uri?: string;
        byteLength: number;
        data?: Uint8Array; // Assuming BYTEA is represented as Uint8Array in TypeScript
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_BufferView {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        buffer: string;
        byteOffset?: number;
        byteLength: number;
        byteStride?: number;
        target?: number;
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export interface I_Accessor {
        vircadia_uuid: string;
        vircadia_world_uuid: string;
        name?: string;
        bufferView?: string;
        byteOffset?: number;
        componentType: number;
        normalized?: boolean;
        count: number;
        type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4';
        max?: any[];
        min?: any[];
        sparse?: {
            count: number;
            indices: {
                bufferView: string;
                componentType: number;
            };
            values: {
                bufferView: string;
            };
        };
        extensions?: Record<string, unknown>;
        extras?: I_CommonEntityProperties & {
            [key: string]: unknown;
        }
    }

    export namespace Mutation {
        
    }
}

export namespace Agent {
    export enum E_ChannelEvent {
        AGENT_JOINED = 'agent-joined',
        AGENT_LEFT = 'agent-left',
        AGENT_METADATA_UPDATED = 'agent-metadata-updated',
    }

    export enum E_SignalType {
        AGENT_Offer = 'agent-agent-offer-packet',
        AGENT_Answer = 'agent-agent-answer-packet',
        AGENT_ICE_Candidate = 'agent-agent-ice-candidate-packet',
    }

    export enum E_ChannelType {
        AGENT_METADATA = 'agent_metadata',
        SIGNALING_CHANNEL = 'signaling_channel',
    }

    const MetadataSchema = z.object({
        agentId: z.string(),
        position: Primitive.S_Vector3,
        orientation: Primitive.S_Vector3,
        onlineAt: z.string(),
    });

    export class C_Metadata {
        agentId: string;
        position: Primitive.C_Vector3;
        orientation: Primitive.C_Vector3;
        onlineAt: string;

        constructor(data: z.infer<typeof MetadataSchema>) {
            this.agentId = data.agentId;
            this.position = new Primitive.C_Vector3(data.position.x, data.position.y, data.position.z);
            this.orientation = new Primitive.C_Vector3(data.orientation.x, data.orientation.y, data.orientation.z);
            this.onlineAt = data.onlineAt;
        }

        static parse(obj: {
            agentId: string | any
            position: { x: number; y: number; z: number } | any
            orientation: { x: number; y: number; z: number } | any
            onlineAt: string | any
        }): C_Metadata {
            const parsedData = MetadataSchema.parse(obj);
            return new C_Metadata(parsedData);
        }
    }

    export enum E_WorldTransportChannel {
        WORLD_METADATA = 'world_metadata',
        SCENE_DATA = 'scene_data',
    }
}

export namespace Server {
    export enum E_HTTPRoute {
        API = '/api',
        GRAPHQL = '/graphql',
        STORAGE = '/storage',
        STUDIO = '/studio',
        INBUCKET = '/inbucket',
        DB = '/db',
    }

    export enum E_HTTPRequestPath {
        CONFIG_AND_STATUS = '/config-and-status',
    }

    export interface I_REQUEST_ConfigAndStatusResponse {
        API_URL: string | null;
        S3_STORAGE_URL: string | null;
    }
}
