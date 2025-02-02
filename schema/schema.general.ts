import { z } from "zod";
import type { Scene } from "@babylonjs/core";

export namespace Entity {
    export interface I_Entity {
        general__entity_id: string;
        general__name: string;
        general__semantic_version: string;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
        general__load_priority?: number;
        general__initialized_at?: string;
        general__initialized_by?: string;
        meta__data: {
            babylon_js: {
                model_url: string;
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                    w: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        };
        scripts__ids: string[];
        validation__log?: Array<{
            timestamp: string;
            agent_id: string;
            entity_script_id: string;
            query: string;
        }>;
        performance__sync_group: string;
        permissions__roles__view?: string[];
        permissions__roles__full?: string[];
    }

    export namespace Script {
        export interface I_Script {
            general__script_id: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;

            script__source__node__repo__entry_path?: string;
            script__source__node__repo__url?: string;
            script__compiled__node__script?: string;
            script__compiled__node__script_sha256?: string;
            script__compiled__node__script_status?: E_CompilationStatus;
            script__compiled__node__updated_at?: string;

            script__source__bun__repo__entry_path?: string;
            script__source__bun__repo__url?: string;
            script__compiled__bun__script?: string;
            script__compiled__bun__script_sha256?: string;
            script__compiled__bun__script_status?: E_CompilationStatus;
            script__compiled__bun__updated_at?: string;

            script__source__browser__repo__entry_path?: string;
            script__source__browser__repo__url?: string;
            script__compiled__browser__script?: string;
            script__compiled__browser__script_sha256?: string;
            script__compiled__browser__script_status?: E_CompilationStatus;
            script__compiled__browser__updated_at?: string;
        }

        export enum E_CompilationStatus {
            PENDING = "PENDING",
            COMPILED = "COMPILED",
            FAILED = "FAILED",
        }

        export interface SourceInfo {
            repo_entry_path?: string;
            repo_url?: string;
        }

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
                    Version: {
                        client: string;
                        server: string;
                    };
                    Query: {
                        executeSqlQuery: (
                            query: string,
                            parameters?: any[],
                        ) => Promise<any[]>;
                    };
                    Hook: I_Hook;
                    Tick: {
                        getCurrentTick: () => Tick.I_TickData;
                    };
                    State: {
                        getCurrentState: () => Entity.I_Entity;
                        getLastKnownState: () => Entity.I_Entity;
                        getPastStates: (count: number) => Entity.I_Entity[];
                    };
                    [key: string]: any;
                };
            }

            export interface I_Return {
                scriptFunction: (context: I_Context) => unknown;
                hooks: I_Hook;
            }

            export interface I_Hook {
                onScriptMount?: () => void;
                onScriptBeforeUnmount?: () => void;
                onEntityUpdate?: (
                    entity: Entity.I_Entity,
                    tickInfo: Tick.I_TickData,
                ) => void;
                onEntityBeforeUnmount?: () => void;
            }
        }
    }

    export namespace SyncGroup {
        export interface I_SyncGroup {
            server_tick_rate_ms: number;
            server_tick_buffer: number;
            client_render_delay_ms: number;
            client_max_prediction_time_ms: number;
            network_packet_timing_variance_ms: number;
        }
    }
}

export namespace Tick {
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";
    export type E_EntityStatus = "ACTIVE" | "AWAITING_SCRIPTS";

    export interface I_TickData {
        tickNumber: number;
        tickStartTime: Date;
        tickEndTime: Date;
        tickDurationMs: number;
        isDelayed: boolean;
        headroomMs: number;
        deltaTimeMs: number;
        timeUntilNextTickMs: number;
        tickLag: number;
        syncGroup: string;
    }

    export interface I_EntityUpdate {
        entityId: string;
        operation: E_OperationType;
        entityChanges: E_OperationType extends "INSERT"
            ? Entity.I_Entity
            : DeepPartial<Entity.I_Entity>;
        sessionIds: string[];
        entityStatus: E_EntityStatus;
    }

    export interface I_ScriptUpdate {
        scriptId: string;
        operation: E_OperationType;
        changes: E_OperationType extends "INSERT"
            ? Entity.Script.I_Script
            : DeepPartial<Entity.Script.I_Script>;
        sessionIds: string[];
    }

