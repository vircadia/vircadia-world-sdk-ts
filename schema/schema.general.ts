import { z } from "zod";
import type { Scene } from "@babylonjs/core";

export namespace Entity {
    export type T_EntityScriptStatus =
        | "ACTIVE"
        | "AWAITING_SCRIPTS"
        | "INACTIVE";

    export interface I_Entity {
        general__entity_id: string;
        general__entity_name: string;
        general__semantic_version: string;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
        general__load_priority?: number;
        general__initialized_at?: string;
        general__initialized_by?: string;
        meta__data: Record<string, object>;
        scripts__ids: string[];
        scripts__status: T_EntityScriptStatus;
        assets__ids: string[];
        validation__log?: Array<{
            timestamp: string;
            agent_id: string;
            entity_script_id: string;
            query: string;
        }>;
        group__sync: string;
    }

    export namespace Asset {
        export interface I_Asset {
            general__asset_name: string;
            general__asset_id: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            group__sync: string;

            // Asset fields
            asset__data: string;
            meta__data: Record<string, object>;
        }
    }

    export namespace Script {
        export enum E_CompilationStatus {
            PENDING = "PENDING",
            COMPILING = "COMPILING",
            COMPILED = "COMPILED",
            FAILED = "FAILED",
        }

        export interface I_Script {
            general__script_id: string;
            general__script_name: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            group__sync: string;

            // Source fields
            source__repo__entry_path?: string;
            source__repo__url?: string;

            // Node platform
            compiled__node__script?: string;
            compiled__node__script_sha256?: string;
            compiled__node__status?: E_CompilationStatus;
            compiled__node__updated_at?: string;

            // Bun platform
            compiled__bun__script?: string;
            compiled__bun__script_sha256?: string;
            compiled__bun__status?: E_CompilationStatus;
            compiled__bun__updated_at?: string;

            // Browser platform
            compiled__browser__script?: string;
            compiled__browser__script_sha256?: string;
            compiled__browser__status?: E_CompilationStatus;
            compiled__browser__updated_at?: string;
        }

        export enum E_Platform {
            NODE = "node",
            BUN = "bun",
            BROWSER = "browser",
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
                    // TODO: Determine if we need to give scripts SQL access, maybe safer not to, or only with elevated scripts.
                    // Query: {
                    //     executeSqlQuery: (
                    //         query: string,
                    //         parameters?: any[],
                    //     ) => Promise<any[]>;
                    // };
                    Hook: I_Hook;
                    Tick: {
                        getCurrentTick: () => Tick.I_Tick;
                    };
                    State: {
                        getCurrentState: () => Entity.I_Entity;
                        getLastKnownState: () => Entity.I_Entity;
                        getPastStates: (count: number) => Entity.I_Entity[];
                    };
                    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
                    tickInfo: Tick.I_Tick,
                ) => void;
                onEntityBeforeUnmount?: () => void;
            }
        }
    }
}

export namespace Tick {
    export interface I_Tick {
        // General fields
        general__tick_id: string;

        // Tick specific fields
        tick__number: number;
        group__sync: string;
        tick__start_time: string;
        tick__end_time: string;
        tick__duration_ms: number;
        tick__entity_states_processed: number;
        tick__script_states_processed: number;
        tick__asset_states_processed: number;
        tick__is_delayed: boolean;
        tick__headroom_ms?: number;
        tick__time_since_last_tick_ms?: number;
    }

    export interface I_EntityUpdate {
        general__entity_id: string;
        operation: Config.E_OperationType;
        changes: Config.E_OperationType extends "INSERT"
            ? Entity.I_Entity
            : DeepPartial<Entity.I_Entity>;
    }

    export interface I_ScriptUpdate {
        general__script_id: string;
        operation: Config.E_OperationType;
        changes: Config.E_OperationType extends "INSERT"
            ? Entity.Script.I_Script
            : DeepPartial<Entity.Script.I_Script>;
    }

    export interface I_AssetUpdate {
        general__asset_id: string;
        operation: Config.E_OperationType;
        changes: Config.E_OperationType extends "INSERT"
            ? Entity.Asset.I_Asset
            : DeepPartial<Entity.Asset.I_Asset>;
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
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";

    export type T_ConfigKey = "auth" | "entity" | "network" | "database";
    export enum E_ConfigKey {
        AUTH = "auth",
        ENTITY = "entity",
        NETWORK = "network",
        DATABASE = "database",
    }

    export interface ConfigValueMap {
        auth: I_Auth;
        entity: I_Entity;
        network: I_Network;
        database: I_Database;
    }

    export interface I_Config<K extends T_ConfigKey = T_ConfigKey> {
        general__key: K;
        general__value: ConfigValueMap[K];
        general__description?: string;
    }

    interface I_Entity {
        script_compilation_timeout_ms: number;
    }

    interface I_Network {
        max_latency_ms: number;
        warning_latency_ms: number;
        consecutive_warnings_before_kick: number;
        measurement_window_ticks: number;
        packet_loss_threshold_percent: number;
    }

