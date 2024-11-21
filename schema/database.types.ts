export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actions: {
        Row: {
          general__action_data: Json
          general__action_id: string
          general__action_status: Database["public"]["Enums"]["action_status"]
          general__claimed_by: string | null
          general__created_at: string | null
          general__created_by: string | null
          general__entity_script_id: string
          general__last_heartbeat: string | null
        }
        Insert: {
          general__action_data: Json
          general__action_id?: string
          general__action_status?: Database["public"]["Enums"]["action_status"]
          general__claimed_by?: string | null
          general__created_at?: string | null
          general__created_by?: string | null
          general__entity_script_id: string
          general__last_heartbeat?: string | null
        }
        Update: {
          general__action_data?: Json
          general__action_id?: string
          general__action_status?: Database["public"]["Enums"]["action_status"]
          general__claimed_by?: string | null
          general__created_at?: string | null
          general__created_by?: string | null
          general__entity_script_id?: string
          general__last_heartbeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_general__claimed_by_fkey"
            columns: ["general__claimed_by"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_general__entity_script_id_fkey"
            columns: ["general__entity_script_id"]
            isOneToOne: false
            referencedRelation: "entity_scripts"
            referencedColumns: ["entity_script_id"]
          },
        ]
      }
      agent_auth_providers: {
        Row: {
          agent_id: string
          created_at: string
          is_primary: boolean
          provider_name: string
          provider_uid: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          is_primary?: boolean
          provider_name: string
          provider_uid?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          is_primary?: boolean
          provider_name?: string
          provider_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_auth_providers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_auth_providers_provider_name_fkey"
            columns: ["provider_name"]
            isOneToOne: false
            referencedRelation: "auth_providers"
            referencedColumns: ["provider_name"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          created_at: string
          id: string
          password_last_changed: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id: string
          password_last_changed?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          password_last_changed?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      agent_roles: {
        Row: {
          agent_id: string
          granted_at: string
          granted_by: string | null
          is_active: boolean
          role_name: string
        }
        Insert: {
          agent_id: string
          granted_at?: string
          granted_by?: string | null
          is_active?: boolean
          role_name: string
        }
        Update: {
          agent_id?: string
          granted_at?: string
          granted_by?: string | null
          is_active?: boolean
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_roles_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_roles_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          agent_id: string | null
          id: string
          is_active: boolean
          last_seen_at: string
          metadata: Json | null
          provider_name: string | null
          started_at: string
        }
        Insert: {
          agent_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json | null
          provider_name?: string | null
          started_at?: string
        }
        Update: {
          agent_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json | null
          provider_name?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_provider_name_fkey"
            columns: ["provider_name"]
            isOneToOne: false
            referencedRelation: "auth_providers"
            referencedColumns: ["provider_name"]
          },
        ]
      }
      auth_providers: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          provider_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          provider_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          provider_name?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          agent__ai_properties: Json | null
          agent__inventory: Json | null
          babylonjs__billboard_mode:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids: string[] | null
          babylonjs__include_only_mesh_ids: string[] | null
          babylonjs__light_angle: number | null
          babylonjs__light_diffuse:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent: number | null
          babylonjs__light_falloff_type: string | null
          babylonjs__light_ground_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity: number | null
          babylonjs__light_intensity_mode: string | null
          babylonjs__light_mode:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius: number | null
          babylonjs__light_range: number | null
          babylonjs__light_specular:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto: boolean | null
          babylonjs__lod_distance: number | null
          babylonjs__lod_hide: number | null
          babylonjs__lod_level:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size: number | null
          babylonjs__material_alpha: number | null
          babylonjs__material_ambient:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture: string | null
          babylonjs__material_ambient_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights:
            | number
            | null
          babylonjs__material_ambient_texture_strength: number | null
          babylonjs__material_backfaceculling: boolean | null
          babylonjs__material_bump_texture: string | null
          babylonjs__material_bump_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties: Json | null
          babylonjs__material_diffuse:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture: string | null
          babylonjs__material_diffuse_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity: number | null
          babylonjs__material_emissive:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture: string | null
          babylonjs__material_emissive_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map: boolean | null
          babylonjs__material_enable_specular_anti_aliasing: boolean | null
          babylonjs__material_environment_intensity: number | null
          babylonjs__material_environment_texture: string | null
          babylonjs__material_environment_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward: boolean | null
          babylonjs__material_index_of_refraction: number | null
          babylonjs__material_lightmap_texture: string | null
          babylonjs__material_lightmap_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights: number | null
          babylonjs__material_metallic: number | null
          babylonjs__material_metallic_f0_factor: number | null
          babylonjs__material_metallic_reflectance_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture: string | null
          babylonjs__material_metallic_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface: number | null
          babylonjs__material_microsurface_texture: string | null
          babylonjs__material_microsurface_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture: string | null
          babylonjs__material_opacity_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture: string | null
          babylonjs__material_reflection_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture: string | null
          babylonjs__material_reflectivity_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture: string | null
          babylonjs__material_refraction_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness: number | null
          babylonjs__material_shader_code: string | null
          babylonjs__material_shader_parameters: Json | null
          babylonjs__material_specular:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power: number | null
          babylonjs__material_specular_texture: string | null
          babylonjs__material_specular_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type: string | null
          babylonjs__material_use_alpha_from_diffuse_texture: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination: boolean | null
          babylonjs__material_use_gltf_light_falloff: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff: boolean | null
          babylonjs__material_use_radiance_over_alpha: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha: boolean | null
          babylonjs__material_wireframe: boolean | null
          babylonjs__mesh_gltf_data: Json | null
          babylonjs__mesh_gltf_file_path: string | null
          babylonjs__mesh_instance_of_id: string | null
          babylonjs__mesh_is_instance: boolean | null
          babylonjs__mesh_joints:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id: string | null
          babylonjs__mesh_physics_properties: Json | null
          babylonjs__physics_angular_damping: number | null
          babylonjs__physics_angular_velocity:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x: number | null
          babylonjs__physics_angular_velocity_y: number | null
          babylonjs__physics_angular_velocity_z: number | null
          babylonjs__physics_collision_filter_group: number | null
          babylonjs__physics_collision_filter_mask: number | null
          babylonjs__physics_friction: number | null
          babylonjs__physics_is_static: boolean | null
          babylonjs__physics_linear_damping: number | null
          babylonjs__physics_linear_velocity:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass: number | null
          babylonjs__physics_motion_type: string | null
          babylonjs__physics_restitution: number | null
          babylonjs__physics_shape_data: Json | null
          babylonjs__physics_shape_type: string | null
          babylonjs__physics_velocity_x: number | null
          babylonjs__physics_velocity_y: number | null
          babylonjs__physics_velocity_z: number | null
          babylonjs__shadow_bias: number | null
          babylonjs__shadow_blur_kernel: number | null
          babylonjs__shadow_darkness: number | null
          babylonjs__shadow_enabled: boolean | null
          babylonjs__shadow_frustum_size: number | null
          babylonjs__shadow_map_size: number | null
          babylonjs__shadow_quality:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x: number | null
          babylonjs__transform_position_y: number | null
          babylonjs__transform_position_z: number | null
          babylonjs__transform_rotation_w: number | null
          babylonjs__transform_rotation_x: number | null
          babylonjs__transform_rotation_y: number | null
          babylonjs__transform_rotation_z: number | null
          babylonjs__transform_scale_x: number | null
          babylonjs__transform_scale_y: number | null
          babylonjs__transform_scale_z: number | null
          general__created_at: string | null
          general__name: string
          general__parent_entity_id: string | null
          general__semantic_version: string
          general__type: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at: string | null
          general__uuid: string
          permissions__can_view_roles: string[] | null
        }
        Insert: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids?: string[] | null
          babylonjs__include_only_mesh_ids?: string[] | null
          babylonjs__light_angle?: number | null
          babylonjs__light_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent?: number | null
          babylonjs__light_falloff_type?: string | null
          babylonjs__light_ground_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity?: number | null
          babylonjs__light_intensity_mode?: string | null
          babylonjs__light_mode?:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness?: number | null
          babylonjs__material_shader_code?: string | null
          babylonjs__material_shader_parameters?: Json | null
          babylonjs__material_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power?: number | null
          babylonjs__material_specular_texture?: string | null
          babylonjs__material_specular_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type?: string | null
          babylonjs__material_use_alpha_from_diffuse_texture?: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map?:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination?: boolean | null
          babylonjs__material_use_gltf_light_falloff?: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap?: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue?:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph?:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff?: boolean | null
          babylonjs__material_use_radiance_over_alpha?: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha?:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green?:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha?: boolean | null
          babylonjs__material_wireframe?: boolean | null
          babylonjs__mesh_gltf_data?: Json | null
          babylonjs__mesh_gltf_file_path?: string | null
          babylonjs__mesh_instance_of_id?: string | null
          babylonjs__mesh_is_instance?: boolean | null
          babylonjs__mesh_joints?:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id?: string | null
          babylonjs__mesh_physics_properties?: Json | null
          babylonjs__physics_angular_damping?: number | null
          babylonjs__physics_angular_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x?: number | null
          babylonjs__physics_angular_velocity_y?: number | null
          babylonjs__physics_angular_velocity_z?: number | null
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_is_static?: boolean | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__physics_velocity_x?: number | null
          babylonjs__physics_velocity_y?: number | null
          babylonjs__physics_velocity_z?: number | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x?: number | null
          babylonjs__transform_position_y?: number | null
          babylonjs__transform_position_z?: number | null
          babylonjs__transform_rotation_w?: number | null
          babylonjs__transform_rotation_x?: number | null
          babylonjs__transform_rotation_y?: number | null
          babylonjs__transform_rotation_z?: number | null
          babylonjs__transform_scale_x?: number | null
          babylonjs__transform_scale_y?: number | null
          babylonjs__transform_scale_z?: number | null
          general__created_at?: string | null
          general__name: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__type: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at?: string | null
          general__uuid?: string
          permissions__can_view_roles?: string[] | null
        }
        Update: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids?: string[] | null
          babylonjs__include_only_mesh_ids?: string[] | null
          babylonjs__light_angle?: number | null
          babylonjs__light_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent?: number | null
          babylonjs__light_falloff_type?: string | null
          babylonjs__light_ground_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity?: number | null
          babylonjs__light_intensity_mode?: string | null
          babylonjs__light_mode?:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness?: number | null
          babylonjs__material_shader_code?: string | null
          babylonjs__material_shader_parameters?: Json | null
          babylonjs__material_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power?: number | null
          babylonjs__material_specular_texture?: string | null
          babylonjs__material_specular_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type?: string | null
          babylonjs__material_use_alpha_from_diffuse_texture?: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map?:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination?: boolean | null
          babylonjs__material_use_gltf_light_falloff?: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap?: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue?:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph?:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff?: boolean | null
          babylonjs__material_use_radiance_over_alpha?: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha?:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green?:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha?: boolean | null
          babylonjs__material_wireframe?: boolean | null
          babylonjs__mesh_gltf_data?: Json | null
          babylonjs__mesh_gltf_file_path?: string | null
          babylonjs__mesh_instance_of_id?: string | null
          babylonjs__mesh_is_instance?: boolean | null
          babylonjs__mesh_joints?:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id?: string | null
          babylonjs__mesh_physics_properties?: Json | null
          babylonjs__physics_angular_damping?: number | null
          babylonjs__physics_angular_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x?: number | null
          babylonjs__physics_angular_velocity_y?: number | null
          babylonjs__physics_angular_velocity_z?: number | null
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_is_static?: boolean | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__physics_velocity_x?: number | null
          babylonjs__physics_velocity_y?: number | null
          babylonjs__physics_velocity_z?: number | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x?: number | null
          babylonjs__transform_position_y?: number | null
          babylonjs__transform_position_z?: number | null
          babylonjs__transform_rotation_w?: number | null
          babylonjs__transform_rotation_x?: number | null
          babylonjs__transform_rotation_y?: number | null
          babylonjs__transform_rotation_z?: number | null
          babylonjs__transform_scale_x?: number | null
          babylonjs__transform_scale_y?: number | null
          babylonjs__transform_scale_z?: number | null
          general__created_at?: string | null
          general__name?: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__type?: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at?: string | null
          general__uuid?: string
          permissions__can_view_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_babylonjs__mesh_instance_of_id_fkey"
            columns: ["babylonjs__mesh_instance_of_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
          {
            foreignKeyName: "entities_babylonjs__mesh_material_id_fkey"
            columns: ["babylonjs__mesh_material_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
          {
            foreignKeyName: "entities_general__parent_entity_id_fkey"
            columns: ["general__parent_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      entities_metadata: {
        Row: {
          created_at: string | null
          entity_id: string
          key: string
          metadata_id: string
          updated_at: string | null
          values__boolean: boolean[] | null
          values__numeric: number[] | null
          values__text: string[] | null
          values__timestamp: string[] | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          key: string
          metadata_id?: string
          updated_at?: string | null
          values__boolean?: boolean[] | null
          values__numeric?: number[] | null
          values__text?: string[] | null
          values__timestamp?: string[] | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          key?: string
          metadata_id?: string
          updated_at?: string | null
          values__boolean?: boolean[] | null
          values__numeric?: number[] | null
          values__text?: string[] | null
          values__timestamp?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_metadata_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      entity_scripts: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_script_id: string
          git_repo_entry_path: string | null
          git_repo_url: string | null
          updated_at: string | null
          web__compiled__browser__script: string | null
          web__compiled__browser__script_sha256: string | null
          web__compiled__browser__script_status: string | null
          web__compiled__bun__script: string | null
          web__compiled__bun__script_sha256: string | null
          web__compiled__bun__script_status: string | null
          web__compiled__node__script: string | null
          web__compiled__node__script_sha256: string | null
          web__compiled__node__script_status: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_script_id?: string
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?: string | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?: string | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_script_id?: string
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?: string | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?: string | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_scripts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      entity_states: {
        Row: {
          agent__ai_properties: Json | null
          agent__inventory: Json | null
          babylonjs__billboard_mode:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids: string[] | null
          babylonjs__include_only_mesh_ids: string[] | null
          babylonjs__light_angle: number | null
          babylonjs__light_diffuse:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent: number | null
          babylonjs__light_falloff_type: string | null
          babylonjs__light_ground_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity: number | null
          babylonjs__light_intensity_mode: string | null
          babylonjs__light_mode:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius: number | null
          babylonjs__light_range: number | null
          babylonjs__light_specular:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto: boolean | null
          babylonjs__lod_distance: number | null
          babylonjs__lod_hide: number | null
          babylonjs__lod_level:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size: number | null
          babylonjs__material_alpha: number | null
          babylonjs__material_ambient:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture: string | null
          babylonjs__material_ambient_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights:
            | number
            | null
          babylonjs__material_ambient_texture_strength: number | null
          babylonjs__material_backfaceculling: boolean | null
          babylonjs__material_bump_texture: string | null
          babylonjs__material_bump_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties: Json | null
          babylonjs__material_diffuse:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture: string | null
          babylonjs__material_diffuse_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity: number | null
          babylonjs__material_emissive:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture: string | null
          babylonjs__material_emissive_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map: boolean | null
          babylonjs__material_enable_specular_anti_aliasing: boolean | null
          babylonjs__material_environment_intensity: number | null
          babylonjs__material_environment_texture: string | null
          babylonjs__material_environment_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward: boolean | null
          babylonjs__material_index_of_refraction: number | null
          babylonjs__material_lightmap_texture: string | null
          babylonjs__material_lightmap_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights: number | null
          babylonjs__material_metallic: number | null
          babylonjs__material_metallic_f0_factor: number | null
          babylonjs__material_metallic_reflectance_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture: string | null
          babylonjs__material_metallic_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface: number | null
          babylonjs__material_microsurface_texture: string | null
          babylonjs__material_microsurface_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture: string | null
          babylonjs__material_opacity_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture: string | null
          babylonjs__material_reflection_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture: string | null
          babylonjs__material_reflectivity_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture: string | null
          babylonjs__material_refraction_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness: number | null
          babylonjs__material_shader_code: string | null
          babylonjs__material_shader_parameters: Json | null
          babylonjs__material_specular:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power: number | null
          babylonjs__material_specular_texture: string | null
          babylonjs__material_specular_texture_color_space:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type: string | null
          babylonjs__material_use_alpha_from_diffuse_texture: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination: boolean | null
          babylonjs__material_use_gltf_light_falloff: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff: boolean | null
          babylonjs__material_use_radiance_over_alpha: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha: boolean | null
          babylonjs__material_wireframe: boolean | null
          babylonjs__mesh_gltf_data: Json | null
          babylonjs__mesh_gltf_file_path: string | null
          babylonjs__mesh_instance_of_id: string | null
          babylonjs__mesh_is_instance: boolean | null
          babylonjs__mesh_joints:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id: string | null
          babylonjs__mesh_physics_properties: Json | null
          babylonjs__physics_angular_damping: number | null
          babylonjs__physics_angular_velocity:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x: number | null
          babylonjs__physics_angular_velocity_y: number | null
          babylonjs__physics_angular_velocity_z: number | null
          babylonjs__physics_collision_filter_group: number | null
          babylonjs__physics_collision_filter_mask: number | null
          babylonjs__physics_friction: number | null
          babylonjs__physics_is_static: boolean | null
          babylonjs__physics_linear_damping: number | null
          babylonjs__physics_linear_velocity:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass: number | null
          babylonjs__physics_motion_type: string | null
          babylonjs__physics_restitution: number | null
          babylonjs__physics_shape_data: Json | null
          babylonjs__physics_shape_type: string | null
          babylonjs__physics_velocity_x: number | null
          babylonjs__physics_velocity_y: number | null
          babylonjs__physics_velocity_z: number | null
          babylonjs__shadow_bias: number | null
          babylonjs__shadow_blur_kernel: number | null
          babylonjs__shadow_darkness: number | null
          babylonjs__shadow_enabled: boolean | null
          babylonjs__shadow_frustum_size: number | null
          babylonjs__shadow_map_size: number | null
          babylonjs__shadow_quality:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x: number | null
          babylonjs__transform_position_y: number | null
          babylonjs__transform_position_z: number | null
          babylonjs__transform_rotation_w: number | null
          babylonjs__transform_rotation_x: number | null
          babylonjs__transform_rotation_y: number | null
          babylonjs__transform_rotation_z: number | null
          babylonjs__transform_scale_x: number | null
          babylonjs__transform_scale_y: number | null
          babylonjs__transform_scale_z: number | null
          entity_id: string
          general__created_at: string | null
          general__name: string
          general__parent_entity_id: string | null
          general__semantic_version: string
          general__type: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at: string | null
          general__uuid: string
          permissions__can_view_roles: string[] | null
          tick_duration_ms: number | null
          tick_end_time: string | null
          tick_number: number
          tick_start_time: string | null
          timestamp: string | null
        }
        Insert: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids?: string[] | null
          babylonjs__include_only_mesh_ids?: string[] | null
          babylonjs__light_angle?: number | null
          babylonjs__light_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent?: number | null
          babylonjs__light_falloff_type?: string | null
          babylonjs__light_ground_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity?: number | null
          babylonjs__light_intensity_mode?: string | null
          babylonjs__light_mode?:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness?: number | null
          babylonjs__material_shader_code?: string | null
          babylonjs__material_shader_parameters?: Json | null
          babylonjs__material_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power?: number | null
          babylonjs__material_specular_texture?: string | null
          babylonjs__material_specular_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type?: string | null
          babylonjs__material_use_alpha_from_diffuse_texture?: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map?:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination?: boolean | null
          babylonjs__material_use_gltf_light_falloff?: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap?: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue?:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph?:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff?: boolean | null
          babylonjs__material_use_radiance_over_alpha?: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha?:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green?:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha?: boolean | null
          babylonjs__material_wireframe?: boolean | null
          babylonjs__mesh_gltf_data?: Json | null
          babylonjs__mesh_gltf_file_path?: string | null
          babylonjs__mesh_instance_of_id?: string | null
          babylonjs__mesh_is_instance?: boolean | null
          babylonjs__mesh_joints?:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id?: string | null
          babylonjs__mesh_physics_properties?: Json | null
          babylonjs__physics_angular_damping?: number | null
          babylonjs__physics_angular_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x?: number | null
          babylonjs__physics_angular_velocity_y?: number | null
          babylonjs__physics_angular_velocity_z?: number | null
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_is_static?: boolean | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__physics_velocity_x?: number | null
          babylonjs__physics_velocity_y?: number | null
          babylonjs__physics_velocity_z?: number | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x?: number | null
          babylonjs__transform_position_y?: number | null
          babylonjs__transform_position_z?: number | null
          babylonjs__transform_rotation_w?: number | null
          babylonjs__transform_rotation_x?: number | null
          babylonjs__transform_rotation_y?: number | null
          babylonjs__transform_rotation_z?: number | null
          babylonjs__transform_scale_x?: number | null
          babylonjs__transform_scale_y?: number | null
          babylonjs__transform_scale_z?: number | null
          entity_id: string
          general__created_at?: string | null
          general__name: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__type: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at?: string | null
          general__uuid?: string
          permissions__can_view_roles?: string[] | null
          tick_duration_ms?: number | null
          tick_end_time?: string | null
          tick_number: number
          tick_start_time?: string | null
          timestamp?: string | null
        }
        Update: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["billboard_mode_enum"]
            | null
          babylonjs__exclude_mesh_ids?: string[] | null
          babylonjs__include_only_mesh_ids?: string[] | null
          babylonjs__light_angle?: number | null
          babylonjs__light_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_direction?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__light_exponent?: number | null
          babylonjs__light_falloff_type?: string | null
          babylonjs__light_ground_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_intensity?: number | null
          babylonjs__light_intensity_mode?: string | null
          babylonjs__light_mode?:
            | Database["public"]["Enums"]["light_mode_enum"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?:
            | Database["public"]["Enums"]["light_type_enum"]
            | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["lod_level_enum"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["lod_mode_enum"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_roughness?: number | null
          babylonjs__material_shader_code?: string | null
          babylonjs__material_shader_parameters?: Json | null
          babylonjs__material_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_specular_power?: number | null
          babylonjs__material_specular_texture?: string | null
          babylonjs__material_specular_texture_color_space?:
            | Database["public"]["Enums"]["texture_color_space_enum"]
            | null
          babylonjs__material_type?: string | null
          babylonjs__material_use_alpha_from_diffuse_texture?: boolean | null
          babylonjs__material_use_auto_microsurface_from_reflectivity_map?:
            | boolean
            | null
          babylonjs__material_use_emissive_as_illumination?: boolean | null
          babylonjs__material_use_gltf_light_falloff?: boolean | null
          babylonjs__material_use_lightmap_as_shadowmap?: boolean | null
          babylonjs__material_use_metallness_from_metallic_texture_blue?:
            | boolean
            | null
          babylonjs__material_use_microsurface_from_reflectivity_map_alph?:
            | boolean
            | null
          babylonjs__material_use_physical_light_falloff?: boolean | null
          babylonjs__material_use_radiance_over_alpha?: boolean | null
          babylonjs__material_use_roughness_from_metallic_texture_alpha?:
            | boolean
            | null
          babylonjs__material_use_roughness_from_metallic_texture_green?:
            | boolean
            | null
          babylonjs__material_use_specular_over_alpha?: boolean | null
          babylonjs__material_wireframe?: boolean | null
          babylonjs__mesh_gltf_data?: Json | null
          babylonjs__mesh_gltf_file_path?: string | null
          babylonjs__mesh_instance_of_id?: string | null
          babylonjs__mesh_is_instance?: boolean | null
          babylonjs__mesh_joints?:
            | Database["public"]["CompositeTypes"]["joint"][]
            | null
          babylonjs__mesh_material_id?: string | null
          babylonjs__mesh_physics_properties?: Json | null
          babylonjs__physics_angular_damping?: number | null
          babylonjs__physics_angular_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_angular_velocity_x?: number | null
          babylonjs__physics_angular_velocity_y?: number | null
          babylonjs__physics_angular_velocity_z?: number | null
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_is_static?: boolean | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__physics_velocity_x?: number | null
          babylonjs__physics_velocity_y?: number | null
          babylonjs__physics_velocity_z?: number | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?:
            | Database["public"]["Enums"]["shadow_quality_enum"]
            | null
          babylonjs__transform_position_x?: number | null
          babylonjs__transform_position_y?: number | null
          babylonjs__transform_position_z?: number | null
          babylonjs__transform_rotation_w?: number | null
          babylonjs__transform_rotation_x?: number | null
          babylonjs__transform_rotation_y?: number | null
          babylonjs__transform_rotation_z?: number | null
          babylonjs__transform_scale_x?: number | null
          babylonjs__transform_scale_y?: number | null
          babylonjs__transform_scale_z?: number | null
          entity_id?: string
          general__created_at?: string | null
          general__name?: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__type?: Database["public"]["Enums"]["general_type_enum"]
          general__updated_at?: string | null
          general__uuid?: string
          permissions__can_view_roles?: string[] | null
          tick_duration_ms?: number | null
          tick_end_time?: string | null
          tick_number?: number
          tick_start_time?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_states_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          is_system: boolean
          role_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          role_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          is_system?: boolean
          role_name?: string
        }
        Relationships: []
      }
      script_sources: {
        Row: {
          created_at: string | null
          git_repo_entry_path: string | null
          git_repo_url: string | null
          updated_at: string | null
          web__compiled__browser__script: string | null
          web__compiled__browser__script_sha256: string | null
          web__compiled__browser__script_status: string | null
          web__compiled__bun__script: string | null
          web__compiled__bun__script_sha256: string | null
          web__compiled__bun__script_status: string | null
          web__compiled__node__script: string | null
          web__compiled__node__script_sha256: string | null
          web__compiled__node__script_status: string | null
        }
        Insert: {
          created_at?: string | null
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?: string | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?: string | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?: string | null
        }
        Update: {
          created_at?: string | null
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?: string | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?: string | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?: string | null
        }
        Relationships: []
      }
      tick_metrics: {
        Row: {
          created_at: string | null
          duration_ms: number
          end_time: string
          headroom_ms: number | null
          id: string
          is_delayed: boolean
          rate_limited: boolean | null
          start_time: string
          states_processed: number
          tick_number: number
          time_since_last_tick_ms: number | null
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          end_time: string
          headroom_ms?: number | null
          id?: string
          is_delayed: boolean
          rate_limited?: boolean | null
          start_time: string
          states_processed: number
          tick_number: number
          time_since_last_tick_ms?: number | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          end_time?: string
          headroom_ms?: number | null
          id?: string
          is_delayed?: boolean
          rate_limited?: boolean | null
          start_time?: string
          states_processed?: number
          tick_number?: number
          time_since_last_tick_ms?: number | null
        }
        Relationships: []
      }
      world_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ltree_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      capture_tick_state: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_inactive_actions: {
        Args: {
          retain_count: number
        }
        Returns: undefined
      }
      cleanup_old_entity_states: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_tick_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_entity_with_action: {
        Args: {
          p_entity_script_id: string
          p_action_input: Json
          p_entity_data: Json
        }
        Returns: string
      }
      delete_entity_with_action: {
        Args: {
          p_entity_id: string
          p_entity_script_id: string
          p_action_input: Json
        }
        Returns: undefined
      }
      expire_abandoned_actions: {
        Args: {
          threshold_ms: number
        }
        Returns: undefined
      }
      get_entity_state_at_timestamp: {
        Args: {
          target_timestamp: string
        }
        Returns: {
          entity_id: string
          babylonjs__transform_position_x: number
          babylonjs__transform_position_y: number
          babylonjs__transform_position_z: number
          babylonjs__transform_rotation_x: number
          babylonjs__transform_rotation_y: number
          babylonjs__transform_rotation_z: number
          babylonjs__transform_rotation_w: number
          babylonjs__physics_velocity_x: number
          babylonjs__physics_velocity_y: number
          babylonjs__physics_velocity_z: number
          babylonjs__physics_angular_velocity_x: number
          babylonjs__physics_angular_velocity_y: number
          babylonjs__physics_angular_velocity_z: number
        }[]
      }
      get_server_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      lca: {
        Args: {
          "": unknown[]
        }
        Returns: unknown
      }
      lquery_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      lquery_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      lquery_recv: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      lquery_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      ltree_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_recv: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltree_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      ltree2text: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      ltxtq_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltxtq_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ltxtq_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      nlevel: {
        Args: {
          "": unknown
        }
        Returns: number
      }
      text2ltree: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      update_entity_with_action: {
        Args: {
          p_entity_id: string
          p_entity_script_id: string
          p_action_input: Json
          p_entity_data: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      action_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "FAILED"
        | "REJECTED"
        | "EXPIRED"
        | "CANCELLED"
      billboard_mode_enum:
        | "BILLBOARDMODE_NONE"
        | "BILLBOARDMODE_X"
        | "BILLBOARDMODE_Y"
        | "BILLBOARDMODE_Z"
        | "BILLBOARDMODE_ALL"
      general_type_enum: "MESH" | "LIGHT" | "VOLUME" | "MATERIAL" | "CAMERA"
      light_mode_enum: "default" | "shadowsOnly" | "specular"
      light_type_enum: "POINT" | "DIRECTIONAL" | "SPOT" | "HEMISPHERIC"
      lod_level_enum: "LOD0" | "LOD1" | "LOD2" | "LOD3" | "LOD4"
      lod_mode_enum: "distance" | "size"
      shadow_quality_enum: "LOW" | "MEDIUM" | "HIGH"
      texture_color_space_enum: "linear" | "sRGB" | "gamma"
    }
    CompositeTypes: {
      color4: {
        r: number | null
        g: number | null
        b: number | null
        a: number | null
      }
      joint: {
        name: string | null
        index: number | null
        position: Database["public"]["CompositeTypes"]["vector3"] | null
        rotation: Database["public"]["CompositeTypes"]["quaternion"] | null
        scale: Database["public"]["CompositeTypes"]["vector3"] | null
        inverse_bind_matrix: number[] | null
        parent_index: number | null
      }
      quaternion: {
        x: number | null
        y: number | null
        z: number | null
        w: number | null
      }
      transform: {
        position: Database["public"]["CompositeTypes"]["vector3"] | null
        rotation: Database["public"]["CompositeTypes"]["vector3"] | null
        scale: Database["public"]["CompositeTypes"]["vector3"] | null
      }
      vector3: {
        x: number | null
        y: number | null
        z: number | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

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
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

