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

        export enum E_CompilationStatus {
            PENDING = "PENDING",
            COMPILING = "COMPILING",
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
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";

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
        operation: E_OperationType;
        changes: E_OperationType extends "INSERT"
            ? Entity.I_Entity
            : DeepPartial<Entity.I_Entity>;
        sync_group_session_ids: string[];
    }

    export interface I_ScriptUpdate {
        general__script_id: string;
        operation: E_OperationType;
        changes: E_OperationType extends "INSERT"
            ? Entity.Script.I_Script
            : DeepPartial<Entity.Script.I_Script>;
        sync_group_session_ids: string[];
    }

    export interface I_AssetUpdate {
        general__asset_id: string;
        operation: E_OperationType;
        changes: E_OperationType extends "INSERT"
            ? Entity.Asset.I_Asset
            : DeepPartial<Entity.Asset.I_Asset>;
        sync_group_session_ids: string[];
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
            CONNECTION_ESTABLISHED_RESPONSE = "CONNECTION_ESTABLISHED_RESPONSE",

            HEARTBEAT_REQUEST = "HEARTBEAT_REQUEST",
            HEARTBEAT_RESPONSE = "HEARTBEAT_RESPONSE",

            UPDATE_ENTITY_REQUEST = "UPDATE_ENTITY_REQUEST",
            UPDATE_ENTITY_RESPONSE = "UPDATE_ENTITY_RESPONSE",
            UPDATE_ENTITY_SCRIPT_REQUEST = "UPDATE_ENTITY_SCRIPT_REQUEST",
            UPDATE_ENTITY_SCRIPT_RESPONSE = "UPDATE_ENTITY_SCRIPT_RESPONSE",
            UPDATE_ENTITY_ASSET_REQUEST = "UPDATE_ENTITY_ASSET_REQUEST",
            UPDATE_ENTITY_ASSET_RESPONSE = "UPDATE_ENTITY_ASSET_RESPONSE",

            CHANGE_ENTITY_RESPONSE = "CHANGE_ENTITY_RESPONSE",
            CHANGE_ENTITY_SCRIPT_RESPONSE = "CHANGE_ENTITY_SCRIPT_RESPONSE",
            CHANGE_ENTITY_ASSET_RESPONSE = "CHANGE_ENTITY_ASSET_RESPONSE",

            GET_ENTITY_REQUEST = "GET_ENTITY_REQUEST",
            GET_ENTITY_RESPONSE = "GET_ENTITY_RESPONSE,",
            GET_ENTITY_SCRIPT_REQUEST = "GET_ENTITY_SCRIPT_REQUEST",
            GET_ENTITY_SCRIPT_RESPONSE = "GET_ENTITY_SCRIPT_RESPONSE",
            GET_ENTITY_ASSET_REQUEST = "GET_ENTITY_ASSET_REQUEST",
            GET_ENTITY_ASSET_RESPONSE = "GET_ENTITY_ASSET_RESPONSE",

            GET_ALL_ENTITIES_REQUEST = "GET_ALL_ENTITIES_REQUEST",
            GET_ALL_ENTITIES_RESPONSE = "GET_ALL_ENTITIES_RESPONSE",
            GET_ALL_ENTITY_SCRIPTS_REQUEST = "GET_ALL_ENTITY_SCRIPTS_REQUEST",
            GET_ALL_ENTITY_SCRIPTS_RESPONSE = "GET_ALL_ENTITY_SCRIPTS_RESPONSE",
            GET_ALL_ENTITY_ASSETS_REQUEST = "GET_ALL_ENTITY_ASSETS_REQUEST",
            GET_ALL_ENTITY_ASSETS_RESPONSE = "GET_ALL_ENTITY_ASSETS_RESPONSE",

            CLIENT_CONFIG_REQUEST = "CLIENT_CONFIG_REQUEST",
            CLIENT_CONFIG_RESPONSE = "CLIENT_CONFIG_RESPONSE",
        }

        export interface BaseMessage {
            timestamp: number;
            type: MessageType;
        }

        interface MessagePayloads {
            [MessageType.CONNECTION_ESTABLISHED_RESPONSE]: {
                agentId: string;
            };
            [MessageType.HEARTBEAT_REQUEST]: Record<string, never>;
            [MessageType.HEARTBEAT_RESPONSE]: Record<string, never>;
            [MessageType.UPDATE_ENTITY_REQUEST]: {
                entityId: string;
                entityChanges: DeepPartial<Entity.I_Entity>;
            };
            [MessageType.UPDATE_ENTITY_RESPONSE]: {
                entityId: string;
                success: boolean;
            };
            [MessageType.UPDATE_ENTITY_SCRIPT_REQUEST]: {
                scriptId: string;
                scriptChanges: DeepPartial<Entity.Script.I_Script>;
            };
            [MessageType.UPDATE_ENTITY_SCRIPT_RESPONSE]: {
                scriptId: string;
                success: boolean;
            };
            [MessageType.UPDATE_ENTITY_ASSET_REQUEST]: {
                assetId: string;
                assetChanges: DeepPartial<Entity.Asset.I_Asset>;
            };
            [MessageType.UPDATE_ENTITY_ASSET_RESPONSE]: {
                assetId: string;
                success: boolean;
            };
            [MessageType.CHANGE_ENTITY_RESPONSE]: {
                tickMetadata: Tick.I_Tick;
                entities: Array<{
                    id: string;
                    operation: Tick.E_OperationType;
                    entityChanges: DeepPartial<Entity.I_Entity>;
                }>;
            };
            [MessageType.CHANGE_ENTITY_SCRIPT_RESPONSE]: {
                tickMetadata: Tick.I_Tick;
                scripts: Array<{
                    id: string;
                    operation: Tick.E_OperationType;
                    scriptChanges: DeepPartial<Entity.Script.I_Script>;
                }>;
            };
            [MessageType.CHANGE_ENTITY_ASSET_RESPONSE]: {
                tickMetadata: Tick.I_Tick;
                assets: Array<{
                    id: string;
                    operation: Tick.E_OperationType;
                    assetChanges: DeepPartial<Entity.Asset.I_Asset>;
                }>;
            };
            [MessageType.GET_ENTITY_REQUEST]: {
                entityId: string;
            };
            [MessageType.GET_ENTITY_RESPONSE]: {
                entity?: Entity.I_Entity;
            };
            [MessageType.GET_ENTITY_SCRIPT_REQUEST]: {
                scriptId: string;
            };
            [MessageType.GET_ENTITY_SCRIPT_RESPONSE]: {
                script?: Entity.Script.I_Script;
            };
            [MessageType.GET_ENTITY_ASSET_REQUEST]: {
                assetId: string;
            };
            [MessageType.GET_ENTITY_ASSET_RESPONSE]: {
                asset?: Entity.Asset.I_Asset;
            };
            [MessageType.GET_ALL_ENTITIES_REQUEST]: {
                syncGroup: string;
            };
            [MessageType.GET_ALL_ENTITIES_RESPONSE]: {
                entities: Entity.I_Entity[];
            };
            [MessageType.GET_ALL_ENTITY_SCRIPTS_REQUEST]: {
                syncGroup: string;
            };
            [MessageType.GET_ALL_ENTITY_SCRIPTS_RESPONSE]: {
                scripts: Entity.Script.I_Script[];
            };
            [MessageType.GET_ALL_ENTITY_ASSETS_REQUEST]: {
                syncGroup: string;
            };
            [MessageType.GET_ALL_ENTITY_ASSETS_RESPONSE]: {
                assets: Entity.Asset.I_Asset[];
            };
            [MessageType.CLIENT_CONFIG_REQUEST]: Record<string, never>;
            [MessageType.CLIENT_CONFIG_RESPONSE]: {
                config: Config.ConfigValueMap;
            };
        }

        export type Message = {
            [K in MessageType]: BaseMessage & {
                type: K;
                error: string | null;
            } & MessagePayloads[K];
        }[MessageType];

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

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
