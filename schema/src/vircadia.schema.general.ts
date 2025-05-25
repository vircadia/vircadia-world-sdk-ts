export namespace Config {
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";
}

export namespace Entity {
    export interface I_Entity {
        general__entity_name: string;
        general__semantic_version: string;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
        general__expiry__delete_on_inactive_ms?: number;
        general__expiry__delete_on_general_ms?: number;
        group__load_priority: number;
        general__initialized_at?: string;
        general__initialized_by?: string;
        // biome-ignore lint/suspicious/noExplicitAny: Anything is allowed as a value.
        meta__data: Record<string, { value: any }>;
        group__sync: string;

        // Add timestamp tracking fields for specific properties
        meta_data_updated_at: string;
    }

    export namespace Asset {
        export type T_AssetOmitData = Omit<I_Asset, "asset__data__bytea">;

        export interface I_Asset {
            general__asset_file_name: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            group__sync?: string;

            // Asset fields
            asset__data__bytea?: Buffer;
            asset__mime_type?: string;
            asset__data__bytea_updated_at?: string;
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

    // Interface for parameter documentation - moved to be shared across namespaces
    export interface I_Parameter {
        name: string;
        type: string;
        required: boolean;
        description: string;
    }

    // Interface for return value documentation - moved to be shared across namespaces
    export interface I_Return {
        type: string;
        description: string;
        fields?: {
            name: string;
            type: string;
            description: string;
        }[];
    }

    export namespace WebSocket {
        export enum MessageType {
            GENERAL_ERROR_RESPONSE = "GENERAL_ERROR_RESPONSE",
            QUERY_REQUEST = "QUERY_REQUEST",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            SYNC_GROUP_UPDATES_RESPONSE = "SYNC_GROUP_UPDATES_RESPONSE",
            TICK_NOTIFICATION_RESPONSE = "TICK_NOTIFICATION_RESPONSE",
            SESSION_INFO_RESPONSE = "SESSION_INFO_RESPONSE",
        }

        // Message type documentation
        export interface I_MessageTypeDoc {
            description: string;
            parameters?: Communication.I_Parameter[];
            messageFormat?: {
                type: string;
                description: string;
                fields?: {
                    name: string;
                    type: string;
                    description: string;
                }[];
            };
        }

