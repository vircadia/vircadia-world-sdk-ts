export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                    extensions?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            actions: {
                Row: {
                    general__action_id: string;
                    general__action_query: Json;
                    general__action_status: Database["public"]["Enums"]["action_status"];
                    general__claimed_by: string | null;
                    general__created_at: string | null;
                    general__created_by: string | null;
                    general__entity_script_id: string;
                    general__last_heartbeat: string | null;
                };
                Insert: {
                    general__action_id?: string;
                    general__action_query: Json;
                    general__action_status?: Database["public"]["Enums"]["action_status"];
                    general__claimed_by?: string | null;
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_script_id: string;
                    general__last_heartbeat?: string | null;
                };
                Update: {
                    general__action_id?: string;
                    general__action_query?: Json;
                    general__action_status?: Database["public"]["Enums"]["action_status"];
                    general__claimed_by?: string | null;
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_script_id?: string;
                    general__last_heartbeat?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "actions_general__claimed_by_fkey";
                        columns: ["general__claimed_by"];
                        isOneToOne: false;
                        referencedRelation: "agent_profiles";
                        referencedColumns: ["general__uuid"];
                    },
                    {
                        foreignKeyName: "actions_general__entity_script_id_fkey";
                        columns: ["general__entity_script_id"];
                        isOneToOne: false;
                        referencedRelation: "entity_scripts";
                        referencedColumns: ["general__script_id"];
                    },
                ];
            };
            agent_auth_providers: {
                Row: {
                    auth__agent_id: string;
                    auth__is_primary: boolean;
                    auth__provider_name: string;
                    auth__provider_uid: string | null;
                    general__created_at: string;
                };
                Insert: {
                    auth__agent_id: string;
                    auth__is_primary?: boolean;
                    auth__provider_name: string;
                    auth__provider_uid?: string | null;
                    general__created_at?: string;
                };
                Update: {
                    auth__agent_id?: string;
                    auth__is_primary?: boolean;
                    auth__provider_name?: string;
                    auth__provider_uid?: string | null;
                    general__created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "agent_auth_providers_auth__agent_id_fkey";
                        columns: ["auth__agent_id"];
                        isOneToOne: false;
                        referencedRelation: "agent_profiles";
                        referencedColumns: ["general__uuid"];
                    },
                    {
                        foreignKeyName: "agent_auth_providers_auth__provider_name_fkey";
                        columns: ["auth__provider_name"];
                        isOneToOne: false;
                        referencedRelation: "auth_providers";
                        referencedColumns: ["auth__provider_name"];
                    },
                ];
            };
            agent_profiles: {
                Row: {
                    auth__password_last_changed: string | null;
                    general__created_at: string;
                    general__updated_at: string;
                    general__uuid: string;
                    profile__username: string | null;
                };
                Insert: {
                    auth__password_last_changed?: string | null;
                    general__created_at?: string;
                    general__updated_at?: string;
                    general__uuid: string;
                    profile__username?: string | null;
                };
                Update: {
                    auth__password_last_changed?: string | null;
                    general__created_at?: string;
                    general__updated_at?: string;
                    general__uuid?: string;
                    profile__username?: string | null;
                };
                Relationships: [];
            };
            agent_roles: {
                Row: {
                    auth__agent_id: string;
                    auth__granted_at: string;
                    auth__granted_by: string | null;
                    auth__is_active: boolean;
                    auth__role_name: string;
                };
                Insert: {
                    auth__agent_id: string;
                    auth__granted_at?: string;
                    auth__granted_by?: string | null;
                    auth__is_active?: boolean;
                    auth__role_name: string;
                };
                Update: {
                    auth__agent_id?: string;
                    auth__granted_at?: string;
                    auth__granted_by?: string | null;
                    auth__is_active?: boolean;
                    auth__role_name?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "agent_roles_auth__agent_id_fkey";
                        columns: ["auth__agent_id"];
                        isOneToOne: false;
                        referencedRelation: "agent_profiles";
                        referencedColumns: ["general__uuid"];
                    },
                    {
                        foreignKeyName: "agent_roles_auth__granted_by_fkey";
                        columns: ["auth__granted_by"];
                        isOneToOne: false;
                        referencedRelation: "agent_profiles";
                        referencedColumns: ["general__uuid"];
                    },
                    {
                        foreignKeyName: "agent_roles_auth__role_name_fkey";
                        columns: ["auth__role_name"];
                        isOneToOne: false;
                        referencedRelation: "roles";
                        referencedColumns: ["auth__role_name"];
                    },
                ];
            };
            agent_sessions: {
                Row: {
                    auth__agent_id: string | null;
                    auth__provider_name: string | null;
                    general__session_id: string;
                    meta__metadata: Json | null;
                    session__is_active: boolean;
                    session__last_seen_at: string;
                    session__started_at: string;
                };
                Insert: {
                    auth__agent_id?: string | null;
                    auth__provider_name?: string | null;
                    general__session_id?: string;
                    meta__metadata?: Json | null;
                    session__is_active?: boolean;
                    session__last_seen_at?: string;
                    session__started_at?: string;
                };
                Update: {
                    auth__agent_id?: string | null;
                    auth__provider_name?: string | null;
                    general__session_id?: string;
                    meta__metadata?: Json | null;
                    session__is_active?: boolean;
                    session__last_seen_at?: string;
                    session__started_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "agent_sessions_auth__agent_id_fkey";
                        columns: ["auth__agent_id"];
                        isOneToOne: false;
                        referencedRelation: "agent_profiles";
                        referencedColumns: ["general__uuid"];
                    },
                    {
                        foreignKeyName: "agent_sessions_auth__provider_name_fkey";
                        columns: ["auth__provider_name"];
                        isOneToOne: false;
                        referencedRelation: "auth_providers";
                        referencedColumns: ["auth__provider_name"];
                    },
                ];
            };
            auth_providers: {
                Row: {
                    auth__is_active: boolean;
                    auth__provider_name: string;
                    general__created_at: string;
                    meta__description: string | null;
                };
                Insert: {
                    auth__is_active?: boolean;
                    auth__provider_name: string;
                    general__created_at?: string;
                    meta__description?: string | null;
                };
                Update: {
                    auth__is_active?: boolean;
                    auth__provider_name?: string;
                    general__created_at?: string;
                    meta__description?: string | null;
                };
                Relationships: [];
            };
            entities: {
                Row: {
                    general__created_at: string | null;
                    general__created_by: string | null;
                    general__name: string;
                    permissions__roles__full: string[] | null;
                    permissions__roles__view: string[] | null;
                    general__semantic_version: string;
                    general__updated_at: string | null;
                    general__uuid: string;
                    type__babylonjs: string;
                };
                Insert: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__name: string;
                    permissions__roles__full?: string[] | null;
                    permissions__roles__view?: string[] | null;
                    general__semantic_version?: string;
                    general__updated_at?: string | null;
                    general__uuid?: string;
                    type__babylonjs: string;
                };
                Update: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__name?: string;
                    permissions__roles__full?: string[] | null;
                    permissions__roles__view?: string[] | null;
                    general__semantic_version?: string;
                    general__updated_at?: string | null;
                    general__uuid?: string;
                    type__babylonjs?: string;
                };
                Relationships: [];
            };
            entities_metadata: {
                Row: {
                    general__created_at: string | null;
                    general__created_by: string | null;
                    general__entity_id: string;
                    general__metadata_id: string;
                    general__updated_at: string | null;
                    key__name: string;
                    values__boolean: boolean[] | null;
                    values__numeric: number[] | null;
                    values__text: string[] | null;
                    values__timestamp: string[] | null;
                };
                Insert: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id: string;
                    general__metadata_id?: string;
                    general__updated_at?: string | null;
                    key__name: string;
                    values__boolean?: boolean[] | null;
                    values__numeric?: number[] | null;
                    values__text?: string[] | null;
                    values__timestamp?: string[] | null;
                };
                Update: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id?: string;
                    general__metadata_id?: string;
                    general__updated_at?: string | null;
                    key__name?: string;
                    values__boolean?: boolean[] | null;
                    values__numeric?: number[] | null;
                    values__text?: string[] | null;
                    values__timestamp?: string[] | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "entities_metadata_general__entity_id_fkey";
                        columns: ["general__entity_id"];
                        isOneToOne: false;
                        referencedRelation: "entities";
                        referencedColumns: ["general__uuid"];
                    },
                ];
            };
            entity_metadata_states: {
                Row: {
                    entity_metadata_id: string;
                    general__created_at: string | null;
                    general__created_by: string | null;
                    general__entity_id: string;
                    general__metadata_id: string;
                    general__updated_at: string | null;
                    key__name: string;
                    tick_duration_ms: number | null;
                    tick_end_time: string | null;
                    tick_number: number;
                    tick_start_time: string | null;
                    timestamp: string | null;
                    values__boolean: boolean[] | null;
                    values__numeric: number[] | null;
                    values__text: string[] | null;
                    values__timestamp: string[] | null;
                };
                Insert: {
                    entity_metadata_id: string;
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id: string;
                    general__metadata_id?: string;
                    general__updated_at?: string | null;
                    key__name: string;
                    tick_duration_ms?: number | null;
                    tick_end_time?: string | null;
                    tick_number: number;
                    tick_start_time?: string | null;
                    timestamp?: string | null;
                    values__boolean?: boolean[] | null;
                    values__numeric?: number[] | null;
                    values__text?: string[] | null;
                    values__timestamp?: string[] | null;
                };
                Update: {
                    entity_metadata_id?: string;
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id?: string;
                    general__metadata_id?: string;
                    general__updated_at?: string | null;
                    key__name?: string;
                    tick_duration_ms?: number | null;
                    tick_end_time?: string | null;
                    tick_number?: number;
                    tick_start_time?: string | null;
                    timestamp?: string | null;
                    values__boolean?: boolean[] | null;
                    values__numeric?: number[] | null;
                    values__text?: string[] | null;
                    values__timestamp?: string[] | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "entity_metadata_states_entity_metadata_id_fkey";
                        columns: ["entity_metadata_id"];
                        isOneToOne: false;
                        referencedRelation: "entities_metadata";
                        referencedColumns: ["general__metadata_id"];
                    },
                ];
            };
            entity_scripts: {
                Row: {
                    compiled__web__browser__script: string | null;
                    compiled__web__browser__script_sha256: string | null;
                    compiled__web__browser__script_status:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__bun__script: string | null;
                    compiled__web__bun__script_sha256: string | null;
                    compiled__web__bun__script_status:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__node__script: string | null;
                    compiled__web__node__script_sha256: string | null;
                    compiled__web__node__script_status:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    general__created_at: string | null;
                    general__entity_id: string;
                    general__script_id: string;
                    general__updated_at: string | null;
                    source__git__repo_entry_path: string | null;
                    source__git__repo_url: string | null;
                };
                Insert: {
                    compiled__web__browser__script?: string | null;
                    compiled__web__browser__script_sha256?: string | null;
                    compiled__web__browser__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__bun__script?: string | null;
                    compiled__web__bun__script_sha256?: string | null;
                    compiled__web__bun__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__node__script?: string | null;
                    compiled__web__node__script_sha256?: string | null;
                    compiled__web__node__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    general__created_at?: string | null;
                    general__entity_id: string;
                    general__script_id?: string;
                    general__updated_at?: string | null;
                    source__git__repo_entry_path?: string | null;
                    source__git__repo_url?: string | null;
                };
                Update: {
                    compiled__web__browser__script?: string | null;
                    compiled__web__browser__script_sha256?: string | null;
                    compiled__web__browser__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__bun__script?: string | null;
                    compiled__web__bun__script_sha256?: string | null;
                    compiled__web__bun__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    compiled__web__node__script?: string | null;
                    compiled__web__node__script_sha256?: string | null;
                    compiled__web__node__script_status?:
                        | Database["public"]["Enums"]["script_compilation_status"]
                        | null;
                    general__created_at?: string | null;
                    general__entity_id?: string;
                    general__script_id?: string;
                    general__updated_at?: string | null;
                    source__git__repo_entry_path?: string | null;
                    source__git__repo_url?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "entity_scripts_general__entity_id_fkey";
                        columns: ["general__entity_id"];
                        isOneToOne: false;
                        referencedRelation: "entities";
                        referencedColumns: ["general__uuid"];
                    },
                ];
            };
            entity_states: {
                Row: {
                    general__created_at: string | null;
                    general__created_by: string | null;
                    general__entity_id: string;
                    general__name: string;
                    permissions__roles__full: string[] | null;
                    permissions__roles__view: string[] | null;
                    general__semantic_version: string;
                    general__updated_at: string | null;
                    general__uuid: string;
                    tick_duration_ms: number | null;
                    tick_end_time: string | null;
                    tick_number: number;
                    tick_start_time: string | null;
                    timestamp: string | null;
                    type__babylonjs: string;
                };
                Insert: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id: string;
                    general__name: string;
                    permissions__roles__full?: string[] | null;
                    permissions__roles__view?: string[] | null;
                    general__semantic_version?: string;
                    general__updated_at?: string | null;
                    general__uuid?: string;
                    tick_duration_ms?: number | null;
                    tick_end_time?: string | null;
                    tick_number: number;
                    tick_start_time?: string | null;
                    timestamp?: string | null;
                    type__babylonjs: string;
                };
                Update: {
                    general__created_at?: string | null;
                    general__created_by?: string | null;
                    general__entity_id?: string;
                    general__name?: string;
                    permissions__roles__full?: string[] | null;
                    permissions__roles__view?: string[] | null;
                    general__semantic_version?: string;
                    general__updated_at?: string | null;
                    general__uuid?: string;
                    tick_duration_ms?: number | null;
                    tick_end_time?: string | null;
                    tick_number?: number;
                    tick_start_time?: string | null;
                    timestamp?: string | null;
                    type__babylonjs?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "entity_states_general__entity_id_fkey";
                        columns: ["general__entity_id"];
                        isOneToOne: false;
                        referencedRelation: "entities";
                        referencedColumns: ["general__uuid"];
                    },
                ];
            };
            roles: {
                Row: {
                    auth__entity__object__can_insert: boolean;
                    auth__is_active: boolean;
                    auth__is_system: boolean;
                    auth__role_name: string;
                    general__created_at: string;
                    meta__description: string | null;
                };
                Insert: {
                    auth__entity__object__can_insert?: boolean;
                    auth__is_active?: boolean;
                    auth__is_system?: boolean;
                    auth__role_name: string;
                    general__created_at?: string;
                    meta__description?: string | null;
                };
                Update: {
                    auth__entity__object__can_insert?: boolean;
                    auth__is_active?: boolean;
                    auth__is_system?: boolean;
                    auth__role_name?: string;
                    general__created_at?: string;
                    meta__description?: string | null;
                };
                Relationships: [];
            };
            tick_metrics: {
                Row: {
                    duration_ms: number;
                    end_time: string;
                    general__created_at: string | null;
                    headroom_ms: number | null;
                    id: string;
                    is_delayed: boolean;
                    rate_limited: boolean | null;
                    start_time: string;
                    states_processed: number;
                    tick_number: number;
                    time_since_last_tick_ms: number | null;
                };
                Insert: {
                    duration_ms: number;
                    end_time: string;
                    general__created_at?: string | null;
                    headroom_ms?: number | null;
                    id?: string;
                    is_delayed: boolean;
                    rate_limited?: boolean | null;
                    start_time: string;
                    states_processed: number;
                    tick_number: number;
                    time_since_last_tick_ms?: number | null;
                };
                Update: {
                    duration_ms?: number;
                    end_time?: string;
                    general__created_at?: string | null;
                    headroom_ms?: number | null;
                    id?: string;
                    is_delayed?: boolean;
                    rate_limited?: boolean | null;
                    start_time?: string;
                    states_processed?: number;
                    tick_number?: number;
                    time_since_last_tick_ms?: number | null;
                };
                Relationships: [];
            };
            world_config: {
                Row: {
                    description: string | null;
                    general__created_at: string | null;
                    general__updated_at: string | null;
                    key: string;
                    value: Json;
                };
                Insert: {
                    description?: string | null;
                    general__created_at?: string | null;
                    general__updated_at?: string | null;
                    key: string;
                    value: Json;
                };
                Update: {
                    description?: string | null;
                    general__created_at?: string | null;
                    general__updated_at?: string | null;
                    key?: string;
                    value?: Json;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            _ltree_compress: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            _ltree_gist_options: {
                Args: {
                    "": unknown;
                };
                Returns: undefined;
            };
            capture_tick_state: {
                Args: Record<PropertyKey, never>;
                Returns: undefined;
            };
            cleanup_inactive_actions: {
                Args: {
                    retain_count: number;
                };
                Returns: undefined;
            };
            cleanup_old_entity_states: {
                Args: Record<PropertyKey, never>;
                Returns: undefined;
            };
            cleanup_old_tick_metrics: {
                Args: Record<PropertyKey, never>;
                Returns: undefined;
            };
            execute_entity_action: {
                Args: {
                    p_entity_script_id: string;
                    p_sql_query: string;
                    p_action_input: Json;
                };
                Returns: undefined;
            };
            expire_abandoned_actions: {
                Args: {
                    threshold_ms: number;
                };
                Returns: undefined;
            };
            get_server_time: {
                Args: Record<PropertyKey, never>;
                Returns: string;
            };
            lca: {
                Args: {
                    "": unknown[];
                };
                Returns: unknown;
            };
            lquery_in: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            lquery_out: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            lquery_recv: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            lquery_send: {
                Args: {
                    "": unknown;
                };
                Returns: string;
            };
            ltree_compress: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_decompress: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_gist_in: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_gist_options: {
                Args: {
                    "": unknown;
                };
                Returns: undefined;
            };
            ltree_gist_out: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_in: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_out: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_recv: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltree_send: {
                Args: {
                    "": unknown;
                };
                Returns: string;
            };
            ltree2text: {
                Args: {
                    "": unknown;
                };
                Returns: string;
            };
            ltxtq_in: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltxtq_out: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltxtq_recv: {
                Args: {
                    "": unknown;
                };
                Returns: unknown;
            };
            ltxtq_send: {
                Args: {
                    "": unknown;
                };
                Returns: string;
            };
            nlevel: {
                Args: {
                    "": unknown;
                };
                Returns: number;
            };
            text2ltree: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
        };
        Enums: {
            action_status:
                | "PENDING"
                | "IN_PROGRESS"
                | "COMPLETED"
                | "FAILED"
                | "REJECTED"
                | "EXPIRED"
                | "CANCELLED";
            script_compilation_status: "PENDING" | "COMPILED" | "FAILED";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
    PublicTableNameOrOptions extends
        | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
              Database[PublicTableNameOrOptions["schema"]]["Views"])
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
          Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
            PublicSchema["Views"])
      ? (PublicSchema["Tables"] &
            PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    PublicTableNameOrOptions extends
        | keyof PublicSchema["Tables"]
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
      ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    PublicTableNameOrOptions extends
        | keyof PublicSchema["Tables"]
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
      ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    PublicEnumNameOrOptions extends
        | keyof PublicSchema["Enums"]
        | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
      ? PublicSchema["Enums"][PublicEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof PublicSchema["CompositeTypes"]
        | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
      ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;
