/* eslint-disable no-unused-vars */

import { z } from 'zod';

export namespace Primitive {
    export const Vector3Schema = z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
    });

    export class Vector3 {
        public x: number;
        public y: number;
        public z: number;

        constructor(public _x: number = 0, public _y: number = 0, public _z: number = 0) {
            this.x = _x;
            this.y = _y;
            this.z = _z;
        }

        static parse(obj: {
            x: number | any
            y: number | any
            z: number | any
        }): Vector3 {
            const parsedData = Vector3Schema.parse(obj);
            return new Vector3(parsedData.x, parsedData.y, parsedData.z);
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
        position: Primitive.Vector3Schema,
        orientation: Primitive.Vector3Schema,
        onlineAt: z.string(),
    });

    export class Metadata {
        agentId: string;
        position: Primitive.Vector3;
        orientation: Primitive.Vector3;
        onlineAt: string;

        constructor(data: z.infer<typeof MetadataSchema>) {
            this.agentId = data.agentId;
            this.position = new Primitive.Vector3(data.position.x, data.position.y, data.position.z);
            this.orientation = new Primitive.Vector3(data.orientation.x, data.orientation.y, data.orientation.z);
            this.onlineAt = data.onlineAt;
        }

        static parse(obj: {
            agentId: string | any
            position: { x: number; y: number; z: number } | any
            orientation: { x: number; y: number; z: number } | any
            onlineAt: string | any
        }): Metadata {
            const parsedData = MetadataSchema.parse(obj);
            return new Metadata(parsedData);
        }
    }
}

export enum E_WorldTransportChannel {
    WORLD_METADATA = 'world_metadata',
    SCENE_DATA = 'scene_data',
}

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

