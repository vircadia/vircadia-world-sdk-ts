import { z } from "zod";
import type { Scene } from "@babylonjs/core";

export namespace Config {
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";
}

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
        group__load_priority?: number;
        general__initialized_at?: string;
        general__initialized_by?: string;
        meta__data: Record<string, object>;
        script__names: string[];
        asset__names: string[];
        group__sync: string;
    }

    export namespace Asset {
        export enum E_AssetType {
            // 3D Models
            GLB = "GLB",
            GLTF = "GLTF",
            OBJ = "OBJ",
            FBX = "FBX",
            DAE = "DAE",
            STL = "STL",
            STEP = "STEP",
            IGES = "IGES",
            BLEND = "BLEND",
            X3D = "X3D",
            VRML = "VRML",
            BVH = "BVH",
            // Textures
            PNG = "PNG",
            JPEG = "JPEG",
            JPG = "JPG",
            TIFF = "TIFF",
            TIF = "TIF",
            GIF = "GIF",
            WEBP = "WEBP",
            BMP = "BMP",
            TGA = "TGA",
            HDR = "HDR",
            EXR = "EXR",
            KTX2 = "KTX2",
            // Video
            WEBM = "WEBM",
            MP4 = "MP4",
            MOV = "MOV",
            AVI = "AVI",
            // Audio
            MP3 = "MP3",
            WAV = "WAV",
            OGG = "OGG",
            AAC = "AAC",
            FLAC = "FLAC",
            // Material
            MTL = "MTL",
            MAT = "MAT",
            // Shaders
            GLSL = "GLSL",
            HLSL = "HLSL",
            WGSL = "WGSL",
            SPIRV = "SPIRV",
            COMP = "COMP",
            FRAG = "FRAG",
            VERT = "VERT",
            SHADERPAK = "SHADERPAK",
        }

        export interface I_Asset {
            general__asset_file_name: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            group__sync: string;

            // Asset fields
            asset__data: string;
            asset__type: E_AssetType;
        }
    }

    export namespace Script {
        export enum E_ScriptType {
            BABYLON_NODE = "BABYLON_NODE",
            BABYLON_BUN = "BABYLON_BUN",
            BABYLON_BROWSER = "BABYLON_BROWSER",
        }

        export enum E_CompilationStatus {
            PENDING = "PENDING",
            COMPILING = "COMPILING",
            COMPILED = "COMPILED",
            FAILED = "FAILED",
        }

        export interface I_Script {
            general__script_file_name: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            group__sync: string;

            script__source__repo__entry_path: string;
            script__source__repo__url: string;
            script__source__data: string;
            script__source__updated_at: string;

            // Script type
            script__type: E_ScriptType;

            // Compiled script fields
            script__compiled__data: string;
            script__compiled__status: E_CompilationStatus;
            script__compiled__updated_at: string;
        }

        export interface SourceInfo {
            repo_entry_path?: string;
            repo_url?: string;
        }

        export namespace Babylon {
            export interface I_Context extends Base.I_Context {
                Vircadia: Base.I_Context["Vircadia"] & {
                    v1: {
                        Babylon: {
                            Scene: Scene;
                        };
                        Hook: {
                            onScriptInitialize?: Base.I_Context["Vircadia"]["v1"]["Hook"]["onScriptInitialize"] &
                                ((scene: Scene) => void);
                        };
                    };
                };
            }

            export interface I_Return extends Base.I_Return {}
        }

        export namespace Base {
            export interface I_Context {
                Vircadia: {
                    v1: {
                        Query: {
                            execute: (
                                query: string,
                                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                                parameters?: any[],
                                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                            ) => Promise<any[]>;
                        };
                        Hook: {
                            // Script lifecycle hooks
                            onScriptInitialize?: (
                                entityData: Entity.I_Entity,
                                entityAssets: Entity.Asset.I_Asset[],
                            ) => void;
                            onEntityUpdate?: (
                                entityData: Entity.I_Entity,
                            ) => void;
                            onAssetUpdate?: (
                                assetData: Entity.Asset.I_Asset,
                            ) => void;
                            onScriptUpdate?: (
                                scriptData: Entity.Script.I_Script,
                            ) => void;
                            onScriptTeardown?: () => void;

                            // Network state hooks
                            onConnected?: () => void;
                            onDisconnected?: (reason?: string) => void;
                        };
                        Script: {
                            reload: () => void;
                        };
                        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                        [key: string]: any;
                    };
                };
            }

            export interface I_Return {
                scriptFunction: (context: I_Context) => unknown;
                hooks: Base.I_Context["Vircadia"]["v1"]["Hook"];
            }
        }
    }
}

