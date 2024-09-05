/* eslint-disable no-unused-vars */

import { z } from 'zod';
import * as GLTF2 from "babylonjs-gltf2interface";

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

        constructor(_x: number, _y: number, _z: number) {
            this.x = _x;
            this.y = _y;
            this.z = _z;
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

        constructor(_r: number, _g: number, _b: number) {
            this.r = _r;
            this.g = _g;
            this.b = _b;
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
    export interface I_World {
        defaultScene?: string;
        extensions?: Record<string, unknown>;
        extras: I_WorldMetadata;
        scenes: GLTF2.IScene[];
        nodes: GLTF2.INode[];
        meshes: GLTF2.IMesh[];
        materials: GLTF2.IMaterial[];
        textures: GLTF2.ITexture[];
        images: GLTF2.IImage[];
        samplers: GLTF2.ISampler[];
        animations: GLTF2.IAnimation[];
        skins: GLTF2.ISkin[];
        cameras: GLTF2.ICamera[];
        buffers: GLTF2.IBuffer[];
        bufferViews: GLTF2.IBufferView[];
        accessors: GLTF2.IAccessor[];
    }

    export interface I_WorldMetadata {
        id: string;
        name: string;
        version: string;
        createdAt: Date;
        updatedAt: Date;
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
    }

    export namespace Script {
        export interface I_Script {
            engine: {
                name: string;
                min_version?: string;
                max_version?: string;
            }
            language: string;
            script: string;
        }
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