    interface I_Auth {
        default_session_duration_jwt_string: string;
        default_session_duration_ms: number;
        default_session_max_age_ms: number;
        jwt_secret: string;
        session_cleanup_interval: number;
        session_inactive_expiry_ms: number;
        session_max_per_agent: number;
        heartbeat_interval_ms: number;
        heartbeat_inactive_expiry_ms: number;
    }

    interface I_Database {
        major_version: number;
        minor_version: number;
        patch_version: number;
        migration_timestamp: string;
    }
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
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

    export namespace SyncGroup {
        export interface I_SyncGroup {
            general__sync_group: string;
            general__description?: string;

            server__tick__rate_ms: number;
            server__tick__max_ticks_buffer: number;

            client__render_delay_ms: number;
            client__max_prediction_time_ms: number;

            network__packet_timing_variance_ms: number;

            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
        }

        export interface I_Role {
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
}

export namespace Communication {
    export const WS_PATH = "/world/ws";
    export const REST_BASE_PATH = "/world/auth";

    export namespace WebSocket {
        export enum MessageType {
            GENERAL_ERROR_RESPONSE = "GENERAL_ERROR_RESPONSE",
            CONNECTION_ESTABLISHED_RESPONSE = "CONNECTION_ESTABLISHED_RESPONSE",
            HEARTBEAT_REQUEST = "HEARTBEAT_REQUEST",
            HEARTBEAT_RESPONSE = "HEARTBEAT_RESPONSE",
            QUERY_REQUEST = "QUERY_REQUEST",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            SYNC_GROUP_UPDATES_RESPONSE = "SYNC_GROUP_UPDATES_RESPONSE",
            CLIENT_CONFIG_REQUEST = "CLIENT_CONFIG_REQUEST",
            CLIENT_CONFIG_RESPONSE = "CLIENT_CONFIG_RESPONSE",
        }

        export abstract class BaseMessage {
            public readonly timestamp: number;
            public readonly transactionId: string;
            public readonly error: string | null;
            public abstract readonly type: MessageType;

            constructor() {
                this.timestamp = Date.now();
                this.transactionId = crypto.randomUUID();
                this.error = null;
            }
        }

        export class GeneralErrorResponseMessage extends BaseMessage {
            public readonly type = MessageType.GENERAL_ERROR_RESPONSE;

            constructor(public readonly error: string) {
                super();
            }
        }

        export class ConnectionEstablishedResponseMessage extends BaseMessage {
            public readonly type = MessageType.CONNECTION_ESTABLISHED_RESPONSE;

            constructor(public readonly agentId: string) {
                super();
            }
        }

        export class HeartbeatRequestMessage extends BaseMessage {
            public readonly type = MessageType.HEARTBEAT_REQUEST;

            constructor(public readonly agentId: string) {
                super();
            }
        }

        export class HeartbeatResponseMessage extends BaseMessage {
            public readonly type = MessageType.HEARTBEAT_RESPONSE;

            constructor(public readonly agentId: string) {
                super();
            }
        }

        export class QueryRequestMessage extends BaseMessage {
            public readonly type = MessageType.QUERY_REQUEST;

            constructor(
                public readonly query: string,
                public readonly parameters?: any[],
            ) {
                super();
            }
        }

        export class QueryResponseMessage extends BaseMessage {
            public readonly type = MessageType.QUERY_RESPONSE;

            constructor(
                public readonly result?: any[],
                public readonly error: string | null = null,
            ) {
                super();
            }
        }

        export class SyncGroupUpdatesResponseMessage extends BaseMessage {
            public readonly type = MessageType.SYNC_GROUP_UPDATES_RESPONSE;

            constructor(
                public entities: Array<{
                    entityId: string;
                    changes: DeepPartial<Entity.I_Entity>;
                    operation: Config.E_OperationType;
                    error?: string | null;
                }>,
                public scripts: Array<{
                    scriptId: string;
                    changes: DeepPartial<Entity.Script.I_Script>;
                    operation: Config.E_OperationType;
                    error?: string | null;
                }>,
                public assets: Array<{
                    assetId: string;
                    changes: DeepPartial<Entity.Asset.I_Asset>;
                    operation: Config.E_OperationType;
                    error?: string | null;
                }>,
            ) {
                super();
            }
        }

        export class ClientConfigRequestMessage extends BaseMessage {
            public readonly type = MessageType.CLIENT_CONFIG_REQUEST;

            constructor(public readonly agentId: string) {
                super();
            }
        }

        export class ClientConfigResponseMessage extends BaseMessage {
            public readonly type = MessageType.CLIENT_CONFIG_RESPONSE;

            constructor(public readonly config: {}) {
                super();
            }
        }

        export type Message =
            | ConnectionEstablishedResponseMessage
            | HeartbeatRequestMessage
            | HeartbeatResponseMessage
            | QueryRequestMessage
            | QueryResponseMessage
            | SyncGroupUpdatesResponseMessage
            | ClientConfigRequestMessage
            | ClientConfigResponseMessage;

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

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
