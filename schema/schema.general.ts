import { z } from "zod";
import type postgres from "postgres";
import type { Scene } from "@babylonjs/core";

export namespace Script {
    export namespace Babylon {
        export interface I_Context extends Base.I_Context {
            Vircadia: Base.I_Context["Vircadia"] & {
                Babylon: {
                    Scene: Scene;
                };
            };
        }

        export interface I_Return extends Base.I_Return {}
    }

    export namespace Base {
        export interface I_Context {
            Vircadia: {
                Client: typeof postgres;
                Meta: {
                    isRunningOnClient: boolean;
                    isRunningOnWorld: boolean;
                };
                Hook: I_Hook;
                Performance: {
                    clientUpdateSyncMs: number;
                    clientKeyframeSyncMs: number;
                };
                [key: string]: any;
            };
        }

        export interface I_Return {
            scriptFunction: (context: I_Context) => unknown;
            hooks: I_Hook;
        }

        export interface I_Hook {
            onScriptBeforeUnmount?: () => void;
            onEntityBeforeUnmount?: () => void;
            onScriptMount?: () => void;
            onEngineUpdate?: () => void;
            onEngineFixedUpdate?: () => void;
            onEntityUpdate?: (entity: Entity.I_EntityData) => void;
            onEntityKeyframeUpdate?: (entity: Entity.I_EntityData) => void;
        }
    }
}

export namespace Entity {
    export interface I_EntityData {
        [key: string]: any;
    }
}

export namespace Agent {
    // TODO: The following will be implemented in scripts in the world directly.
    // export namespace WebRTC {
    // 	export enum E_SignalType {
    // 		AGENT_Offer = "agent-agent-offer-packet",
    // 		AGENT_Answer = "agent-agent-answer-packet",
    // 		AGENT_ICE_Candidate = "agent-agent-ice-candidate-packet",
    // 	}
    // }
    // export namespace Audio {
    // 	export const DEFAULT_PANNER_OPTIONS: PannerOptions = {
    // 		panningModel: "HRTF",
    // 		distanceModel: "inverse",
    // 		refDistance: 1,
    // 		maxDistance: 10000,
    // 	};
    // }
    // const MetadataSchema = z.object({
    // 	agentId: z.string(),
    // 	position: Primitive.S_Vector3,
    // 	orientation: Primitive.S_Vector3,
    // 	lastUpdated: z.string(),
    // });
    // export class C_Presence {
    // 	agentId: string;
    // 	position: Primitive.C_Vector3;
    // 	orientation: Primitive.C_Vector3;
    // 	lastUpdated: string;
    // 	constructor(data: z.infer<typeof MetadataSchema>) {
    // 		this.agentId = data.agentId;
    // 		this.position = new Primitive.C_Vector3(
    // 			data.position.x,
    // 			data.position.y,
    // 			data.position.z,
    // 		);
    // 		this.orientation = new Primitive.C_Vector3(
    // 			data.orientation.x,
    // 			data.orientation.y,
    // 			data.orientation.z,
    // 		);
    // 		this.lastUpdated = data.lastUpdated;
    // 	}
    // 	static parse(obj: {
    // 		agentId: string | any;
    // 		position: { x: number; y: number; z: number } | any;
    // 		orientation: { x: number; y: number; z: number } | any;
    // 		lastUpdated: string | any;
    // 	}): C_Presence {
    // 		const parsedData = MetadataSchema.parse(obj);
    // 		return new C_Presence(parsedData);
    // 	}
    // }
}

export namespace Communication {
    // Shared base URLs
    export const WS_BASE_URL = "/world/ws";
    export const REST_BASE_URL = "/world/auth";

    // WebSocket-specific namespace
    export namespace WebSocket {
        export enum MessageType {
            // System messages
            HEARTBEAT = "heartbeat",
            HEARTBEAT_ACK = "heartbeat_ack",
            CONNECTION_ESTABLISHED = "connection_established",
            CONNECTION_FAILED = "connection_failed",
            ERROR = "error",
            CONFIG_REQUEST = "config_request",
            CONFIG_RESPONSE = "config_response",

            // Agent messages
            AGENT_POSITION_UPDATE = "agent_position_update",
            AGENT_ORIENTATION_UPDATE = "agent_orientation_update",
            AGENT_STATE_UPDATE = "agent_state_update",

            // Entity messages
            ENTITY_UPDATE = "entity_update",
            ENTITY_CREATE = "entity_create",
            ENTITY_DELETE = "entity_delete",

            // World messages
            WORLD_STATE_UPDATE = "world_state_update",
        }

        export interface BaseMessage {
            type: MessageType;
            timestamp?: number;
        }

        // System Messages
        export interface HeartbeatMessage extends BaseMessage {
            type: MessageType.HEARTBEAT;
        }

        export interface HeartbeatAckMessage extends BaseMessage {
            type: MessageType.HEARTBEAT_ACK;
        }

        export interface ConnectionEstablishedMessage extends BaseMessage {
            type: MessageType.CONNECTION_ESTABLISHED;
            agentId: string;
        }