export namespace Tick {
    export interface I_Tick {
        general__tick_id: string;
        tick__number: number;
        group__sync: string;
        tick__start_time: Date;
        tick__end_time: Date;
        tick__duration_ms: number;
        tick__entity_states_processed: number;
        tick__script_states_processed: number;
        tick__asset_states_processed: number;
        tick__is_delayed: boolean;
        tick__headroom_ms: number | null;
        tick__time_since_last_tick_ms: number | null;

        // DB-specific metrics
        tick__db__start_time: Date | null;
        tick__db__end_time: Date | null;
        tick__db__duration_ms: number | null;
        tick__db__is_delayed: boolean | null;

        // Manager-specific metrics
        tick__manager__start_time: Date | null;
        tick__manager__end_time: Date | null;
        tick__manager__duration_ms: number | null;
        tick__manager__is_delayed: boolean | null;
    }

    export interface I_EntityUpdate {
        general__entity_id: Pick<
            Entity.I_Entity,
            "general__entity_id"
        >["general__entity_id"];
        operation: Config.E_OperationType;
        changes: Config.E_OperationType extends "INSERT"
            ? Entity.I_Entity
            : DeepPartial<Entity.I_Entity>;
    }

    export interface I_ScriptUpdate {
        general__script_file_name: Pick<
            Entity.Script.I_Script,
            "general__script_file_name"
        >["general__script_file_name"];
        operation: Config.E_OperationType;
        changes: Config.E_OperationType extends "INSERT"
            ? Entity.Script.I_Script
            : DeepPartial<Entity.Script.I_Script>;
    }

    export interface I_AssetUpdate {
        general__asset_file_name: Pick<
            Entity.Asset.I_Asset,
            "general__asset_file_name"
        >["general__asset_file_name"];
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

    export interface I_TickNotification {
        syncGroup: string;
        tickId: string;
        tickNumber: number;
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
            server__tick__max_tick_count_buffer: number;

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
    export const WS_UPGRADE_PATH = "/world/ws";
    export const REST_BASE_PATH = "/world/rest";

    export namespace WebSocket {
        export enum MessageType {
            GENERAL_ERROR_RESPONSE = "GENERAL_ERROR_RESPONSE",
            QUERY_REQUEST = "QUERY_REQUEST",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            SYNC_GROUP_UPDATES_RESPONSE = "SYNC_GROUP_UPDATES_RESPONSE",
            TICK_NOTIFICATION = "TICK_NOTIFICATION",
        }

        interface BaseMessage {
            timestamp: number;
            requestId: string;
            errorMessage: string | null;
            type: MessageType;
        }

        export class GeneralErrorResponseMessage implements BaseMessage {
            public readonly type = MessageType.GENERAL_ERROR_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;

            constructor(data: {
                error: string;
                requestId: string;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.error;
            }
        }

        export class QueryRequestMessage implements BaseMessage {
            public readonly type = MessageType.QUERY_REQUEST;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public query: string;
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            public parameters?: any[];

            constructor(data: {
                query: string;
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                parameters?: any[];
                requestId: string;
                errorMessage: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage;
                this.query = data.query;
                this.parameters = data.parameters;
            }
        }

        export class QueryResponseMessage implements BaseMessage {
            public readonly type = MessageType.QUERY_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            public result?: any[];

            constructor(data: {
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                result?: any[];
                requestId: string;
                errorMessage: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage;
                this.result = data.result;
            }
        }

        export class TickNotificationMessage implements BaseMessage {
            public readonly type = MessageType.TICK_NOTIFICATION;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public tick: Tick.I_Tick;

            constructor(data: {
                tick: Tick.I_Tick;
                requestId: string;
                errorMessage: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage;
                this.tick = data.tick;
            }
        }

