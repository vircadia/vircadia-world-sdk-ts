import { z } from "zod";
import type { Scene } from "@babylonjs/core";

export namespace Entity {
    export type E_Status = "ACTIVE" | "AWAITING_SCRIPTS" | "INACTIVE";

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
        scripts__status: E_Status;
        validation__log?: Array<{
            timestamp: string;
            agent_id: string;
            entity_script_id: string;
            query: string;
        }>;
        group__sync: string;
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
            group__sync: string;

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
                        getCurrentTick: () => Tick.I_TickMetadata;
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
                    tickInfo: Tick.I_TickMetadata,
                ) => void;
                onEntityBeforeUnmount?: () => void;
            }
        }
    }
}

export namespace Tick {
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";

    export interface I_TickMetadata {
        tick_number: number;
        tick_start_time: string;
        tick_end_time: string;
        tick_duration_ms: number;
        is_delayed: boolean;
        headroom_ms: number;
        delta_time_ms: number;
        time_until_next_tick_ms: number;
        tick_lag: number;
        entity_states_processed: number;
        script_states_processed: number;
        rate_limited: boolean;
    }

    export interface I_EntityUpdate {
        entityId: string;
        operation: E_OperationType;
        entityChanges: E_OperationType extends "INSERT"
            ? Entity.I_Entity
            : DeepPartial<Entity.I_Entity>;
        sessionIds: string[];
    }

    export interface I_ScriptUpdate {
        scriptId: string;
        operation: E_OperationType;
        scriptChanges: E_OperationType extends "INSERT"
            ? Entity.Script.I_Script
            : DeepPartial<Entity.Script.I_Script>;
        sessionIds: string[];
    }

    export interface I_TickState {
        tick_data: I_TickMetadata;
        entity_updates: I_EntityUpdate[];
        script_updates: I_ScriptUpdate[];
    }

    export interface I_WorldTick {
        general__tick_id: string;
        tick__number: number;
        group__sync: string;
        tick__start_time: string;
        tick__end_time: string;
        tick__duration_ms: number;
        tick__states_processed: number;
        tick__is_delayed: boolean;
        tick__headroom_ms: number;
        tick__rate_limited: boolean;
        tick__time_since_last_tick_ms: number;
        general__created_at?: string;
        general__updated_at?: string;
        general__created_by?: string;
        general__updated_by?: string;
    }

    export interface I_EntityState extends Entity.I_Entity {
        general__entity_state_id: string;
        general__tick_id: string;
    }

    export interface I_ScriptState extends Entity.Script.I_Script {
        general__script_state_id: string;
        general__tick_id: string;
    }
}

export namespace Config {
    export interface I_Config {
        general__key: string;
        general__value: any;
        general__description?: string;
    }

    export const CONFIG_KEYS = {
        // General settings
        TICK_BUFFER_DURATION: "general__tick_buffer_duration_ms",
        TICK_METRICS_HISTORY: "general__tick_metrics_history_ms",

        // Network settings
        NETWORK_MAX_LATENCY: "network__max_latency_ms",
        NETWORK_WARNING_LATENCY: "network__warning_latency_ms",
        NETWORK_CONSECUTIVE_WARNINGS:
            "network__consecutive_warnings_before_kick",
        NETWORK_MEASUREMENT_WINDOW: "network__measurement_window_ticks",
        NETWORK_PACKET_LOSS_THRESHOLD: "network__packet_loss_threshold_percent",

        // Session settings
        SESSION_MAX_AGE: "session__max_age_ms",
        SESSION_CLEANUP_INTERVAL: "session__cleanup_interval_ms",
        SESSION_INACTIVE_TIMEOUT: "session__inactive_timeout_ms",
        SESSION_MAX_PER_AGENT: "session__max_sessions_per_agent",

        // Auth settings
        AUTH_SESSION_DURATION_JWT: "auth__session_duration_jwt",
        AUTH_SESSION_DURATION_MS: "auth__session_duration_ms",
        AUTH_SECRET_JWT: "auth__secret_jwt",
        AUTH_SESSION_DURATION_ADMIN_JWT: "auth__session_duration_admin_jwt",
        AUTH_SESSION_DURATION_ADMIN_MS: "auth__session_duration_admin_ms",
        AUTH_WS_CHECK_INTERVAL: "auth__ws_check_interval",

        // Heartbeat settings
        HEARTBEAT_INTERVAL: "heartbeat__interval_ms",
        HEARTBEAT_TIMEOUT: "heartbeat__timeout_ms",

        // Database version
        DATABASE_VERSION_MAJOR: "database__major_version",
        DATABASE_VERSION_MINOR: "database__minor_version",
        DATABASE_VERSION_PATCH: "database__patch_version",
        DATABASE_MIGRATION_TIMESTAMP: "database__migration_timestamp",
    } as const;
}

