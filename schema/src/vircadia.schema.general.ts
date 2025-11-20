import { z } from "zod";

export namespace Config {
    export type E_OperationType = "INSERT" | "UPDATE" | "DELETE";

    export interface I_EntityConfig {
        entity_config__script_compilation_timeout_ms: number;
        entity_config__expiry_check_interval_ms: number;
        entity_config__metadata_expiry_check_interval_ms: number;
    }
}

export namespace Entity {
    export interface I_Entity {
        general__entity_name: string;
        general__semantic_version: string;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
        general__expiry__delete_since_updated_at_ms?: number;
        general__expiry__delete_since_created_at_ms?: number;
        group__load_priority: number;
        meta__data?: unknown;
        general__initialized_at?: string;
        general__initialized_by?: string;
        group__sync: string;
        group__channel?: string | null;
    }

    export namespace Metadata {
        export interface I_Metadata {
            general__entity_name: string;
            metadata__key: string;
            ro__group__sync?: string;
            ro__group__channel?: string | null;
            metadata__jsonb?: unknown;
            metadata__text?: string;
            metadata__int?: number;
            metadata__float?: number;
            metadata__bool?: boolean;
            metadata__bytea?: string;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
            general__expiry__delete_since_updated_at_ms?: number;
            general__expiry__delete_since_created_at_ms?: number;
        }
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
            asset__data__bytea?: ArrayBuffer | Buffer;
            asset__mime_type?: string;
            asset__data__bytea_updated_at?: string;
        }
    }
}

export namespace Service {
    export namespace API {
        export namespace Asset {
            export interface I_AssetCacheStats {
                dir: string;
                maxMegabytes: number;
                totalMegabytes: number;
                fileCount: number;
                inFlight: number;
                lastMaintenanceAt: number | null;
                lastMaintenanceDurationMs: number | null;
                filesWarmedLastRun: number | null;
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
        tick__is_delayed: boolean;
        tick__headroom_ms: number | null;
        tick__time_since_last_tick_ms: number | null;

        // DB-specific metrics
        tick__db__start_time: Date | null;
        tick__db__end_time: Date | null;
        tick__db__duration_ms: number | null;
        tick__db__is_delayed: boolean | null;

        // Manager-specific metrics
        tick__service__start_time: Date | null;
        tick__service__end_time: Date | null;
        tick__service__duration_ms: number | null;
        tick__service__is_delayed: boolean | null;
    }

    export interface I_TickNotification {
        syncGroup: string;
        tickId: string;
        tickNumber: number;
    }
}

export namespace Auth {
    export enum E_Provider {
        AZURE = "azure",
        SYSTEM = "system",
        ANONYMOUS = "anon",
    }

    export interface I_Profile {
        general__agent_profile_id: string;
        profile__username?: string;
        auth__email?: string;
        auth__is_admin: boolean;
        auth__is_anon: boolean;
        profile__last_seen_at?: string;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    // Auth provider configuration (auth_providers table)
    export interface I_AuthProviderConfig {
        provider__name: string;
        provider__display_name: string;
        provider__enabled: boolean;
        provider__client_id?: string;
        provider__client_secret?: string;
        provider__auth_url?: string;
        provider__token_url?: string;
        provider__userinfo_url?: string;
        provider__end_session_url?: string;
        provider__revocation_url?: string;
        provider__device_authorization_url?: string;
        provider__discovery_url?: string;
        provider__scope?: string[];
        provider__redirect_uris?: string[];
        provider__issuer?: string;
        provider__jwks_uri?: string;
        provider__metadata?: Record<string, unknown>;
        provider__icon_url?: string;
        provider__jwt_secret: string;
        provider__session_max_per_agent: number;
        provider__session_duration_jwt_string: string;
        provider__session_duration_ms: number;
        provider__session_max_age_ms: number;
        provider__session_inactive_expiry_ms: number;
        provider__default_permissions__can_read: string[];
        provider__default_permissions__can_insert: string[];
        provider__default_permissions__can_update: string[];
        provider__default_permissions__can_delete: string[];
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    // Agent auth provider association (agent_auth_providers table)
    export interface I_AuthProvider {
        auth__agent_id: string;
        auth__provider_name: string;
        auth__provider_uid: string;
        auth__provider_email?: string;
        auth__access_token?: string;
        auth__refresh_token?: string;
        auth__token_expires_at?: string;
        auth__is_verified: boolean;
        auth__last_login_at?: string;
        auth__metadata?: Record<string, unknown>;
        general__created_at?: string;
        general__created_by?: string;
        general__updated_at?: string;
        general__updated_by?: string;
    }

    export interface I_Session {
        general__session_id: string;
        auth__agent_id: string;
        auth__provider_name: string;
        session__started_at: string;
        session__last_seen_at: string;
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
            server__tick__state__enabled: boolean;
            server__tick__reflect__enabled: boolean;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
        }

        export interface I_Role {
            auth__agent_id: string;
            group__sync: string;
            permissions__can_read: boolean;
            permissions__can_insert: boolean;
            permissions__can_update: boolean;
            permissions__can_delete: boolean;
            general__created_at?: string;
            general__created_by?: string;
            general__updated_at?: string;
            general__updated_by?: string;
        }
    }

    export interface I_OAuthStateCache {
        cache_key: string;
        cache_value: string;
        expires_at: string;
        created_at?: string;
    }
}

export namespace Communication {
    export const REST_BASE_WS_PATH = "/world/rest/ws";
    export const REST_BASE_AUTH_PATH = "/world/rest/auth";
    export const REST_BASE_ASSET_PATH = "/world/rest/asset";
    export const REST_BASE_INFERENCE_PATH = "/world/rest/inference";
    export const REST_BASE_STATE_PATH = "/world/rest/state";

    export namespace WebSocket {
        export enum MessageType {
            GENERAL_ERROR_RESPONSE = "GENERAL_ERROR_RESPONSE",
            QUERY_REQUEST = "QUERY_REQUEST",
            QUERY_RESPONSE = "QUERY_RESPONSE",
            SYNC_GROUP_UPDATES_RESPONSE = "SYNC_GROUP_UPDATES_RESPONSE",
            TICK_NOTIFICATION_RESPONSE = "TICK_NOTIFICATION_RESPONSE",
            SESSION_INFO_RESPONSE = "SESSION_INFO_RESPONSE",
            REFLECT_PUBLISH_REQUEST = "REFLECT_PUBLISH_REQUEST",
            REFLECT_MESSAGE_DELIVERY = "REFLECT_MESSAGE_DELIVERY",
            REFLECT_ACK_RESPONSE = "REFLECT_ACK_RESPONSE",
            ENTITY_CHANNEL_SUBSCRIBE_REQUEST = "ENTITY_CHANNEL_SUBSCRIBE_REQUEST",
            ENTITY_CHANNEL_SUBSCRIBE_RESPONSE = "ENTITY_CHANNEL_SUBSCRIBE_RESPONSE",
            ENTITY_CHANNEL_UNSUBSCRIBE_REQUEST = "ENTITY_CHANNEL_UNSUBSCRIBE_REQUEST",
            ENTITY_CHANNEL_UNSUBSCRIBE_RESPONSE = "ENTITY_CHANNEL_UNSUBSCRIBE_RESPONSE",
            ENTITY_DELIVERY = "ENTITY_DELIVERY",
            ENTITY_METADATA_DELIVERY = "ENTITY_METADATA_DELIVERY",
        }

        export enum DatabaseOperation {
            INSERT = "INSERT",
            UPDATE = "UPDATE",
            DELETE = "DELETE",
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
            // biome-ignore lint/suspicious/noExplicitAny: parameters can be any JSON-serializable values
            public parameters?: any[];

