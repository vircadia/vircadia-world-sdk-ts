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
            | Database["public"]["Enums"]["babylon_billboard_mode"]
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
            | Database["public"]["Enums"]["babylon_light_mode"]
            | null
          babylonjs__light_radius: number | null
          babylonjs__light_range: number | null
          babylonjs__light_specular:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type: string | null
          babylonjs__lod_auto: boolean | null
          babylonjs__lod_distance: number | null
          babylonjs__lod_hide: number | null
          babylonjs__lod_level:
            | Database["public"]["Enums"]["babylon_lod_level"]
            | null
          babylonjs__lod_mode:
            | Database["public"]["Enums"]["babylon_lod_mode"]
            | null
          babylonjs__lod_size: number | null
          babylonjs__material_alpha: number | null
          babylonjs__material_ambient:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture: string | null
          babylonjs__material_ambient_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights:
            | number
            | null
          babylonjs__material_ambient_texture_strength: number | null
          babylonjs__material_backfaceculling: boolean | null
          babylonjs__material_bump_texture: string | null
          babylonjs__material_bump_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_custom_properties: Json | null
          babylonjs__material_diffuse:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture: string | null
          babylonjs__material_diffuse_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_direct_intensity: number | null
          babylonjs__material_emissive:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture: string | null
          babylonjs__material_emissive_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_enable_irradiance_map: boolean | null
          babylonjs__material_enable_specular_anti_aliasing: boolean | null
          babylonjs__material_environment_intensity: number | null
          babylonjs__material_environment_texture: string | null
          babylonjs__material_environment_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_force_normal_forward: boolean | null
          babylonjs__material_index_of_refraction: number | null
          babylonjs__material_lightmap_texture: string | null
          babylonjs__material_lightmap_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_max_simultaneous_lights: number | null
          babylonjs__material_metallic: number | null
          babylonjs__material_metallic_f0_factor: number | null
          babylonjs__material_metallic_reflectance_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture: string | null
          babylonjs__material_metallic_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_microsurface: number | null
          babylonjs__material_microsurface_texture: string | null
          babylonjs__material_microsurface_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_opacity_texture: string | null
          babylonjs__material_opacity_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflection_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture: string | null
          babylonjs__material_reflection_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflectivity_color:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture: string | null
          babylonjs__material_reflectivity_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_refraction_texture: string | null
          babylonjs__material_refraction_texture_color_space:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
          babylonjs__physics_collision_filter_group: number | null
          babylonjs__physics_collision_filter_mask: number | null
          babylonjs__physics_friction: number | null
          babylonjs__physics_linear_damping: number | null
          babylonjs__physics_linear_velocity:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass: number | null
          babylonjs__physics_motion_type: string | null
          babylonjs__physics_restitution: number | null
          babylonjs__physics_shape_data: Json | null
          babylonjs__physics_shape_type: string | null
          babylonjs__shadow_bias: number | null
          babylonjs__shadow_blur_kernel: number | null
          babylonjs__shadow_darkness: number | null
          babylonjs__shadow_enabled: boolean | null
          babylonjs__shadow_frustum_size: number | null
          babylonjs__shadow_map_size: number | null
          babylonjs__shadow_quality: string | null
          general__created_at: string | null
          general__name: string
          general__parent_entity_id: string | null
          general__semantic_version: string
          general__transform: Database["public"]["CompositeTypes"]["transform"]
          general__type: string
          general__updated_at: string | null
          general__uuid: string
          permissions__groups__execute: string[] | null
          permissions__groups__read: string[] | null
          permissions__groups__write: string[] | null
          zone__properties: Json | null
        }
        Insert: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["babylon_billboard_mode"]
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
            | Database["public"]["Enums"]["babylon_light_mode"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?: string | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["babylon_lod_level"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["babylon_lod_mode"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?: string | null
          general__created_at?: string | null
          general__name: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__transform?: Database["public"]["CompositeTypes"]["transform"]
          general__type: string
          general__updated_at?: string | null
          general__uuid?: string
          permissions__groups__execute?: string[] | null
          permissions__groups__read?: string[] | null
          permissions__groups__write?: string[] | null
          zone__properties?: Json | null
        }
        Update: {
          agent__ai_properties?: Json | null
          agent__inventory?: Json | null
          babylonjs__billboard_mode?:
            | Database["public"]["Enums"]["babylon_billboard_mode"]
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
            | Database["public"]["Enums"]["babylon_light_mode"]
            | null
          babylonjs__light_radius?: number | null
          babylonjs__light_range?: number | null
          babylonjs__light_specular?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__light_type?: string | null
          babylonjs__lod_auto?: boolean | null
          babylonjs__lod_distance?: number | null
          babylonjs__lod_hide?: number | null
          babylonjs__lod_level?:
            | Database["public"]["Enums"]["babylon_lod_level"]
            | null
          babylonjs__lod_mode?:
            | Database["public"]["Enums"]["babylon_lod_mode"]
            | null
          babylonjs__lod_size?: number | null
          babylonjs__material_alpha?: number | null
          babylonjs__material_ambient?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_ambient_texture?: string | null
          babylonjs__material_ambient_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_ambient_texture_impact_on_analytical_lights?:
            | number
            | null
          babylonjs__material_ambient_texture_strength?: number | null
          babylonjs__material_backfaceculling?: boolean | null
          babylonjs__material_bump_texture?: string | null
          babylonjs__material_bump_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_custom_properties?: Json | null
          babylonjs__material_diffuse?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_diffuse_texture?: string | null
          babylonjs__material_diffuse_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_direct_intensity?: number | null
          babylonjs__material_emissive?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_emissive_texture?: string | null
          babylonjs__material_emissive_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_enable_irradiance_map?: boolean | null
          babylonjs__material_enable_specular_anti_aliasing?: boolean | null
          babylonjs__material_environment_intensity?: number | null
          babylonjs__material_environment_texture?: string | null
          babylonjs__material_environment_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_force_normal_forward?: boolean | null
          babylonjs__material_index_of_refraction?: number | null
          babylonjs__material_lightmap_texture?: string | null
          babylonjs__material_lightmap_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_max_simultaneous_lights?: number | null
          babylonjs__material_metallic?: number | null
          babylonjs__material_metallic_f0_factor?: number | null
          babylonjs__material_metallic_reflectance_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_metallic_texture?: string | null
          babylonjs__material_metallic_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_microsurface?: number | null
          babylonjs__material_microsurface_texture?: string | null
          babylonjs__material_microsurface_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_opacity_texture?: string | null
          babylonjs__material_opacity_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflection_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflection_texture?: string | null
          babylonjs__material_reflection_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_reflectivity_color?:
            | Database["public"]["CompositeTypes"]["color4"]
            | null
          babylonjs__material_reflectivity_texture?: string | null
          babylonjs__material_reflectivity_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
            | null
          babylonjs__material_refraction_texture?: string | null
          babylonjs__material_refraction_texture_color_space?:
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
            | Database["public"]["Enums"]["babylon_texture_color_space"]
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
          babylonjs__physics_collision_filter_group?: number | null
          babylonjs__physics_collision_filter_mask?: number | null
          babylonjs__physics_friction?: number | null
          babylonjs__physics_linear_damping?: number | null
          babylonjs__physics_linear_velocity?:
            | Database["public"]["CompositeTypes"]["vector3"]
            | null
          babylonjs__physics_mass?: number | null
          babylonjs__physics_motion_type?: string | null
          babylonjs__physics_restitution?: number | null
          babylonjs__physics_shape_data?: Json | null
          babylonjs__physics_shape_type?: string | null
          babylonjs__shadow_bias?: number | null
          babylonjs__shadow_blur_kernel?: number | null
          babylonjs__shadow_darkness?: number | null
          babylonjs__shadow_enabled?: boolean | null
          babylonjs__shadow_frustum_size?: number | null
          babylonjs__shadow_map_size?: number | null
          babylonjs__shadow_quality?: string | null
          general__created_at?: string | null
          general__name?: string
          general__parent_entity_id?: string | null
          general__semantic_version?: string
          general__transform?: Database["public"]["CompositeTypes"]["transform"]
          general__type?: string
          general__updated_at?: string | null
          general__uuid?: string
          permissions__groups__execute?: string[] | null
          permissions__groups__read?: string[] | null
          permissions__groups__write?: string[] | null
          zone__properties?: Json | null
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
          createdat: string | null
          entity_id: string
          key: string
          metadata_id: string
          permissions__groups__execute: string[] | null
          permissions__groups__read: string[] | null
          permissions__groups__write: string[] | null
          updatedat: string | null
          values_boolean: boolean[] | null
          values_numeric: number[] | null
          values_text: string[] | null
          values_timestamp: string[] | null
        }
        Insert: {
          createdat?: string | null
          entity_id: string
          key: string
          metadata_id?: string
          permissions__groups__execute?: string[] | null
          permissions__groups__read?: string[] | null
          permissions__groups__write?: string[] | null
          updatedat?: string | null
          values_boolean?: boolean[] | null
          values_numeric?: number[] | null
          values_text?: string[] | null
          values_timestamp?: string[] | null
        }
        Update: {
          createdat?: string | null
          entity_id?: string
          key?: string
          metadata_id?: string
          permissions__groups__execute?: string[] | null
          permissions__groups__read?: string[] | null
          permissions__groups__write?: string[] | null
          updatedat?: string | null
          values_boolean?: boolean[] | null
          values_numeric?: number[] | null
          values_text?: string[] | null
          values_timestamp?: string[] | null
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
          git_repo_entry_path: string | null
          git_repo_url: string | null
          is_persistent: boolean
          permissions__groups__mutations: string[] | null
          permissions_world_connection: boolean
          script_id: string
          updated_at: string | null
          web__compiled__browser__script: string | null
          web__compiled__browser__script_sha256: string | null
          web__compiled__browser__script_status:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__bun__script: string | null
          web__compiled__bun__script_sha256: string | null
          web__compiled__bun__script_status:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__node__script: string | null
          web__compiled__node__script_sha256: string | null
          web__compiled__node__script_status:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          is_persistent?: boolean
          permissions__groups__mutations?: string[] | null
          permissions_world_connection?: boolean
          script_id?: string
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          git_repo_entry_path?: string | null
          git_repo_url?: string | null
          is_persistent?: boolean
          permissions__groups__mutations?: string[] | null
          permissions_world_connection?: boolean
          script_id?: string
          updated_at?: string | null
          web__compiled__browser__script?: string | null
          web__compiled__browser__script_sha256?: string | null
          web__compiled__browser__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__bun__script?: string | null
          web__compiled__bun__script_sha256?: string | null
          web__compiled__bun__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
          web__compiled__node__script?: string | null
          web__compiled__node__script_sha256?: string | null
          web__compiled__node__script_status?:
            | Database["public"]["Enums"]["script_compilation_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_entity_scripts_entity"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      mutations: {
        Row: {
          agent_id: string
          allowed_groups: string[] | null
          created_at: string | null
          entity_id: string
          expires_at: string | null
          mutation_data: Json | null
          mutation_id: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          simulate_optimistically: boolean | null
          status: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Insert: {
          agent_id: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Update: {
          agent_id?: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id?: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category?: Database["public"]["Enums"]["update_category"]
        }
        Relationships: [
          {
            foreignKeyName: "mutations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["general__uuid"]
          },
        ]
      }
      pending_mutations: {
        Row: {
          agent_id: string
          allowed_groups: string[] | null
          created_at: string | null
          entity_id: string
          expires_at: string | null
          mutation_data: Json | null
          mutation_id: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          next_retry_at: string | null
          priority: number | null
          retry_count: number | null
          simulate_optimistically: boolean | null
          status: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Insert: {
          agent_id: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          next_retry_at?: string | null
          priority?: number | null
          retry_count?: number | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Update: {
          agent_id?: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id?: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          next_retry_at?: string | null
          priority?: number | null
          retry_count?: number | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category?: Database["public"]["Enums"]["update_category"]
        }
        Relationships: []
      }
      persistent_mutations: {
        Row: {
          agent_id: string
          allowed_groups: string[] | null
          created_at: string | null
          entity_id: string
          execution_count: number | null
          expires_at: string | null
          interval_seconds: number | null
          last_executed_at: string | null
          max_executions: number | null
          mutation_data: Json | null
          mutation_id: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          next_execution_at: string | null
          simulate_optimistically: boolean | null
          status: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Insert: {
          agent_id: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id: string
          execution_count?: number | null
          expires_at?: string | null
          interval_seconds?: number | null
          last_executed_at?: string | null
          max_executions?: number | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          next_execution_at?: string | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Update: {
          agent_id?: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id?: string
          execution_count?: number | null
          expires_at?: string | null
          interval_seconds?: number | null
          last_executed_at?: string | null
          max_executions?: number | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          next_execution_at?: string | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category?: Database["public"]["Enums"]["update_category"]
        }
        Relationships: []
      }
      rejected_mutations: {
        Row: {
          agent_id: string
          allowed_groups: string[] | null
          created_at: string | null
          entity_id: string
          expires_at: string | null
          mutation_data: Json | null
          mutation_id: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          rejected_at: string | null
          rejection_reason: string | null
          simulate_optimistically: boolean | null
          status: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Insert: {
          agent_id: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type: Database["public"]["Enums"]["mutation_type"]
          rejected_at?: string | null
          rejection_reason?: string | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category: Database["public"]["Enums"]["update_category"]
        }
        Update: {
          agent_id?: string
          allowed_groups?: string[] | null
          created_at?: string | null
          entity_id?: string
          expires_at?: string | null
          mutation_data?: Json | null
          mutation_id?: string
          mutation_type?: Database["public"]["Enums"]["mutation_type"]
          rejected_at?: string | null
          rejection_reason?: string | null
          simulate_optimistically?: boolean | null
          status?: Database["public"]["Enums"]["mutation_status"]
          update_category?: Database["public"]["Enums"]["update_category"]
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          role_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          role_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          role_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_execute: {
        Args: {
          entity_id: string
        }
        Returns: boolean
      }
      can_execute_metadata: {
        Args: {
          metadata_id: string
        }
        Returns: boolean
      }
      can_read: {
        Args: {
          entity_id: string
        }
        Returns: boolean
      }
      can_read_metadata: {
        Args: {
          metadata_id: string
        }
        Returns: boolean
      }
      can_write: {
        Args: {
          entity_id: string
        }
        Returns: boolean
      }
      can_write_metadata: {
        Args: {
          metadata_id: string
        }
        Returns: boolean
      }
      cleanup_expired_mutations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          p_role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      babylon_billboard_mode:
        | "BILLBOARDMODE_NONE"
        | "BILLBOARDMODE_X"
        | "BILLBOARDMODE_Y"
        | "BILLBOARDMODE_Z"
        | "BILLBOARDMODE_ALL"
      babylon_light_mode: "default" | "shadowsOnly" | "specular"
      babylon_lod_level: "LOD0" | "LOD1" | "LOD2" | "LOD3" | "LOD4"
      babylon_lod_mode: "distance" | "size"
      babylon_texture_color_space: "linear" | "sRGB" | "gamma"
      mutation_status: "PENDING" | "PROCESSED" | "REJECTED" | "PERSISTENT"
      mutation_type: "INSERT" | "UPDATE" | "DELETE"
      script_compilation_status: "PENDING" | "COMPILED" | "FAILED"
      update_category: "FORCE" | "PROPERTY"
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

