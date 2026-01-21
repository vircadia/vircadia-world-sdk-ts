import { z } from "zod";
import { Communication } from "./vircadia.schema.general";

export namespace Avatar {
    export interface I_AvatarJoint {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number; w: number };
        scale: { x: number; y: number; z: number };
    }

    export interface I_AvatarData {
        avatar__url?: string;
        avatar__scale?: number;
        avatar__data?: unknown; // Additional JSON data
        joints?: Record<string, I_AvatarJoint>;
    }

    // ======================= Zod Schemas =======================

    export const Z_AvatarJoint = z.object({
        position: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
        }),
        rotation: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
            w: z.number(),
        }),
        scale: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
        }),
    });

    export const Z_AvatarData = z.object({
        avatar__url: z.string().optional(),
        avatar__scale: z.number().optional(),
        avatar__data: z.unknown().optional(),
        joints: z.record(z.string(), Z_AvatarJoint).optional(),
    });

    // ======================= Messages (Set) =======================
    
    export class AvatarSetRequestMessage implements Communication.WebSocket.BaseMessage {
        public readonly type = Communication.WebSocket.AvatarMessageType.AVATAR_SET_REQUEST;
        public readonly timestamp: number;
        public requestId: string;
        public errorMessage: string | null;
        public syncGroup: string;
        public avatarData: I_AvatarData;

        constructor(data: {
            requestId: string;
            syncGroup: string;
            avatarData: I_AvatarData;
        }) {
            this.timestamp = Date.now();
            this.requestId = data.requestId;
            this.errorMessage = null;
            this.syncGroup = data.syncGroup;
            this.avatarData = data.avatarData;
        }
    }

    export class AvatarSetResponseMessage implements Communication.WebSocket.BaseMessage {
        public readonly type = Communication.WebSocket.AvatarMessageType.AVATAR_SET_RESPONSE;
        public readonly timestamp: number;
        public requestId: string;
        public errorMessage: string | null;
        public success: boolean;

        constructor(data: {
            requestId: string;
            success: boolean;
            errorMessage?: string | null;
        }) {
            this.timestamp = Date.now();
            this.requestId = data.requestId;
            this.errorMessage = data.errorMessage ?? null;
            this.success = data.success;
        }
    }

    // ======================= Messages (Query) =======================

    export class AvatarQueryRequestMessage implements Communication.WebSocket.BaseMessage {
        public readonly type = Communication.WebSocket.AvatarMessageType.AVATAR_QUERY_REQUEST;
        public readonly timestamp: number;
        public requestId: string;
        public errorMessage: string | null;
        public syncGroup: string;

        constructor(data: {
            requestId: string;
            syncGroup: string;
        }) {
            this.timestamp = Date.now();
            this.requestId = data.requestId;
            this.errorMessage = null;
            this.syncGroup = data.syncGroup;
        }
    }

    export class AvatarQueryResponseMessage implements Communication.WebSocket.BaseMessage {
        public readonly type = Communication.WebSocket.AvatarMessageType.AVATAR_QUERY_RESPONSE;
        public readonly timestamp: number;
        public requestId: string;
        public errorMessage: string | null;
        public success: boolean;
        public avatars: {
            sessionId: string;
            avatarData: I_AvatarData;
        }[];

        constructor(data: {
            requestId: string;
            success: boolean;
            avatars: { sessionId: string; avatarData: I_AvatarData }[];
            errorMessage?: string | null;
        }) {
            this.timestamp = Date.now();
            this.requestId = data.requestId;
            this.errorMessage = data.errorMessage ?? null;
            this.success = data.success;
            this.avatars = data.avatars;
        }
    }

    // ======================= Message Zod Schemas =======================

    export const Z_AvatarSetRequest = z.object({
        type: z.literal(Communication.WebSocket.AvatarMessageType.AVATAR_SET_REQUEST),
        timestamp: z.number(),
        requestId: z.string(),
        errorMessage: z.string().nullable(),
        syncGroup: z.string(),
        avatarData: Z_AvatarData,
    });

    export const Z_AvatarSetResponse = z.object({
        type: z.literal(Communication.WebSocket.AvatarMessageType.AVATAR_SET_RESPONSE),
        timestamp: z.number(),
        requestId: z.string(),
        errorMessage: z.string().nullable(),
        success: z.boolean(),
    });

    export const Z_AvatarQueryRequest = z.object({
        type: z.literal(Communication.WebSocket.AvatarMessageType.AVATAR_QUERY_REQUEST),
        timestamp: z.number().optional(),
        requestId: z.string().optional(),
        errorMessage: z.string().nullable().optional(),
        syncGroup: z.string().optional(),
    });

    export const Z_AvatarQueryResponse = z.object({
        type: z.literal(Communication.WebSocket.AvatarMessageType.AVATAR_QUERY_RESPONSE),
        timestamp: z.number(),
        requestId: z.string(),
        errorMessage: z.string().nullable(),
        success: z.boolean(),
        avatars: z.array(z.object({
            sessionId: z.string(),
            avatarData: Z_AvatarData,
        })),
    });
}