        // Define documentation for each message type
        export const MessageTypeDocs: Record<MessageType, I_MessageTypeDoc> = {
            [MessageType.GENERAL_ERROR_RESPONSE]: {
                description:
                    "Response sent when a general error occurs during processing",
                messageFormat: {
                    type: "object",
                    description:
                        "Error response with details about the failure",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the error occurred",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description:
                                "ID of the request that generated the error",
                        },
                        {
                            name: "errorMessage",
                            type: "string",
                            description:
                                "Detailed error message describing what went wrong",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (GENERAL_ERROR_RESPONSE)",
                        },
                    ],
                },
            },
            [MessageType.QUERY_REQUEST]: {
                description: "Request to execute a query on the server",
                parameters: [
                    {
                        name: "query",
                        type: "string",
                        required: true,
                        description: "The query string to execute",
                    },
                    {
                        name: "parameters",
                        type: "array",
                        required: false,
                        description: "Array of parameters to pass to the query",
                    },
                    {
                        name: "requestId",
                        type: "string",
                        required: true,
                        description: "Unique identifier for this request",
                    },
                ],
                messageFormat: {
                    type: "object",
                    description: "Query request object",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the request was created",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description: "Unique identifier for this request",
                        },
                        {
                            name: "errorMessage",
                            type: "string | null",
                            description:
                                "Error message if there was an issue with the request format",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (QUERY_REQUEST)",
                        },
                        {
                            name: "query",
                            type: "string",
                            description: "The query string to execute",
                        },
                        {
                            name: "parameters",
                            type: "array",
                            description:
                                "Array of parameters to pass to the query",
                        },
                    ],
                },
            },
            [MessageType.QUERY_RESPONSE]: {
                description:
                    "Response to a query request with results or error information",
                messageFormat: {
                    type: "object",
                    description:
                        "Query response containing results or error details",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the response was generated",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description:
                                "ID of the request this response is for",
                        },
                        {
                            name: "errorMessage",
                            type: "string | null",
                            description:
                                "Error message if the query failed, null if successful",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (QUERY_RESPONSE)",
                        },
                        {
                            name: "result",
                            type: "T | []",
                            description:
                                "Query results, empty array if no results or error",
                        },
                    ],
                },
            },
            [MessageType.SYNC_GROUP_UPDATES_RESPONSE]: {
                description: "Response containing updates for a sync group",
                messageFormat: {
                    type: "object",
                    description:
                        "Updates for entities in a specific sync group",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the updates were generated",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description:
                                "ID of the request that triggered these updates",
                        },
                        {
                            name: "errorMessage",
                            type: "string | null",
                            description:
                                "Error message if there was a problem, null if successful",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (SYNC_GROUP_UPDATES_RESPONSE)",
                        },
                    ],
                },
            },
            [MessageType.TICK_NOTIFICATION_RESPONSE]: {
                description: "Notification sent when a server tick occurs",
                messageFormat: {
                    type: "object",
                    description: "Information about the completed tick",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the tick notification was sent",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description: "ID for this notification",
                        },
                        {
                            name: "errorMessage",
                            type: "string | null",
                            description:
                                "Error message if there was an issue, null if successful",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (TICK_NOTIFICATION_RESPONSE)",
                        },
                        {
                            name: "tick",
                            type: "Tick.I_Tick",
                            description:
                                "Detailed information about the tick that completed",
                        },
                    ],
                },
            },
            [MessageType.SESSION_INFO_RESPONSE]: {
                description:
                    "Session info sent to client on connection establishment",
                messageFormat: {
                    type: "object",
                    description:
                        "Information about the session assigned by the server",
                    fields: [
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the session info was sent",
                        },
                        {
                            name: "requestId",
                            type: "string",
                            description:
                                "Empty string for session info messages",
                        },
                        {
                            name: "errorMessage",
                            type: "string | null",
                            description:
                                "Error message, null for session info messages",
                        },
                        {
                            name: "type",
                            type: "string",
                            description:
                                "Message type identifier (SESSION_INFO_RESPONSE)",
                        },
                        {
                            name: "agentId",
                            type: "string",
                            description:
                                "The agent identifier assigned by the server",
                        },
                        {
                            name: "sessionId",
                            type: "string",
                            description:
                                "The session identifier assigned by the server",
                        },
                    ],
                },
            },
        };

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

        export class QueryResponseMessage<T = unknown> implements BaseMessage {
            public readonly type = MessageType.QUERY_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public result: T | [];

            constructor(data: {
                result: T | [];
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
            public readonly type = MessageType.TICK_NOTIFICATION_RESPONSE;
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

        export class SessionInfoMessage implements BaseMessage {
            public readonly type = MessageType.SESSION_INFO_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public agentId: string;
            public sessionId: string;

            constructor(data: { agentId: string; sessionId: string }) {
                this.timestamp = Date.now();
                this.requestId = "";
                this.errorMessage = null;
                this.agentId = data.agentId;
                this.sessionId = data.sessionId;
            }
        }

        export type Message =
            | QueryRequestMessage
            | QueryResponseMessage
            | TickNotificationMessage
            | SessionInfoMessage;

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
                description: string;
                parameters: I_Parameter[];
                returns: I_Return; // Added returns field
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
                description:
                    "Validates a user session token from an authentication provider",
                parameters: [
                    {
                        name: "token",
                        type: "string",
                        required: true,
                        description: "Authentication token to validate",
                    },
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description:
                            "Name of the authentication provider (e.g., 'oauth', 'local')",
                    },
                ],
                returns: {
                    type: "object",
                    description:
                        "Response indicating whether the session is valid",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the validation was successful",
                        },
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the response was generated",
                        },
                        {
                            name: "error",
                            type: "string",
                            description:
                                "Error message (only present when success is false)",
                        },
                    ],
                },
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
        export interface I_QueryMetrics {
            queriesPerSecond: {
                current: number;
                average: number;
                peak: number;
            };
            queryCompletionTime: {
                averageMs: number;
                p99Ms: number;
                p999Ms: number;
            };
            requestSize: {
                averageKB: number;
                p99KB: number;
                p999KB: number;
            };
            responseSize: {
                averageKB: number;
                p99KB: number;
                p999KB: number;
            };
            totalQueries: number;
            failedQueries: number;
            successRate: number;
        }

        export interface I_SystemMetrics {
            current: number;
            average: number;
            p99: number;
            p999: number;
        }

        export interface I_ConnectionMetrics {
            active: I_SystemMetrics;
            total: number;
            failed: number;
            successRate: number;
        }

        export const Stats_Endpoint = {
            path: "/stats",
            method: "GET",
            createRequest: (): string => "",
            createSuccess: (data: {
                uptime: number;
                connections: I_ConnectionMetrics;
                database: {
                    connected: boolean;
                    connections: I_SystemMetrics;
                };
                memory: {
                    heapUsed: I_SystemMetrics;
                    heapTotal: I_SystemMetrics;
                    external: I_SystemMetrics;
                    rss: I_SystemMetrics;
                };
                cpu: {
                    user: I_SystemMetrics;
                    system: I_SystemMetrics;
                };
                queries?: I_QueryMetrics;
            }): {
                uptime: number;
                connections: I_ConnectionMetrics;
                database: {
                    connected: boolean;
                    connections: I_SystemMetrics;
                };
                memory: {
                    heapUsed: I_SystemMetrics;
                    heapTotal: I_SystemMetrics;
                    external: I_SystemMetrics;
                    rss: I_SystemMetrics;
                };
                cpu: {
                    user: I_SystemMetrics;
                    system: I_SystemMetrics;
                };
                queries?: I_QueryMetrics;
                success: true;
                timestamp: number;
            } => ({
                uptime: data.uptime,
                connections: data.connections,
                database: data.database,
                memory: data.memory,
                cpu: data.cpu,
                queries: data.queries,
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
            method: "GET",
            path: "/stats",
            createRequest: (): string => "",
            createSuccess: (data: {
                uptime: number;
                ticks: {
                    processing: string[];
                    pending: Record<string, boolean>;
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
                ticks: {
                    processing: string[];
                    pending: Record<string, boolean>;
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
                ticks: data.ticks,
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

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