    export interface I_TickState {
        tickData: I_TickData;
        entityUpdates: I_EntityUpdate[];
        scriptUpdates: I_ScriptUpdate[];
    }
}

export namespace Config {
    export interface I_Config {
        general__key: string;
        general__value: any;
        general__description?: string;
        general__created_at?: string;
        general__updated_at?: string;
    }

    export interface I_ClientNetworkRequirements {
        max_latency_ms: number;
        warning_latency_ms: number;
        consecutive_warnings_before_kick: number;
        measurement_window_ticks: number;
        packet_loss_threshold_percent: number;
    }

    export interface I_ClientSettings {
        session: {
            max_age_ms: number;
            cleanup_interval_ms: number;
            inactive_timeout_ms: number;
            max_sessions_per_agent: number;
        };
        auth: {
            session_duration_jwt: string;
            session_duration_ms: number;
            secret_jwt: string;
            session_duration_admin_jwt: string;
            session_duration_admin_ms: number;
            ws_check_interval: number;
        };
        heartbeat: {
            interval_ms: number;
            timeout_ms: number;
        };
    }

    export interface I_DatabaseVersion {
        major: number;
        minor: number;
        patch: number;
        migration_timestamp: string;
    }

    export const CONFIG_KEYS = {
        TICK_BUFFER_DURATION: "tick_buffer_duration_ms",
        TICK_METRICS_HISTORY: "tick_metrics_history_ms",
        CLIENT_NETWORK_REQUIREMENTS: "client_network_requirements",
        CLIENT_SETTINGS: "client_settings",
        DATABASE_VERSION: "database_version",
    } as const;
}

export namespace Agent {
    export interface I_Profile {
        general__agent_profile_id: string;
        profile__username: string;
        auth__email: string;
        general__created_at?: string;
        general__updated_at?: string;
    }

    export interface I_AuthProvider {
        auth__agent_id: string;
        auth__provider_name: string;
        auth__provider_uid?: string;
        auth__is_primary: boolean;
        general__created_at?: string;
    }

    export interface I_Role {
        auth__role_name: string;
        meta__description?: string;
        auth__is_system: boolean;
        auth__entity__insert: boolean;
        general__created_at?: string;
    }

    export interface I_AgentRole {
        auth__agent_id: string;
        auth__role_name: string;
        auth__is_active: boolean;
        auth__granted_at?: string;
        auth__granted_by?: string;
    }

    export interface I_Session {
        general__session_id: string;
        auth__agent_id: string;
        auth__provider_name: string;
        session__started_at?: string;
        session__last_seen_at?: string;
        session__expires_at: string;
        session__jwt?: string;
        session__is_active: boolean;
        stats__last_subscription_message?: unknown;
        stats__last_subscription_message_at?: string;
    }

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
    export const WS_PATH = "/world/ws";
    export const REST_BASE_PATH = "/world/auth";

    export namespace WebSocket {
        export enum MessageType {
            CONNECTION_ESTABLISHED = "CONNECTION_ESTABLISHED",
            ERROR = "ERROR",
            HEARTBEAT = "HEARTBEAT",
            HEARTBEAT_ACK = "HEARTBEAT_ACK",
            CONFIG_REQUEST = "CONFIG_REQUEST",
            CONFIG_RESPONSE = "CONFIG_RESPONSE",
            QUERY = "QUERY",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            SUBSCRIBE = "SUBSCRIBE",
            SUBSCRIBE_RESPONSE = "SUBSCRIBE_RESPONSE",
            UNSUBSCRIBE = "UNSUBSCRIBE",
            UNSUBSCRIBE_RESPONSE = "UNSUBSCRIBE_RESPONSE",
            NOTIFICATION_ENTITY_UPDATE = "NOTIFICATION_ENTITY_UPDATE",
            NOTIFICATION_ENTITY_SCRIPT_UPDATE = "NOTIFICATION_ENTITY_SCRIPT_UPDATE",
        }

        export interface BaseMessage {
            type: MessageType;
        }

        export interface ConnectionEstablishedMessage extends BaseMessage {
            type: MessageType.CONNECTION_ESTABLISHED;
            agentId: string;
        }