export namespace Auth {
    export interface I_Profile {
        general__agent_profile_id: string;
        profile__username: string;
        auth__email: string;
        auth__is_admin: boolean;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    export interface I_AuthProvider {
        auth__agent_id: string;
        auth__provider_name: string;
        auth__provider_uid: string;
        auth__refresh_token?: string;
        auth__provider_email?: string;
        auth__is_primary: boolean;
        auth__metadata?: Record<string, any>;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
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
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    export interface I_SyncGroup {
        general__sync_group: string;
        general__description?: string;
        server__tick__rate_ms: number;
        server__tick__buffer: number;
        client__render_delay_ms: number;
        client__max_prediction_time_ms: number;
        network__packet_timing_variance_ms: number;
        server__keyframe__interval_ticks: number;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    export interface I_SyncGroupRole {
        auth__agent_id: string;
        group__sync: string;
        permissions__can_insert: boolean;
        permissions__can_update: boolean;
        permissions__can_delete: boolean;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }
}

export namespace Communication {
    export const WS_PATH = "/world/ws";
    export const REST_BASE_PATH = "/world/auth";

    export namespace WebSocket {
        export enum MessageType {
            CONNECTION_ESTABLISHED_RESPONSE = "CONNECTION_ESTABLISHED_RESPONSE",
            ERROR_RESPONSE = "ERROR_RESPONSE",
            HEARTBEAT_REQUEST = "HEARTBEAT_REQUEST",
            HEARTBEAT_RESPONSE = "HEARTBEAT_RESPONSE",
            CONFIG_REQUEST = "CONFIG_REQUEST",
            CONFIG_RESPONSE = "CONFIG_RESPONSE",
            QUERY_REQUEST = "QUERY_REQUEST",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            NOTIFICATION_ENTITY_UPDATE = "NOTIFICATION_ENTITY_UPDATE",
            NOTIFICATION_ENTITY_SCRIPT_UPDATE = "NOTIFICATION_ENTITY_SCRIPT_UPDATE",
            KEYFRAME_ENTITIES_REQUEST = "KEYFRAME_ENTITIES_REQUEST",
            KEYFRAME_ENTITIES_RESPONSE = "KEYFRAME_ENTITIES_RESPONSE",
            KEYFRAME_ENTITY_SCRIPTS_REQUEST = "KEYFRAME_ENTITY_SCRIPTS_REQUEST",
            KEYFRAME_ENTITY_SCRIPTS_RESPONSE = "KEYFRAME_ENTITY_SCRIPTS_RESPONSE",
        }

        export interface BaseMessage {
            timestamp: number;
            type: MessageType;
        }

        export interface ConnectionEstablishedResponseMessage
            extends BaseMessage {
            type: MessageType.CONNECTION_ESTABLISHED_RESPONSE;
            agentId: string;
        }

        export interface ErrorResponseMessage extends BaseMessage {
            type: MessageType.ERROR_RESPONSE;
            message: string;
        }

        export interface HeartbeatRequestMessage extends BaseMessage {
            type: MessageType.HEARTBEAT_REQUEST;
        }

        export interface HeartbeatResponseMessage extends BaseMessage {
            type: MessageType.HEARTBEAT_RESPONSE;
        }

        export interface ConfigRequestMessage extends BaseMessage {
            type: MessageType.CONFIG_REQUEST;
        }

        export interface ConfigResponseMessage extends BaseMessage {
            type: MessageType.CONFIG_RESPONSE;
            config: Config.I_ClientSettings;
        }

        export interface QueryRequestMessage extends BaseMessage {
            type: MessageType.QUERY_REQUEST;
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

        export interface NotificationEntityUpdatesMessage extends BaseMessage {
            type: MessageType.NOTIFICATION_ENTITY_UPDATE;
            tickMetadata: Tick.I_TickMetadata;
            entities: Array<{
                id: string;
                operation: Tick.E_OperationType;
                entityChanges: DeepPartial<Entity.I_Entity>;
            }>;
        }

        export interface NotificationEntityScriptUpdatesMessage
            extends BaseMessage {
            type: MessageType.NOTIFICATION_ENTITY_SCRIPT_UPDATE;
            tickMetadata: Tick.I_TickMetadata;
            scripts: Array<{
                id: string;
                operation: Tick.E_OperationType;
                scriptChanges: DeepPartial<Entity.Script.I_Script>;
            }>;
        }

        export interface KeyframeEntitiesRequestMessage extends BaseMessage {
            type: MessageType.KEYFRAME_ENTITIES_REQUEST;
            syncGroup: string;
        }

        export interface KeyframeEntitiesResponseMessage extends BaseMessage {
            type: MessageType.KEYFRAME_ENTITIES_RESPONSE;
            entities: Entity.I_Entity[];
        }

        export interface KeyframeEntityScriptsRequestMessage
            extends BaseMessage {
            type: MessageType.KEYFRAME_ENTITY_SCRIPTS_REQUEST;
            syncGroup: string;
        }

        export interface KeyframeEntityScriptsResponseMessage
            extends BaseMessage {
            type: MessageType.KEYFRAME_ENTITY_SCRIPTS_RESPONSE;
            scripts: Entity.Script.I_Script[];
        }

        export type Message =
            | ConnectionEstablishedResponseMessage
            | ErrorResponseMessage
            | HeartbeatRequestMessage
            | HeartbeatResponseMessage
            | ConfigRequestMessage
            | ConfigResponseMessage
            | QueryRequestMessage
            | QueryResponseMessage
            | NotificationEntityUpdatesMessage
            | NotificationEntityScriptUpdatesMessage
            | KeyframeEntitiesRequestMessage
            | KeyframeEntitiesResponseMessage
            | KeyframeEntityScriptsRequestMessage
            | KeyframeEntityScriptsResponseMessage;

        export type MessageWithoutTimestamp<T extends Message> = Omit<
            T,
            "timestamp"
        >;

        export function createMessage<T extends Message>(
            message: MessageWithoutTimestamp<T>,
        ): T {
            return {
                ...message,
                timestamp: Date.now(),
            } as T;
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