            constructor(data: {
                query: string;
                // biome-ignore lint/suspicious/noExplicitAny: parameters can be any JSON-serializable values
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

        // Reflector: client->server publish request
        export class ReflectPublishRequestMessage implements BaseMessage {
            public readonly type = MessageType.REFLECT_PUBLISH_REQUEST;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public syncGroup: string;
            public channel: string;
            // biome-ignore lint/suspicious/noExplicitAny: payload can be any JSON-serializable
            public payload: any;
            public requestAcknowledgement?: boolean;

            constructor(data: {
                syncGroup: string;
                channel: string;
                // biome-ignore lint/suspicious/noExplicitAny: payload can be any JSON-serializable
                payload: any;
                requestId: string;
                errorMessage?: string | null;
                requestAcknowledgement?: boolean;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage ?? null;
                this.syncGroup = data.syncGroup;
                this.channel = data.channel;
                this.payload = data.payload;
                this.requestAcknowledgement =
                    data.requestAcknowledgement ?? false;
            }
        }

        // Reflector: server->client delivery
        export class ReflectDeliveryMessage implements BaseMessage {
            public readonly type = MessageType.REFLECT_MESSAGE_DELIVERY;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public syncGroup: string;
            public channel: string;
            public fromSessionId?: string;
            // biome-ignore lint/suspicious/noExplicitAny: payload can be any JSON-serializable
            public payload: any;

            constructor(data: {
                syncGroup: string;
                channel: string;
                // biome-ignore lint/suspicious/noExplicitAny: payload can be any JSON-serializable
                payload: any;
                fromSessionId?: string;
                requestId?: string;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId ?? "";
                this.errorMessage = null;
                this.syncGroup = data.syncGroup;
                this.channel = data.channel;
                this.fromSessionId = data.fromSessionId;
                this.payload = data.payload;
            }
        }

        // Reflector: server->client ack
        export class ReflectAckResponseMessage implements BaseMessage {
            public readonly type = MessageType.REFLECT_ACK_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public syncGroup: string;
            public channel: string;
            public delivered: number;

            constructor(data: {
                syncGroup: string;
                channel: string;
                delivered: number;
                requestId: string;
                errorMessage?: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage ?? null;
                this.syncGroup = data.syncGroup;
                this.channel = data.channel;
                this.delivered = data.delivered;
            }
        }

        export class EntityChannelSubscribeRequestMessage
            implements BaseMessage
        {
            public readonly type = MessageType.ENTITY_CHANNEL_SUBSCRIBE_REQUEST;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public channel?: string | null;

            constructor(data: {
                requestId: string;
                entityName: string;
                channel?: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = null;
                this.entityName = data.entityName;
                this.channel = data.channel;
            }
        }

        export class EntityChannelSubscribeResponseMessage
            implements BaseMessage
        {
            public readonly type =
                MessageType.ENTITY_CHANNEL_SUBSCRIBE_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public channel: string | null;
            public subscribed: boolean;

            constructor(data: {
                requestId: string;
                entityName: string;
                channel?: string | null;
                subscribed: boolean;
                errorMessage?: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage ?? null;
                this.entityName = data.entityName;
                this.channel = data.channel ?? null;
                this.subscribed = data.subscribed;
            }
        }

        export class EntityChannelUnsubscribeRequestMessage
            implements BaseMessage
        {
            public readonly type =
                MessageType.ENTITY_CHANNEL_UNSUBSCRIBE_REQUEST;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public channel?: string | null;

            constructor(data: {
                requestId: string;
                entityName: string;
                channel?: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = null;
                this.entityName = data.entityName;
                this.channel = data.channel;
            }
        }

        export class EntityChannelUnsubscribeResponseMessage
            implements BaseMessage
        {
            public readonly type =
                MessageType.ENTITY_CHANNEL_UNSUBSCRIBE_RESPONSE;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public channel: string | null;
            public removed: boolean;

            constructor(data: {
                requestId: string;
                entityName: string;
                channel?: string | null;
                removed: boolean;
                errorMessage?: string | null;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.requestId;
                this.errorMessage = data.errorMessage ?? null;
                this.entityName = data.entityName;
                this.channel = data.channel ?? null;
                this.removed = data.removed;
            }
        }

        export class EntityDeliveryMessage implements BaseMessage {
            public readonly type = MessageType.ENTITY_DELIVERY;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public operation: DatabaseOperation;
            public syncGroup: string;
            public channel?: string | null;
            public data: unknown;

            constructor(data: {
                entityName: string;
                operation: DatabaseOperation;
                syncGroup: string;
                channel?: string | null;
                payload: unknown;
            }) {
                this.timestamp = Date.now();
                this.requestId = data.entityName;
                this.errorMessage = null;
                this.entityName = data.entityName;
                this.operation = data.operation;
                this.syncGroup = data.syncGroup;
                this.channel = data.channel;
                this.data = data.payload;
            }
        }

        export class EntityMetadataDeliveryMessage implements BaseMessage {
            public readonly type = MessageType.ENTITY_METADATA_DELIVERY;
            public readonly timestamp: number;
            public requestId: string;
            public errorMessage: string | null;
            public entityName: string;
            public metadataKey: string;
            public operation: DatabaseOperation;
            public syncGroup: string;
            public channel?: string | null;
            public data: unknown;

            constructor(data: {
                entityName: string;
                metadataKey: string;
                operation: DatabaseOperation;
                syncGroup: string;
                channel?: string | null;
                payload: unknown;
            }) {
                this.timestamp = Date.now();
                this.requestId = `${data.entityName}:${data.metadataKey}`;
                this.errorMessage = null;
                this.entityName = data.entityName;
                this.metadataKey = data.metadataKey;
                this.operation = data.operation;
                this.syncGroup = data.syncGroup;
                this.channel = data.channel;
                this.data = data.payload;
            }
        }

        export type Message =
            | GeneralErrorResponseMessage
            | QueryRequestMessage
            | QueryResponseMessage
            | TickNotificationMessage
            | SessionInfoMessage
            | ReflectPublishRequestMessage
            | ReflectDeliveryMessage
            | ReflectAckResponseMessage
            | EntityChannelSubscribeRequestMessage
            | EntityChannelSubscribeResponseMessage
            | EntityChannelUnsubscribeRequestMessage
            | EntityChannelUnsubscribeResponseMessage
            | EntityDeliveryMessage
            | EntityMetadataDeliveryMessage;

        export function isMessageType<T extends Message>(
            message: Message,
            type: MessageType,
        ): message is T {
            return message.type === type;
        }

        // ======================= Zod Schemas =======================
        // Shared base (most messages conform to this envelope)
        const Z_MessageBase = z.object({
            timestamp: z.number(),
            requestId: z.string(),
            errorMessage: z.string().nullable(),
            type: z.enum(MessageType),
        });

        const Z_GeneralErrorResponse = Z_MessageBase.extend({
            type: z.literal(MessageType.GENERAL_ERROR_RESPONSE),
        });

        const Z_QueryRequest = Z_MessageBase.extend({
            type: z.literal(MessageType.QUERY_REQUEST),
            query: z.string(),
            parameters: z.array(z.unknown()).optional(),
        });

        const Z_QueryResponse = Z_MessageBase.extend({
            type: z.literal(MessageType.QUERY_RESPONSE),
            result: z.unknown(),
        });

        const Z_TickNotification = Z_MessageBase.extend({
            type: z.literal(MessageType.TICK_NOTIFICATION_RESPONSE),
            // keep loose here to avoid circular deps; validated server-side
            tick: z.any(),
        });

        const Z_SessionInfo = Z_MessageBase.extend({
            type: z.literal(MessageType.SESSION_INFO_RESPONSE),
            agentId: z.string(),
            sessionId: z.string(),
        });

        const Z_ReflectPublishRequest = Z_MessageBase.extend({
            type: z.literal(MessageType.REFLECT_PUBLISH_REQUEST),
            syncGroup: z.string(),
            channel: z.string(),
            payload: z.unknown(),
            requestAcknowledgement: z.boolean().optional().default(false),
        });

        const Z_ReflectDelivery = Z_MessageBase.extend({
            type: z.literal(MessageType.REFLECT_MESSAGE_DELIVERY),
            syncGroup: z.string(),
            channel: z.string(),
            fromSessionId: z.string().optional(),
            payload: z.unknown(),
        });

        const Z_ReflectAckResponse = Z_MessageBase.extend({
            type: z.literal(MessageType.REFLECT_ACK_RESPONSE),
            syncGroup: z.string(),
            channel: z.string(),
            delivered: z.number(),
        });

        const Z_EntityChannelSubscribeRequest = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_CHANNEL_SUBSCRIBE_REQUEST),
            entityName: z.string().min(1),
            channel: z.string().nullable().optional(),
        });

        const Z_EntityChannelSubscribeResponse = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_CHANNEL_SUBSCRIBE_RESPONSE),
            entityName: z.string().min(1),
            channel: z.string().nullable(),
            subscribed: z.boolean(),
        });

        const Z_EntityChannelUnsubscribeRequest = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_CHANNEL_UNSUBSCRIBE_REQUEST),
            entityName: z.string().min(1),
            channel: z.string().nullable().optional(),
        });