        export interface ErrorMessage extends BaseMessage {
            type: MessageType.ERROR;
            message: string;
        }

        export interface HeartbeatMessage extends BaseMessage {
            type: MessageType.HEARTBEAT;
        }

        export interface HeartbeatAckMessage extends BaseMessage {
            type: MessageType.HEARTBEAT_ACK;
        }

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

        export interface QueryMessage extends BaseMessage {
            type: MessageType.QUERY;
            requestId: string;
            query: string;
            parameters?: any[];
        }

        export interface QueryResponseMessage extends BaseMessage {
            type: MessageType.QUERY_RESPONSE;
            requestId: string;
            results?: any[];
            error?: string;
        }

        export interface SubscribeMessage extends BaseMessage {
            type: MessageType.SUBSCRIBE;
            channel: string;
        }

        export interface SubscribeResponseMessage extends BaseMessage {
            type: MessageType.SUBSCRIBE_RESPONSE;
            channel: string;
            success: boolean;
            error?: string;
        }

        export interface UnsubscribeMessage extends BaseMessage {
            type: MessageType.UNSUBSCRIBE;
            channel: string;
        }

        export interface UnsubscribeResponseMessage extends BaseMessage {
            type: MessageType.UNSUBSCRIBE_RESPONSE;
            channel: string;
            success: boolean;
            error?: string;
        }

        export interface BaseEntityNotificationMessage extends BaseMessage {
            timestamp: string;
            tick: Tick.I_TickData;
        }

        export interface NotificationEntityUpdatesMessage
            extends BaseEntityNotificationMessage {
            type: MessageType.NOTIFICATION_ENTITY_UPDATE;
            entities: Array<{
                id: string;
                operation: Tick.E_OperationType;
                entityChanges: DeepPartial<Entity.I_Entity>;
                entityStatus: Tick.E_EntityStatus;
            }>;
        }

        export interface NotificationEntityScriptUpdatesMessage
            extends BaseEntityNotificationMessage {
            type: MessageType.NOTIFICATION_ENTITY_SCRIPT_UPDATE;
            scripts: Array<{
                id: string;
                operation: Tick.E_OperationType;
                scriptChanges: DeepPartial<Entity.Script.I_Script>;
            }>;
        }

        export type Message =
            | ConnectionEstablishedMessage
            | ErrorMessage
            | HeartbeatMessage
            | HeartbeatAckMessage
            | ConfigRequestMessage
            | ConfigResponseMessage
            | QueryMessage
            | QueryResponseMessage
            | SubscribeMessage
            | SubscribeResponseMessage
            | UnsubscribeMessage
            | UnsubscribeResponseMessage
            | NotificationEntityUpdatesMessage
            | NotificationEntityScriptUpdatesMessage;

        export function createMessage<T extends Message>(message: T): T {
            return message;
        }

        export function isMessageType<T extends Message>(
            message: Message,
            type: MessageType,
        ): message is T {
            return message.type === type;
        }
    }

    export namespace REST {
        export interface BaseResponse {
            success: boolean;
            timestamp: number;
            error?: string;
        }

        export interface Response<T = unknown> extends BaseResponse {
            data?: T;
        }

        export interface SessionValidationSuccessResponse extends BaseResponse {
            success: true;
            data: {
                isValid: boolean;
                agentId?: string;
                sessionId?: string;
            };
        }

        export interface SessionValidationErrorResponse extends BaseResponse {
            success: false;
            error: string;
        }

        export type SessionValidationResponse =
            | SessionValidationSuccessResponse
            | SessionValidationErrorResponse;

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

        export const Endpoint = {
            AUTH_SESSION_VALIDATE: {
                path: `${REST_BASE_PATH}/session/validate`,
                method: "POST",
                response: {} as SessionValidationResponse,
                createSuccess: (
                    isValid: boolean,
                    agentId?: string,
                    sessionId?: string,
                ): SessionValidationSuccessResponse => ({
                    success: true,
                    timestamp: Date.now(),
                    data: { isValid, agentId, sessionId },
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
                path: `${REST_BASE_PATH}/session/logout`,
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

// Add this type utility at the namespace level
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