        export interface ConnectionFailedMessage extends BaseMessage {
            type: MessageType.CONNECTION_FAILED;
            reason: string;
            code?: number;
        }

        export interface ErrorMessage extends BaseMessage {
            type: MessageType.ERROR;
            message: string;
            code?: number;
        }

        // Configuration Messages
        export interface ConfigRequestMessage extends BaseMessage {
            type: MessageType.CONFIG_REQUEST;
        }

        export interface ConfigResponseMessage extends BaseMessage {
            type: MessageType.CONFIG_RESPONSE;
            config: {
                heartbeat: {
                    interval: number;
                    timeout: number;
                };
                session: {
                    max_session_age_ms: number;
                    cleanup_interval_ms: number;
                    inactive_timeout_ms: number;
                };
            };
        }

        // Agent Messages
        export interface AgentPositionUpdateMessage extends BaseMessage {
            type: MessageType.AGENT_POSITION_UPDATE;
            position: {
                x: number;
                y: number;
                z: number;
            };
        }

        export interface AgentOrientationUpdateMessage extends BaseMessage {
            type: MessageType.AGENT_ORIENTATION_UPDATE;
            orientation: {
                x: number;
                y: number;
                z: number;
                w: number;
            };
        }

        export interface AgentStateUpdateMessage extends BaseMessage {
            type: MessageType.AGENT_STATE_UPDATE;
            state: {
                position?: {
                    x: number;
                    y: number;
                    z: number;
                };
                orientation?: {
                    x: number;
                    y: number;
                    z: number;
                    w: number;
                };
                [key: string]: any;
            };
        }

        // Entity Messages
        export interface EntityUpdateMessage extends BaseMessage {
            type: MessageType.ENTITY_UPDATE;
            entityId: string;
            properties: {
                [key: string]: any;
            };
        }

        export interface EntityCreateMessage extends BaseMessage {
            type: MessageType.ENTITY_CREATE;
            entityId: string;
            properties: {
                [key: string]: any;
            };
        }

        export interface EntityDeleteMessage extends BaseMessage {
            type: MessageType.ENTITY_DELETE;
            entityId: string;
        }

        // World Messages
        export interface WorldStateUpdateMessage extends BaseMessage {
            type: MessageType.WORLD_STATE_UPDATE;
            state: {
                [key: string]: any;
            };
        }

        // Union type of all possible messages
        export type Message =
            | HeartbeatMessage
            | HeartbeatAckMessage
            | ConnectionEstablishedMessage
            | ConnectionFailedMessage
            | ErrorMessage
            | ConfigRequestMessage
            | ConfigResponseMessage
            | AgentPositionUpdateMessage
            | AgentOrientationUpdateMessage
            | AgentStateUpdateMessage
            | EntityUpdateMessage
            | EntityCreateMessage
            | EntityDeleteMessage
            | WorldStateUpdateMessage;

        // WebSocket-specific message creators
        export function createMessage<T extends Message>(message: T): T {
            return {
                ...message,
                timestamp: Date.now(),
            };
        }
    }

    // REST-specific namespace
    export namespace REST {
        // Base interfaces
        export interface BaseResponse {
            success: boolean;
            timestamp: number;
            error?: string;
        }

        export interface Response<T = unknown> extends BaseResponse {
            data?: T;
        }

        // Session validation endpoint interfaces
        export interface SessionValidationSuccessResponse extends BaseResponse {
            success: true;
            data: {
                isValid: boolean;
                agentId?: string;
            };
        }

        export interface SessionValidationErrorResponse extends BaseResponse {
            success: false;
            error: string;
        }

        export type SessionValidationResponse =
            | SessionValidationSuccessResponse
            | SessionValidationErrorResponse;

        // Session logout endpoint interfaces
        export interface SessionLogoutSuccessResponse extends BaseResponse {
            success: true;
        }

        export interface SessionLogoutErrorResponse extends BaseResponse {
            success: false;
            error: string;
        }

        export type SessionLogoutResponse =
            | SessionLogoutSuccessResponse
            | SessionLogoutErrorResponse;

        // Endpoint definitions with type safety and response creators
        export const Endpoint = {
            AUTH_SESSION_VALIDATE: {
                path: `${REST_BASE_URL}/session/validate`,
                method: "POST",
                response: {} as SessionValidationResponse,
                createSuccess: (
                    isValid: boolean,
                    agentId?: string,
                ): SessionValidationSuccessResponse => ({
                    success: true,
                    timestamp: Date.now(),
                    data: { isValid, agentId },
                }),
                createError: (
                    error: string,
                ): SessionValidationErrorResponse => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
            },
            AUTH_SESSION_LOGOUT: {
                path: `${REST_BASE_URL}/session/logout`,
                method: "POST",
                response: {} as SessionLogoutResponse,
                createSuccess: (): SessionLogoutSuccessResponse => ({
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): SessionLogoutErrorResponse => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
            },
        } as const;
    }
}