        const Z_EntityChannelUnsubscribeResponse = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_CHANNEL_UNSUBSCRIBE_RESPONSE),
            entityName: z.string().min(1),
            channel: z.string().nullable(),
            removed: z.boolean(),
        });

        const Z_EntityDelivery = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_DELIVERY),
            entityName: z.string().min(1),
            operation: z.nativeEnum(DatabaseOperation),
            syncGroup: z.string(),
            channel: z.string().nullable().optional(),
            data: z.unknown(),
        });

        const Z_EntityMetadataDelivery = Z_MessageBase.extend({
            type: z.literal(MessageType.ENTITY_METADATA_DELIVERY),
            entityName: z.string().min(1),
            metadataKey: z.string().min(1),
            operation: z.nativeEnum(DatabaseOperation),
            syncGroup: z.string(),
            channel: z.string().nullable().optional(),
            data: z.unknown(),
        });

        export const Z = {
            MessageBase: Z_MessageBase,
            GeneralErrorResponse: Z_GeneralErrorResponse,
            QueryRequest: Z_QueryRequest,
            QueryResponse: Z_QueryResponse,
            TickNotification: Z_TickNotification,
            SessionInfo: Z_SessionInfo,
            ReflectPublishRequest: Z_ReflectPublishRequest,
            ReflectDelivery: Z_ReflectDelivery,
            ReflectAckResponse: Z_ReflectAckResponse,
            EntityChannelSubscribeRequest: Z_EntityChannelSubscribeRequest,
            EntityChannelSubscribeResponse: Z_EntityChannelSubscribeResponse,
            EntityChannelUnsubscribeRequest: Z_EntityChannelUnsubscribeRequest,
            EntityChannelUnsubscribeResponse:
                Z_EntityChannelUnsubscribeResponse,
            EntityDelivery: Z_EntityDelivery,
            EntityMetadataDelivery: Z_EntityMetadataDelivery,
            AnyMessage: z.discriminatedUnion("type", [
                Z_GeneralErrorResponse,
                Z_QueryRequest,
                Z_QueryResponse,
                Z_TickNotification,
                Z_SessionInfo,
                Z_ReflectPublishRequest,
                Z_ReflectDelivery,
                Z_ReflectAckResponse,
                Z_EntityChannelSubscribeRequest,
                Z_EntityChannelSubscribeResponse,
                Z_EntityChannelUnsubscribeRequest,
                Z_EntityChannelUnsubscribeResponse,
                Z_EntityDelivery,
                Z_EntityMetadataDelivery,
            ]),
        } as const;
    }

    export namespace REST {
        export enum E_Endpoint {
            AUTH_SESSION_VALIDATE = "AUTH_SESSION_VALIDATE",
            AUTH_ANONYMOUS_LOGIN = "AUTH_ANONYMOUS_LOGIN",
            AUTH_OAUTH_AUTHORIZE = "AUTH_OAUTH_AUTHORIZE",
            AUTH_OAUTH_CALLBACK = "AUTH_OAUTH_CALLBACK",
            AUTH_LOGOUT = "AUTH_LOGOUT",
            AUTH_LINK_PROVIDER = "AUTH_LINK_PROVIDER",
            AUTH_UNLINK_PROVIDER = "AUTH_UNLINK_PROVIDER",
            AUTH_LIST_PROVIDERS = "AUTH_LIST_PROVIDERS",
            ASSET_GET_BY_KEY = "ASSET_GET_BY_KEY",
            WS_UPGRADE_VALIDATE = "WS_UPGRADE_VALIDATE",
            WS_UPGRADE_REQUEST = "WS_UPGRADE_REQUEST",
            AUTH_STATS = "AUTH_STATS",
            ASSET_STATS = "ASSET_STATS",
            INFERENCE_STATS = "INFERENCE_STATS",
            INFERENCE_LLM = "INFERENCE_LLM",
            INFERENCE_LLM_STREAM = "INFERENCE_LLM_STREAM",
            INFERENCE_STT = "INFERENCE_STT",
            INFERENCE_TTS = "INFERENCE_TTS",
            INFERENCE_CAPABILITIES = "INFERENCE_CAPABILITIES",
            STATE_STATS = "STATE_STATS",
            WS_STATS = "WS_STATS",
        }

        export enum E_ErrorCode {
            // WS Upgrade Validation Errors
            WS_UPGRADE_DB_UNAVAILABLE = "WS_UPGRADE_DB_UNAVAILABLE",
            WS_UPGRADE_MISSING_TOKEN = "WS_UPGRADE_MISSING_TOKEN",
            WS_UPGRADE_MISSING_PROVIDER = "WS_UPGRADE_MISSING_PROVIDER",
            WS_UPGRADE_JWT_INVALID = "WS_UPGRADE_JWT_INVALID",
            WS_UPGRADE_SESSION_INVALID = "WS_UPGRADE_SESSION_INVALID",
            WS_UPGRADE_SESSION_ALREADY_CONNECTED = "WS_UPGRADE_SESSION_ALREADY_CONNECTED",

            // Auth Errors
            AUTH_SESSION_INVALID = "AUTH_SESSION_INVALID",
            AUTH_INVALID_REQUEST = "AUTH_INVALID_REQUEST",
            AUTH_OAUTH_ERROR = "AUTH_OAUTH_ERROR",
            AUTH_LINK_PROVIDER_ERROR = "AUTH_LINK_PROVIDER_ERROR",
            AUTH_UNLINK_PROVIDER_ERROR = "AUTH_UNLINK_PROVIDER_ERROR",

            // Asset Errors
            ASSET_NOT_FOUND = "ASSET_NOT_FOUND",
            ASSET_ACCESS_DENIED = "ASSET_ACCESS_DENIED",

            // Generic Errors
            UNKNOWN_ERROR = "UNKNOWN_ERROR",
            INVALID_REQUEST = "INVALID_REQUEST",
            SERVER_ERROR = "SERVER_ERROR",
        }

        // FIXME: Using Zod schemas and metadata registries, we can get rid of this, including with Zod generate JSON. WebSockets will need the same treatment.
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
                parameters: {
                    name: string;
                    type: string;
                    required: boolean;
                    description: string;
                }[];
                returns: {
                    type: string;
                    description: string;
                    fields?: {
                        name: string;
                        type: string;
                        description: string;
                    }[];
                };
            };
        } = {
            AUTH_SESSION_VALIDATE: {
                path: `${REST_BASE_AUTH_PATH}/session/validate`,
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
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
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
            AUTH_ANONYMOUS_LOGIN: {
                path: `${REST_BASE_AUTH_PATH}/anonymous`,
                method: "POST",
                createRequest: (): string => JSON.stringify({}),
                createSuccess: (data: {
                    token: string;
                    agentId: string;
                    sessionId: string;
                }): {
                    success: true;
                    timestamp: number;
                    data: {
                        token: string;
                        agentId: string;
                        sessionId: string;
                    };
                } => ({
                    success: true,
                    timestamp: Date.now(),
                    data,
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description: "Logs in a user anonymously.",
                parameters: [],
                returns: {
                    type: "object",
                    description:
                        "Returns a session token for the anonymous user.",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates whether the request was successful.",
                        },
                        {
                            name: "data",
                            type: "object",
                            description: "The response data.",
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
            AUTH_OAUTH_AUTHORIZE: {
                path: `${REST_BASE_AUTH_PATH}/oauth/authorize`,
                method: "GET",
                createRequest: (
                    provider: string,
                    redirectUri: string,
                ): string => {
                    const sp = new URLSearchParams({ provider: provider });
                    sp.set("redirectUri", redirectUri);
                    return `?${sp.toString()}`;
                },
                createSuccess: (
                    redirectUrl: string,
                ): {
                    success: true;
                    redirectUrl: string;
                    timestamp: number;
                } => ({
                    success: true,
                    redirectUrl,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Initiates OAuth authorization flow for a specified provider",
                parameters: [
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description:
                            "The OAuth provider to use (e.g., 'azure')",
                    },
                    {
                        name: "redirectUri",
                        type: "string",
                        required: true,
                        description:
                            "Redirect URI to register and use for this OAuth flow",
                    },
                ],
                returns: {
                    type: "object",
                    description:
                        "Response with redirect URL for OAuth authorization",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the request was successful",
                        },
                        {
                            name: "redirectUrl",
                            type: "string",
                            description:
                                "URL to redirect the user for OAuth authorization",
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
            AUTH_OAUTH_CALLBACK: {
                path: `${REST_BASE_AUTH_PATH}/oauth/callback`,
                method: "GET",
                createRequest: (params: {
                    provider: string;
                    code: string;
                    state?: string;
                }): string => {
                    const searchParams = new URLSearchParams({
                        provider: params.provider,
                        code: params.code,
                    });
                    if (params.state) {
                        searchParams.append("state", params.state);
                    }
                    return `?${searchParams.toString()}`;
                },
                createSuccess: (data: {
                    token: string;
                    agentId: string;
                    sessionId: string;
                    provider: string;
                    email?: string;
                    displayName?: string;
                    username?: string;
                }): {
                    success: true;
                    token: string;
                    agentId: string;
                    sessionId: string;
                    provider: string;
                    email?: string;
                    displayName?: string;
                    username?: string;
                    timestamp: number;
                } => ({
                    success: true,
                    token: data.token,
                    agentId: data.agentId,
                    sessionId: data.sessionId,
                    provider: data.provider,
                    email: data.email,
                    displayName: data.displayName,
                    username: data.username,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Handles OAuth callback from the authorization provider",
                parameters: [
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description:
                            "The OAuth provider that sent the callback",
                    },
                    {
                        name: "code",
                        type: "string",
                        required: true,
                        description:
                            "Authorization code from the OAuth provider",
                    },
                    {
                        name: "state",
                        type: "string",
                        required: false,
                        description: "State parameter for CSRF protection",
                    },
                ],
                returns: {
                    type: "object",
                    description:
                        "Response with authentication token and session information",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the authentication was successful",
                        },
                        {
                            name: "token",
                            type: "string",
                            description: "JWT token for authenticated sessions",
                        },
                        {
                            name: "agentId",
                            type: "string",
                            description:
                                "Unique identifier for the authenticated agent",
                        },
                        {
                            name: "sessionId",
                            type: "string",
                            description:
                                "Session identifier for this authentication",
                        },
                        {
                            name: "provider",
                            type: "string",
                            description: "The authentication provider used",
                        },
                        {
                            name: "email",
                            type: "string",
                            description:
                                "Email address of the authenticated user (optional)",
                        },
                        {
                            name: "displayName",
                            type: "string",
                            description:
                                "Display name from the authentication provider (optional)",
                        },
                        {
                            name: "username",
                            type: "string",
                            description:
                                "Username stored in the database (optional)",
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
            AUTH_LOGOUT: {
                path: `${REST_BASE_AUTH_PATH}/logout`,
                method: "POST",
                createRequest: (sessionId: string): string =>
                    JSON.stringify({ sessionId }),
                createSuccess: (): {
                    success: true;
                    timestamp: number;
                } => ({
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Logs out the current session and invalidates the token",
                parameters: [
                    {
                        name: "sessionId",
                        type: "string",
                        required: true,
                        description: "Session ID to invalidate",
                    },
                ],
                returns: {
                    type: "object",
                    description: "Response indicating logout status",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the logout was successful",
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
            AUTH_LINK_PROVIDER: {
                path: `${REST_BASE_AUTH_PATH}/link-provider`,
                method: "POST",
                createRequest: (data: {
                    provider: string;
                    sessionId: string;
                }): string =>
                    JSON.stringify({
                        provider: data.provider,
                        sessionId: data.sessionId,
                    }),
                createSuccess: (
                    redirectUrl: string,
                ): {
                    success: true;
                    redirectUrl: string;
                    timestamp: number;
                } => ({
                    success: true,
                    redirectUrl,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Initiates the process to link an additional authentication provider to an existing account",
                parameters: [
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description:
                            "The authentication provider to link (e.g., 'azure')",
                    },
                    {
                        name: "sessionId",
                        type: "string",
                        required: true,
                        description:
                            "Current session ID to associate the new provider with",
                    },
                ],
                returns: {
                    type: "object",
                    description:
                        "Response with redirect URL to complete provider linking",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the request was successful",
                        },
                        {
                            name: "redirectUrl",
                            type: "string",
                            description:
                                "URL to redirect for provider authorization",
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
            AUTH_UNLINK_PROVIDER: {
                path: `${REST_BASE_AUTH_PATH}/unlink-provider`,
                method: "POST",
                createRequest: (data: {
                    provider: string;
                    providerUid: string;
                    sessionId: string;
                }): string =>
                    JSON.stringify({
                        provider: data.provider,
                        providerUid: data.providerUid,
                        sessionId: data.sessionId,
                    }),
                createSuccess: (): {
                    success: true;
                    timestamp: number;
                } => ({
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Unlinks an authentication provider from the current account",
                parameters: [
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description: "The authentication provider to unlink",
                    },
                    {
                        name: "providerUid",
                        type: "string",
                        required: true,
                        description: "The provider-specific user ID to unlink",
                    },
                    {
                        name: "sessionId",
                        type: "string",
                        required: true,
                        description: "Current session ID for authentication",
                    },
                ],
                returns: {
                    type: "object",
                    description: "Response indicating unlink status",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the unlink was successful",
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
            AUTH_LIST_PROVIDERS: {
                path: `${REST_BASE_AUTH_PATH}/providers`,
                method: "GET",
                createRequest: (sessionId: string): string =>
                    `?sessionId=${encodeURIComponent(sessionId)}`,
                createSuccess: (
                    providers: Auth.I_AuthProvider[],
                ): {
                    success: true;
                    providers: Auth.I_AuthProvider[];
                    timestamp: number;
                } => ({
                    success: true,
                    providers,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Lists all authentication providers linked to the current account",
                parameters: [
                    {
                        name: "sessionId",
                        type: "string",
                        required: true,
                        description: "Current session ID for authentication",
                    },
                ],
                returns: {
                    type: "object",
                    description: "Response with list of linked providers",
                    fields: [
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the request was successful",
                        },
                        {
                            name: "providers",
                            type: "Auth.I_ProviderLink[]",
                            description:
                                "Array of authentication providers linked to the account",
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

            // Asset download by key (filename)
            ASSET_GET_BY_KEY: {
                path: `${REST_BASE_ASSET_PATH}/get`,
                method: "GET",
                createRequest: (params: {
                    key: string;
                    token?: string;
                    provider?: string;
                    sessionId?: string;
                }): string => {
                    const sp = new URLSearchParams({
                        key: params.key,
                        ...(params.sessionId
                            ? { sessionId: params.sessionId }
                            : {}),
                        ...(params.token && params.provider
                            ? {
                                  token: params.token,
                                  provider: params.provider,
                              }
                            : {}),
                    });
                    return `?${sp.toString()}`;
                },
                createSuccess: (/* streamed response */): {
                    success: true;
                    timestamp: number;
                } => ({
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Authenticated endpoint to retrieve an asset by its key (filename). Enforces ACL based on the asset's sync group.",
                parameters: [
                    {
                        name: "key",
                        type: "string",
                        required: true,
                        description: "Asset key (filename) to retrieve",
                    },
                    {
                        name: "token",
                        type: "string",
                        required: true,
                        description: "JWT token for authentication",
                    },
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description: "Provider name for JWT validation",
                    },
                ],
                returns: {
                    type: "binary/octet-stream",
                    description:
                        "Binary content of the asset. On error, a JSON error response is returned.",
                },
            },
            // Validate whether a WS upgrade would succeed and why it might fail
            WS_UPGRADE_VALIDATE: {
                path: `${REST_BASE_WS_PATH}/validate`,
                method: "GET",
                createRequest: (params: {
                    token?: string;
                    provider?: string;
                }): string => {
                    const sp = new URLSearchParams();
                    if (params.token) sp.set("token", params.token);
                    if (params.provider) sp.set("provider", params.provider);
                    return `?${sp.toString()}`;
                },
                createSuccess: (data: {
                    ok: boolean;
                    reason:
                        | "OK"
                        | "MISSING_TOKEN"
                        | "MISSING_PROVIDER"
                        | "JWT_INVALID"
                        | "SESSION_INVALID"
                        | "SESSION_ALREADY_CONNECTED"
                        | "DB_UNAVAILABLE";
                    details?: {
                        agentId?: string;
                        sessionId?: string;
                        errorReason?: string;
                    };
                }): {
                    ok: boolean;
                    reason: string;
                    details?: {
                        agentId?: string;
                        sessionId?: string;
                        errorReason?: string;
                    };
                    success: true;
                    timestamp: number;
                } => ({
                    ok: data.ok,
                    reason: data.reason,
                    details: data.details,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (
                    errorCode: string,
                    message: string,
                ): {
                    success: false;
                    timestamp: number;
                    errorCode: string;
                    message: string;
                } => ({
                    success: false,
                    timestamp: Date.now(),
                    errorCode,
                    message,
                }),
                description:
                    "Validates whether a WebSocket upgrade would succeed and returns the reason if it might fail",
                parameters: [
                    {
                        name: "token",
                        type: "string",
                        required: false,
                        description: "JWT token for authentication",
                    },
                    {
                        name: "provider",
                        type: "string",
                        required: false,
                        description: "Provider name for JWT validation",
                    },
                ],
                returns: {
                    type: "object",
                    description: "Validation result with status and reason",
                    fields: [
                        {
                            name: "ok",
                            type: "boolean",
                            description:
                                "Whether the WebSocket upgrade would succeed",
                        },
                        {
                            name: "reason",
                            type: "string",
                            description:
                                "Reason code explaining the validation result",
                        },
                        {
                            name: "details",
                            type: "object",
                            description:
                                "Optional details about the validation result",
                        },
                        {
                            name: "success",
                            type: "boolean",
                            description:
                                "Indicates if the request was successful",
                        },
                        {
                            name: "timestamp",
                            type: "number",
                            description:
                                "Unix timestamp when the response was generated",
                        },
                    ],
                },
            },
            WS_UPGRADE_REQUEST: {
                path: `${REST_BASE_WS_PATH}/request`,
                method: "GET",
                createRequest: (data: {
                    token: string;
                    provider: string;
                }): string => JSON.stringify(data),
                createSuccess: (data: {
                    success: true;
                    timestamp: number;
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "Requests a WebSocket upgrade",
                parameters: [
                    {
                        name: "token",
                        type: "string",
                        required: true,
                        description: "JWT token for authentication",
                    },
                    {
                        name: "provider",
                        type: "string",
                        required: true,
                        description: "Provider name for JWT validation",
                    },
                ],
                returns: {
                    type: "object",
                    description: "WebSocket upgrade request response",
                },
            },
            AUTH_STATS: {
                path: `${REST_BASE_AUTH_PATH}/stats`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    uptime: number;
                    connections: {
                        active: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        total: number;
                        failed: number;
                        successRate: number;
                    };
                    database: {
                        connected: boolean;
                        connections: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    memory: {
                        heapUsed: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        heapTotal: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        external: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        rss: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    cpu: {
                        user: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        system: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "Auth service statistics",
                parameters: [],
                returns: { type: "object", description: "Auth stats response" },
            },
            ASSET_STATS: {
                path: `${REST_BASE_ASSET_PATH}/stats`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    uptime: number;
                    connections: {
                        active: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        total: number;
                        failed: number;
                        successRate: number;
                    };
                    database: {
                        connected: boolean;
                        connections: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    memory: {
                        heapUsed: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        heapTotal: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        external: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        rss: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    cpu: {
                        user: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        system: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    assets: {
                        cache: {
                            dir: string;
                            maxMegabytes: number;
                            totalMegabytes: number;
                            fileCount: number;
                            inFlight: number;
                            lastMaintenanceAt?: number | null;
                            lastMaintenanceDurationMs?: number | null;
                            filesWarmedLastRun?: number | null;
                        };
                    };
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "Asset service statistics",
                parameters: [],
                returns: {
                    type: "object",
                    description: "Asset stats response",
                },
            },
            INFERENCE_STATS: {
                path: `${REST_BASE_INFERENCE_PATH}/stats`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    uptime: number;
                    connections: {
                        active: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        total: number;
                        failed: number;
                        successRate: number;
                    };
                    database: {
                        connected: boolean;
                        connections: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    memory: {
                        heapUsed: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        heapTotal: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        external: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        rss: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    cpu: {
                        user: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        system: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "Inference service statistics",
                parameters: [],
                returns: {
                    type: "object",
                    description: "Inference stats response",
                },
            },
            INFERENCE_LLM: {
                path: `${REST_BASE_INFERENCE_PATH}/llm`,
                method: "POST",
                createRequest: (data: {
                    prompt: string;
                    temperature?: number;
                    maxTokens?: number;
                    stopSequences?: string[];
                }): string => JSON.stringify(data),
                createSuccess: (data: {
                    text: string;
                    finishReason: string;
                    tokens: number;
                    processingTimeMs: number;
                    tokensPerSecond: number;
                }): unknown => ({ success: true, ...data }),
                createError: (error: string): unknown => ({
                    success: false,
                    error,
                }),
                description: "Generate text using LLM",
                parameters: [
                    {
                        name: "prompt",
                        type: "string",
                        required: true,
                        description: "The prompt to generate text from",
                    },
                    {
                        name: "temperature",
                        type: "number",
                        required: false,
                        description: "Sampling temperature",
                    },
                    {
                        name: "maxTokens",
                        type: "number",
                        required: false,
                        description: "Maximum tokens to generate",
                    },
                    {
                        name: "stopSequences",
                        type: "string[]",
                        required: false,
                        description: "Stop sequences",
                    },
                ],
                returns: {
                    type: "object",
                    description: "LLM generation response",
                },
            },
            INFERENCE_LLM_STREAM: {
                path: `${REST_BASE_INFERENCE_PATH}/llm/stream`,
                method: "POST",
                createRequest: (data: {
                    prompt: string;
                    temperature?: number;
                    maxTokens?: number;
                    stopSequences?: string[];
                }): string => JSON.stringify(data),
                createSuccess: (): unknown => ({ success: true }),
                createError: (error: string): unknown => ({
                    success: false,
                    error,
                }),
                description: "Stream text generation using LLM",
                parameters: [
                    {
                        name: "prompt",
                        type: "string",
                        required: true,
                        description: "The prompt to generate text from",
                    },
                    {
                        name: "temperature",
                        type: "number",
                        required: false,
                        description: "Sampling temperature",
                    },
                    {
                        name: "maxTokens",
                        type: "number",
                        required: false,
                        description: "Maximum tokens to generate",
                    },
                    {
                        name: "stopSequences",
                        type: "string[]",
                        required: false,
                        description: "Stop sequences",
                    },
                ],
                returns: {
                    type: "ReadableStream",
                    description: "SSE stream of text chunks",
                },
            },
            INFERENCE_STT: {
                path: `${REST_BASE_INFERENCE_PATH}/stt`,
                method: "POST",
                createRequest: (): string => "",
                createSuccess: (data: {
                    text: string;
                    language: string;
                    processingTimeMs: number;
                    audioDurationMs: number;
                }): unknown => ({ success: true, ...data }),
                createError: (error: string): unknown => ({
                    success: false,
                    error,
                }),
                description: "Convert speech to text",
                parameters: [
                    {
                        name: "audio",
                        type: "File",
                        required: true,
                        description: "Audio file to transcribe",
                    },
                    {
                        name: "language",
                        type: "string",
                        required: false,
                        description: "Language code (e.g., 'en', 'es')",
                    },
                    {
                        name: "prompt",
                        type: "string",
                        required: false,
                        description: "Prompt for transcription",
                    },
                    {
                        name: "responseFormat",
                        type: "string",
                        required: false,
                        description:
                            "Response format: 'json', 'text', or 'verbose_json'",
                    },
                    {
                        name: "temperature",
                        type: "number",
                        required: false,
                        description: "Sampling temperature",
                    },
                ],
                returns: {
                    type: "object",
                    description: "STT transcription response",
                },
            },
            INFERENCE_TTS: {
                path: `${REST_BASE_INFERENCE_PATH}/tts`,
                method: "POST",
                createRequest: (data: {
                    text: string;
                    speed?: number;
                    voice?: string;
                    responseFormat?: string;
                }): string => JSON.stringify(data),
                createSuccess: (): unknown => ({ success: true }),
                createError: (error: string): unknown => ({
                    success: false,
                    error,
                }),
                description: "Convert text to speech",
                parameters: [
                    {
                        name: "text",
                        type: "string",
                        required: true,
                        description: "Text to synthesize",
                    },
                    {
                        name: "speed",
                        type: "number",
                        required: false,
                        description: "Speech speed multiplier",
                    },
                    {
                        name: "voice",
                        type: "string",
                        required: false,
                        description: "Voice to use",
                    },
                    {
                        name: "responseFormat",
                        type: "string",
                        required: false,
                        description:
                            "Audio format: 'wav', 'mp3', 'opus', or 'flac'",
                    },
                ],
                returns: {
                    type: "Blob",
                    description: "Audio file",
                },
            },
            INFERENCE_CAPABILITIES: {
                path: `${REST_BASE_INFERENCE_PATH}/capabilities`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    stt: boolean;
                    tts: boolean;
                    llm: boolean;
                }): unknown => ({ success: true, ...data }),
                createError: (error: string): unknown => ({
                    success: false,
                    error,
                }),
                description: "Get inference service capabilities",
                parameters: [],
                returns: {
                    type: "object",
                    description: "Capabilities response",
                },
            },
            STATE_STATS: {
                path: `${REST_BASE_STATE_PATH}/stats`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    uptime: number;
                    database: { connected: boolean };
                    ticks: {
                        processing: string[];
                        pending: Record<string, boolean>;
                    };
                    entityExpiry: {
                        enabled: boolean;
                        intervalActive: boolean;
                        configuration: {
                            checkIntervalMs: number;
                        } | null;
                    };
                    metadataExpiry: {
                        enabled: boolean;
                        intervalActive: boolean;
                        configuration: {
                            checkIntervalMs: number;
                        } | null;
                    };
                    memory: { heapUsed: number };
                    cpu: { system: number; user: number };
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "State service statistics",
                parameters: [],
                returns: {
                    type: "object",
                    description: "State stats response",
                },
            },
            WS_STATS: {
                path: `${REST_BASE_WS_PATH}/stats`,
                method: "GET",
                createRequest: (): string => "",
                createSuccess: (data: {
                    uptime: number;
                    connections: {
                        active: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        total: number;
                        failed: number;
                        successRate: number;
                    };
                    database: {
                        connected: boolean;
                        connections: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        pool?: {
                            super?: {
                                implementation: string;
                                metrics?: {
                                    max?: number;
                                    min?: number;
                                    size?: number;
                                    idle?: number;
                                    busy?: number;
                                    pending?: number;
                                };
                            };
                            proxy?: {
                                implementation: string;
                                metrics?: {
                                    max?: number;
                                    min?: number;
                                    size?: number;
                                    idle?: number;
                                    busy?: number;
                                    pending?: number;
                                };
                            };
                            legacy?: {
                                implementation: string;
                                metrics?: {
                                    max?: number;
                                    min?: number;
                                    size?: number;
                                    idle?: number;
                                    busy?: number;
                                    pending?: number;
                                };
                            };
                        };
                    };
                    memory: {
                        heapUsed: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        heapTotal: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        external: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        rss: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    cpu: {
                        user: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                        system: {
                            current: number;
                            average: number;
                            p99: number;
                            p999: number;
                        };
                    };
                    queries: {
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
                    };
                    reflect: {
                        messagesPerSecond: {
                            current: number;
                            average: number;
                            peak: number;
                        };
                        messageDeliveryTime: {
                            averageMs: number;
                            p99Ms: number;
                            p999Ms: number;
                        };
                        messageSize: {
                            averageKB: number;
                            p99KB: number;
                            p999KB: number;
                        };
                        totalPublished: number;
                        totalDelivered: number;
                        totalAcknowledged: number;
                        failedDeliveries: number;
                        successRate: number;
                    };
                    endpoints: {
                        [endpoint: string]: {
                            requestsPerSecond: {
                                current: number;
                                average: number;
                                peak: number;
                            };
                            requestCompletionTime: {
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
                            totalRequests: number;
                            failedRequests: number;
                            successRate: number;
                        };
                    };
                }): unknown => ({
                    ...data,
                    success: true,
                    timestamp: Date.now(),
                }),
                createError: (error: string): unknown => ({
                    success: false,
                    timestamp: Date.now(),
                    error,
                }),
                description: "WS service statistics",
                parameters: [],
                returns: { type: "object", description: "WS stats response" },
            },
        } as const;

        // ======================= Zod Schemas =======================
        export namespace Z {
            export const SuccessEnvelope = z
                .object({ success: z.literal(true), timestamp: z.number() })
                .passthrough();
            export const ErrorEnvelope = z
                .object({
                    success: z.literal(false),
                    timestamp: z.number(),
                    errorCode: z.string(),
                    message: z.string(),
                })
                .passthrough();

            // Helper for parsing JSON strings safely
            const jsonString = z.string().transform((str, ctx) => {
                try {
                    return str ? JSON.parse(str) : {};
                } catch {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Invalid JSON",
                    });
                    return z.NEVER;
                }
            });

            // Request body schemas that handle JSON parsing
            export const AuthSessionValidateRequestBody = jsonString.pipe(
                z.object({
                    token: z.string().min(1),
                    provider: z.string().min(1),
                }),
            );
            export const LogoutRequestBody = jsonString.pipe(
                z.object({ sessionId: z.string().min(1) }),
            );
            export const LinkProviderRequestBody = jsonString.pipe(
                z.object({
                    provider: z.string().min(1),
                    sessionId: z.string().min(1),
                }),
            );
            export const UnlinkProviderRequestBody = jsonString.pipe(
                z.object({
                    provider: z.string().min(1),
                    providerUid: z.string().min(1),
                    sessionId: z.string().min(1),
                }),
            );

            // Legacy object-only schemas for backward compatibility
            export const AuthSessionValidateRequest = z.object({
                token: z.string().min(1),
                provider: z.string().min(1),
            });
            export const LogoutRequest = z.object({
                sessionId: z.string().min(1),
            });
            export const LinkProviderRequest = z.object({
                provider: z.string().min(1),
                sessionId: z.string().min(1),
            });
            export const UnlinkProviderRequest = z.object({
                provider: z.string().min(1),
                providerUid: z.string().min(1),
                sessionId: z.string().min(1),
            });

            // Query parameter schemas (no JSON parsing needed)
            export const OAuthAuthorizeQuery = z.object({
                provider: z.string().min(1),
                redirectUri: z.string(),
            });
            export const OAuthCallbackQuery = z.object({
                provider: z.string().min(1),
                code: z.string().min(1),
                state: z.string().optional(),
            });
            export const ListProvidersQuery = z.object({
                sessionId: z.string().min(1),
            });

            // Asset GET accepts either sessionId OR token+provider
            export const AssetGetByKeyQuery = z.union([
                z.object({
                    key: z.string().min(1),
                    sessionId: z.string().min(1),
                    token: z.string().optional(),
                    provider: z.string().optional(),
                }),
                z.object({
                    key: z.string().min(1),
                    sessionId: z.string().optional(),
                    token: z.string().min(1),
                    provider: z.string().min(1),
                }),
            ]);

            export const WsUpgradeValidateQuery = z.object({
                token: z.string().optional(),
                provider: z.string().optional(),
            });

            // Additional request schemas for other endpoints
            export const WsUpgradeRequest = z.object({
                token: z.string().min(1),
                provider: z.string().min(1),
            });

            // ======================= Main Interface Zod Schemas =======================
            export const ConfigEntityConfig = z.object({
                entity_config__script_compilation_timeout_ms: z
                    .number()
                    .int()
                    .positive(),
                entity_config__expiry_check_interval_ms: z
                    .number()
                    .int()
                    .positive(),
                entity_config__metadata_expiry_check_interval_ms: z
                    .number()
                    .int()
                    .positive(),
            });

            export const Entity = z.object({
                general__entity_name: z.string().min(1),
                general__semantic_version: z.string().min(1),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
                general__expiry__delete_since_updated_at_ms: z
                    .number()
                    .int()
                    .nonnegative()
                    .optional(),
                general__expiry__delete_since_created_at_ms: z
                    .number()
                    .int()
                    .nonnegative()
                    .optional(),
                group__load_priority: z.number().int(),
                meta__data: z.unknown().optional(),
                general__initialized_at: z.string().optional(),
                general__initialized_by: z.string().optional(),
                group__sync: z.string().min(1),
                group__channel: z.string().nullable().optional(),
            });

            export const EntityMetadata = z
                .object({
                    general__entity_name: z.string().min(1),
                    metadata__key: z.string().min(1),
                    ro__group__sync: z.string().min(1).optional(),
                    ro__group__channel: z.string().nullable().optional(),
                    metadata__jsonb: z.unknown().optional(),
                    metadata__text: z.string().optional(),
                    metadata__int: z.number().int().optional(),
                    metadata__float: z.number().optional(),
                    metadata__bool: z.boolean().optional(),
                    metadata__bytea: z.string().optional(),
                    general__created_at: z.string().optional(),
                    general__created_by: z.string().optional(),
                    general__updated_at: z.string().optional(),
                    general__updated_by: z.string().optional(),
                    general__expiry__delete_since_updated_at_ms: z
                        .number()
                        .int()
                        .nonnegative()
                        .optional(),
                    general__expiry__delete_since_created_at_ms: z
                        .number()
                        .int()
                        .nonnegative()
                        .optional(),
                })
                .refine(
                    (v) => {
                        const present =
                            (v.metadata__jsonb !== undefined &&
                            v.metadata__jsonb !== null
                                ? 1
                                : 0) +
                            (v.metadata__text !== undefined &&
                            v.metadata__text !== null
                                ? 1
                                : 0) +
                            (v.metadata__int !== undefined &&
                            v.metadata__int !== null
                                ? 1
                                : 0) +
                            (v.metadata__float !== undefined &&
                            v.metadata__float !== null
                                ? 1
                                : 0) +
                            (v.metadata__bool !== undefined &&
                            v.metadata__bool !== null
                                ? 1
                                : 0) +
                            (v.metadata__bytea !== undefined &&
                            v.metadata__bytea !== null
                                ? 1
                                : 0);
                        return present === 1;
                    },
                    {
                        message:
                            "Exactly one of metadata__jsonb, metadata__text, metadata__int, metadata__float, metadata__bool, metadata__bytea must be provided",
                    },
                );

            export const EntityAsset = z.object({
                general__asset_file_name: z.string().min(1),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
                group__sync: z.string().optional(),
                asset__data__bytea:
                    typeof Buffer !== "undefined"
                        ? z.instanceof(Buffer).optional()
                        : z.any().optional(),
                asset__mime_type: z.string().optional(),
                asset__data__bytea_updated_at: z.string().optional(),
            });

            export const Tick = z.object({
                general__tick_id: z.string().min(1),
                tick__number: z.number().int().nonnegative(),
                group__sync: z.string().min(1),
                tick__start_time: z.date(),
                tick__end_time: z.date(),
                tick__duration_ms: z.number().int().nonnegative(),
                tick__entity_states_processed: z.number().int().nonnegative(),
                tick__is_delayed: z.boolean(),
                tick__headroom_ms: z.number().nullable(),
                tick__time_since_last_tick_ms: z.number().nullable(),
                tick__db__start_time: z.date().nullable(),
                tick__db__end_time: z.date().nullable(),
                tick__db__duration_ms: z.number().nullable(),
                tick__db__is_delayed: z.boolean().nullable(),
                tick__service__start_time: z.date().nullable(),
                tick__service__end_time: z.date().nullable(),
                tick__service__duration_ms: z.number().nullable(),
                tick__service__is_delayed: z.boolean().nullable(),
            });

            export const AuthProfile = z.object({
                general__agent_profile_id: z.string().min(1),
                profile__username: z.string().optional(),
                auth__email: z.string().email().optional(),
                auth__is_admin: z.boolean(),
                auth__is_anon: z.boolean(),
                profile__last_seen_at: z.string().optional(),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthProviderConfig = z.object({
                provider__name: z.string().min(1),
                provider__display_name: z.string().min(1),
                provider__enabled: z.boolean(),
                provider__client_id: z.string().optional(),
                provider__client_secret: z.string().optional(),
                provider__auth_url: z.string().url().optional(),
                provider__token_url: z.string().url().optional(),
                provider__userinfo_url: z.string().url().optional(),
                provider__end_session_url: z.string().url().optional(),
                provider__revocation_url: z.string().url().optional(),
                provider__device_authorization_url: z.string().url().optional(),
                provider__discovery_url: z.string().url().optional(),
                provider__scope: z.array(z.string()).optional(),
                provider__redirect_uris: z.array(z.string()).optional(),
                provider__issuer: z.string().optional(),
                provider__jwks_uri: z.string().url().optional(),
                provider__metadata: z
                    .record(z.string(), z.unknown())
                    .optional(),
                provider__icon_url: z.string().url().optional(),
                provider__jwt_secret: z.string().min(1),
                provider__session_max_per_agent: z.number().int().positive(),
                provider__session_duration_jwt_string: z.string().min(1),
                provider__session_duration_ms: z.number().int().positive(),
                provider__session_max_age_ms: z.number().int().positive(),
                provider__session_inactive_expiry_ms: z
                    .number()
                    .int()
                    .positive(),
                provider__default_permissions__can_read: z.array(z.string()),
                provider__default_permissions__can_insert: z.array(z.string()),
                provider__default_permissions__can_update: z.array(z.string()),
                provider__default_permissions__can_delete: z.array(z.string()),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthProvider = z.object({
                auth__agent_id: z.string().min(1),
                auth__provider_name: z.string().min(1),
                auth__provider_uid: z.string().min(1),
                auth__provider_email: z.string().email().optional(),
                auth__access_token: z.string().optional(),
                auth__refresh_token: z.string().optional(),
                auth__token_expires_at: z.string().optional(),
                auth__is_verified: z.boolean(),
                auth__last_login_at: z.string().optional(),
                auth__metadata: z.record(z.string(), z.unknown()).optional(),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthSession = z.object({
                general__session_id: z.string().min(1),
                auth__agent_id: z.string().min(1),
                auth__provider_name: z.string().min(1),
                session__started_at: z.string(),
                session__last_seen_at: z.string(),
                session__expires_at: z.string(),
                session__jwt: z.string().optional(),
                session__is_active: z.boolean(),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthSyncGroup = z.object({
                general__sync_group: z.string().min(1),
                general__description: z.string().optional(),
                server__tick__rate_ms: z.number().int().positive(),
                server__tick__max_tick_count_buffer: z
                    .number()
                    .int()
                    .positive(),
                server__tick__state__enabled: z.boolean(),
                server__tick__reflect__enabled: z.boolean(),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthRole = z.object({
                auth__agent_id: z.string().min(1),
                group__sync: z.string().min(1),
                permissions__can_read: z.boolean(),
                permissions__can_insert: z.boolean(),
                permissions__can_update: z.boolean(),
                permissions__can_delete: z.boolean(),
                general__created_at: z.string().optional(),
                general__created_by: z.string().optional(),
                general__updated_at: z.string().optional(),
                general__updated_by: z.string().optional(),
            });

            export const AuthOAuthStateCache = z.object({
                cache_key: z.string().min(1),
                cache_value: z.string().min(1),
                expires_at: z.string(),
                created_at: z.string().optional(),
            });

            export const AssetCacheStats = z.object({
                dir: z.string(),
                maxMegabytes: z.number(),
                totalMegabytes: z.number(),
                fileCount: z.number(),
                inFlight: z.number(),
                lastMaintenanceAt: z.number().nullable(),
                lastMaintenanceDurationMs: z.number().nullable(),
                filesWarmedLastRun: z.number().nullable(),
            });

            // ======================= Response Schemas =======================
            export const AuthSessionValidateSuccess = SuccessEnvelope;
            export const AuthAnonymousLoginSuccess = SuccessEnvelope.extend({
                data: z.object({
                    token: z.string(),
                    agentId: z.string(),
                    sessionId: z.string(),
                }),
            });
            export const OAuthAuthorizeSuccess = SuccessEnvelope.extend({
                redirectUrl: z.string().url(),
            });
            export const OAuthCallbackSuccess = SuccessEnvelope.extend({
                token: z.string(),
                agentId: z.string(),
                sessionId: z.string(),
                provider: z.string(),
                email: z.string().optional(),
                displayName: z.string().optional(),
                username: z.string().optional(),
            });
            export const LogoutSuccess = SuccessEnvelope;
            export const LinkProviderSuccess = SuccessEnvelope.extend({
                redirectUrl: z.string().url(),
            });
            export const UnlinkProviderSuccess = SuccessEnvelope;
            export const ListProvidersSuccess = SuccessEnvelope.extend({
                providers: z.array(AuthProvider),
            });
            export const WsUpgradeValidateSuccess = SuccessEnvelope.extend({
                ok: z.boolean(),
                reason: z.string(),
                details: z
                    .object({
                        agentId: z.string().optional(),
                        sessionId: z.string().optional(),
                        errorReason: z.string().optional(),
                    })
                    .optional(),
            });
            export const WsUpgradeValidateResponse = z.union([
                WsUpgradeValidateSuccess,
                ErrorEnvelope,
            ]);

            // Additional response schemas for stats endpoints
            export const AuthStatsSuccess = SuccessEnvelope.extend({
                uptime: z.number(),
                connections: z.object({
                    active: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    total: z.number(),
                    failed: z.number(),
                    successRate: z.number(),
                }),
                database: z.object({
                    connected: z.boolean(),
                    connections: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                memory: z.object({
                    heapUsed: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    heapTotal: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    external: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    rss: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                cpu: z.object({
                    user: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    system: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
            });

            export const StateStatsSuccess = SuccessEnvelope.extend({
                uptime: z.number(),
                database: z.object({
                    connected: z.boolean(),
                }),
                ticks: z.object({
                    processing: z.array(z.string()),
                    pending: z.record(z.string(), z.boolean()),
                }),
                entityExpiry: z.object({
                    enabled: z.boolean(),
                    intervalActive: z.boolean(),
                    configuration: z
                        .object({
                            checkIntervalMs: z.number(),
                        })
                        .nullable(),
                }),
                metadataExpiry: z.object({
                    enabled: z.boolean(),
                    intervalActive: z.boolean(),
                    configuration: z
                        .object({
                            checkIntervalMs: z.number(),
                        })
                        .nullable(),
                }),
                memory: z.object({
                    heapUsed: z.number(),
                }),
                cpu: z.object({
                    system: z.number(),
                    user: z.number(),
                }),
            });

            export const AssetStatsSuccess = SuccessEnvelope.extend({
                uptime: z.number(),
                connections: z.object({
                    active: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    total: z.number(),
                    failed: z.number(),
                    successRate: z.number(),
                }),
                database: z.object({
                    connected: z.boolean(),
                    connections: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                memory: z.object({
                    heapUsed: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    heapTotal: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    external: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    rss: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                cpu: z.object({
                    user: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    system: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                assets: z.object({
                    cache: z.object({
                        dir: z.string(),
                        maxMegabytes: z.number(),
                        totalMegabytes: z.number(),
                        fileCount: z.number(),
                        inFlight: z.number(),
                        lastMaintenanceAt: z.number().nullable(),
                        lastMaintenanceDurationMs: z.number().nullable(),
                        filesWarmedLastRun: z.number().nullable(),
                    }),
                }),
            });

            export const InferenceStatsSuccess = SuccessEnvelope.extend({
                uptime: z.number(),
                connections: z.object({
                    active: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    total: z.number(),
                    failed: z.number(),
                    successRate: z.number(),
                }),
                database: z.object({
                    connected: z.boolean(),
                    connections: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                memory: z.object({
                    heapUsed: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    heapTotal: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    external: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    rss: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                cpu: z.object({
                    user: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    system: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
            });

            export const InferenceCapabilitiesSuccess = SuccessEnvelope.extend({
                stt: z.boolean(),
                tts: z.boolean(),
                llm: z.boolean(),
            });

            export const WsStatsSuccess = SuccessEnvelope.extend({
                uptime: z.number(),
                connections: z.object({
                    active: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    total: z.number(),
                    failed: z.number(),
                    successRate: z.number(),
                }),
                database: z.object({
                    connected: z.boolean(),
                    connections: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    pool: z
                        .object({
                            super: z
                                .object({
                                    implementation: z.string(),
                                    metrics: z
                                        .object({
                                            max: z.number().optional(),
                                            min: z.number().optional(),
                                            size: z.number().optional(),
                                            idle: z.number().optional(),
                                            busy: z.number().optional(),
                                            pending: z.number().optional(),
                                        })
                                        .optional(),
                                })
                                .optional(),
                            proxy: z
                                .object({
                                    implementation: z.string(),
                                    metrics: z
                                        .object({
                                            max: z.number().optional(),
                                            min: z.number().optional(),
                                            size: z.number().optional(),
                                            idle: z.number().optional(),
                                            busy: z.number().optional(),
                                            pending: z.number().optional(),
                                        })
                                        .optional(),
                                })
                                .optional(),
                            legacy: z
                                .object({
                                    implementation: z.string(),
                                    metrics: z
                                        .object({
                                            max: z.number().optional(),
                                            min: z.number().optional(),
                                            size: z.number().optional(),
                                            idle: z.number().optional(),
                                            busy: z.number().optional(),
                                            pending: z.number().optional(),
                                        })
                                        .optional(),
                                })
                                .optional(),
                        })
                        .optional(),
                }),
                memory: z.object({
                    heapUsed: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    heapTotal: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    external: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    rss: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                cpu: z.object({
                    user: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                    system: z.object({
                        current: z.number(),
                        average: z.number(),
                        p99: z.number(),
                        p999: z.number(),
                    }),
                }),
                queries: z.object({
                    queriesPerSecond: z.object({
                        current: z.number(),
                        average: z.number(),
                        peak: z.number(),
                    }),
                    queryCompletionTime: z.object({
                        averageMs: z.number(),
                        p99Ms: z.number(),
                        p999Ms: z.number(),
                    }),
                    requestSize: z.object({
                        averageKB: z.number(),
                        p99KB: z.number(),
                        p999KB: z.number(),
                    }),
                    responseSize: z.object({
                        averageKB: z.number(),
                        p99KB: z.number(),
                        p999KB: z.number(),
                    }),
                    totalQueries: z.number(),
                    failedQueries: z.number(),
                    successRate: z.number(),
                }),
                reflect: z.object({
                    messagesPerSecond: z.object({
                        current: z.number(),
                        average: z.number(),
                        peak: z.number(),
                    }),
                    messageDeliveryTime: z.object({
                        averageMs: z.number(),
                        p99Ms: z.number(),
                        p999Ms: z.number(),
                    }),
                    messageSize: z.object({
                        averageKB: z.number(),
                        p99KB: z.number(),
                        p999KB: z.number(),
                    }),
                    totalPublished: z.number(),
                    totalDelivered: z.number(),
                    totalAcknowledged: z.number(),
                    failedDeliveries: z.number(),
                    successRate: z.number(),
                }),
                endpoints: z.record(
                    z.string(),
                    z.object({
                        requestsPerSecond: z.object({
                            current: z.number(),
                            average: z.number(),
                            peak: z.number(),
                        }),
                        requestCompletionTime: z.object({
                            averageMs: z.number(),
                            p99Ms: z.number(),
                            p999Ms: z.number(),
                        }),
                        requestSize: z.object({
                            averageKB: z.number(),
                            p99KB: z.number(),
                            p999KB: z.number(),
                        }),
                        responseSize: z.object({
                            averageKB: z.number(),
                            p99KB: z.number(),
                            p999KB: z.number(),
                        }),
                        totalRequests: z.number(),
                        failedRequests: z.number(),
                        successRate: z.number(),
                    }),
                ),
            });
        }
    }
}

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