        export type Message =
            | QueryRequestMessage
            | QueryResponseMessage
            | TickNotificationMessage;

        export function isMessageType<T extends Message>(
            message: Message,
            type: MessageType,
        ): message is T {
            return message.type === type;
        }
    }

    export namespace REST {
        export enum E_Endpoint {
            AUTH_SESSION_VALIDATE = "AUTH_SESSION_VALIDATE",
        }

        export const Endpoint: {
            [key in E_Endpoint]: {
                path: string;
                method: "POST" | "GET" | "PUT" | "DELETE";
                // biome-ignore lint/suspicious/noExplicitAny: This interface needs to be flexible for different endpoint implementations
                createRequest: (...args: any[]) => string;
                // biome-ignore lint/suspicious/noExplicitAny: This interface needs to be flexible for different endpoint implementations
                createSuccess: (...args: any[]) => any;
                // biome-ignore lint/suspicious/noExplicitAny: This interface needs to be flexible for different endpoint implementations
                createError: (...args: any[]) => any;
            };
        } = {
            AUTH_SESSION_VALIDATE: {
                path: `${REST_BASE_PATH}/session/validate`,
                method: "POST",
                createRequest: (data: {
                    token: string;
                    provider: string;
                }): string =>
                    JSON.stringify({
                        token: data.token,
                        provider: data.provider,
                    }),
                createSuccess: (
                    _agentId: string,
                    _sessionId: string,
                ): {
                    success: true;
                    timestamp: number;
                } => ({
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (
                    error: string,
                ): {
                    success: false;
                    timestamp: number;
                    error: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
            },
        } as const;
    }
}

export namespace Service {
    export enum E_Service {
        WORLD_API_MANAGER = "vircadia_world_api_manager",
        WORLD_TICK_MANAGER = "vircadia_world_tick_manager",
        POSTGRES = "vircadia_world_postgres",
        PGWEB = "vircadia_world_pgweb",
    }

    export namespace API {
        export const Stats_Endpoint = {
            path: "/stats",
            method: "POST",
            createRequest: (): string => "",
            createSuccess: (data: {
                uptime: number;
                connections: {
                    active: number;
                };
                database: {
                    connected: boolean;
                };
                memory: {
                    heapUsed: number;
                };
                cpu: {
                    user: number;
                    system: number;
                };
            }): {
                uptime: number;
                connections: {
                    active: number;
                };
                database: {
                    connected: boolean;
                };
                memory: {
                    heapUsed: number;
                };
                cpu: {
                    user: number;
                    system: number;
                };
                success: true;
                timestamp: number;
            } => ({
                uptime: data.uptime,
                connections: data.connections,
                database: data.database,
                memory: data.memory,
                cpu: data.cpu,
                success: true,
                timestamp: Date.now(),
            }),
            createError: (
                error: string,
            ): {
                success: false;
                timestamp: number;
                error: string;
            } => ({
                success: false,
                timestamp: Date.now(),
                error,
            }),
        } as const;
    }

    export namespace Postgres {}

    export namespace PGWeb {}

    export namespace Tick {
        export const Stats_Endpoint = {
            method: "POST",
            path: "/stats",
            createRequest: (): string => "",
            createSuccess: (data: {
                uptime: number;
                database: {
                    connected: boolean;
                };
                memory: {
                    heapUsed: number;
                };
                cpu: {
                    user: number;
                    system: number;
                };
            }): {
                uptime: number;
                database: {
                    connected: boolean;
                };
                memory: {
                    heapUsed: number;
                };
                cpu: {
                    user: number;
                    system: number;
                };
                success: true;
                timestamp: number;
            } => ({
                uptime: data.uptime,
                database: data.database,
                memory: data.memory,
                cpu: data.cpu,
                success: true,
                timestamp: Date.now(),
            }),
            createError: (
                error: string,
            ): {
                success: false;
                timestamp: number;
                error: string;
            } => ({
                success: false,
                timestamp: Date.now(),
                error,
            }),
        } as const;
    }
}

export namespace Client {
    export enum E_Client {
        WEB_BABYLON_JS = "web_babylon_js",
    }
}

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
