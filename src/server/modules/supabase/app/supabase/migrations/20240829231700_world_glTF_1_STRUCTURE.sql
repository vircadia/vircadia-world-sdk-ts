-- This migration adds application-specific structures and extras to the base glTF schema

-- Enable pg_jsonschema extension for JSON schema validation
CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- Add user role enum and column
CREATE TYPE user_role AS ENUM ('guest', 'member', 'admin');

ALTER TABLE public.user_profiles
ADD COLUMN role user_role NOT NULL DEFAULT 'guest',

-- Define JSON schemas for extras

-- Common extras schema (for most tables)
CREATE OR REPLACE FUNCTION common_extras_schema() RETURNS jsonb AS $$
BEGIN
  RETURN '{
    "type": "object",
    "properties": {
      "vircadia": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "uuid": { "type": "string" },
          "version": { "type": "string" },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" },
          "babylonjs": {
            "type": "object",
            "properties": {
              "lod": {
                "type": "object",
                "properties": {
                  "mode": { "type": ["string", "null"], "enum": ["distance", "size", null] },
                  "auto": { "type": ["boolean", "null"] },
                  "distance": { "type": ["number", "null"] },
                  "size": { "type": ["number", "null"] },
                  "hide": { "type": ["number", "null"] }
                }
              },
              "billboard": {
                "type": "object",
                "properties": {
                  "mode": { "type": ["integer", "null"], "enum": [0, 1, 2, 4, 7, null] }
                }
              },
              "lightmap": {
                "type": "object",
                "properties": {
                  "lightmap": { "type": ["string", "null"] },
                  "level": { "type": ["integer", "null"] },
                  "color_space": { "type": ["string", "null"], "enum": ["linear", "sRGB", "gamma", null] },
                  "texcoord": { "type": ["integer", "null"] },
                  "use_as_shadowmap": { "type": ["boolean", "null"] },
                  "mode": { "type": ["string", "null"], "enum": ["default", "shadowsOnly", "specular", null] }
                }
              },
              "script": {
                "type": "object",
                "properties": {
                  "agent_scripts": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "script": { "type": "string" },
                        "unitTest": { "type": "string" }
                      },
                      "required": ["script", "unitTest"]
                    }
                  },
                  "persistent_scripts": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "runnerAgentId": { "type": "string" },
                        "script": { "type": "string" },
                        "unitTest": { "type": "string" }
                      },
                      "required": ["runnerAgentId", "script", "unitTest"]
                    }
                  }
                }
              }
            }
          }
        },
        "required": ["name", "uuid", "version", "createdAt", "updatedAt", "babylonjs"]
      }
    },
    "required": ["vircadia"]
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- World glTF extras schema (includes mutations)
CREATE OR REPLACE FUNCTION world_gltf_extras_schema() RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'vircadia', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'name', jsonb_build_object('type', 'string'),
          'uuid', jsonb_build_object('type', 'string'),
          'version', jsonb_build_object('type', 'string'),
          'createdAt', jsonb_build_object('type', 'string', 'format', 'date-time'),
          'updatedAt', jsonb_build_object('type', 'string', 'format', 'date-time'),
          'babylonjs', jsonb_build_object(
            'type', 'object',
            'properties', jsonb_build_object(
                -- TODO: We may not need mutations.
              'mutations', jsonb_build_object(
                'type', 'array',
                'items', jsonb_build_object(
                  'type', 'object',
                  'properties', jsonb_build_object(
                    'type', jsonb_build_object('type', 'string', 'enum', array['add', 'update', 'delete']),
                    'script', jsonb_build_object('type', 'string'),
                    'unitTest', jsonb_build_object('type', 'string')
                  ),
                  'required', array['type', 'script', 'unitTest']
                )
              )
            )
          )
        ),
        'required', array['name', 'uuid', 'version', 'createdAt', 'updatedAt', 'babylonjs']
      )
    ),
    'required', array['vircadia']
  ) || (SELECT common_extras_schema());
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Scene extras schema
CREATE OR REPLACE FUNCTION scene_extras_schema() RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'vircadia', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'babylonjs', jsonb_build_object(
            'type', 'object',
            'properties', jsonb_build_object(
              'clearColor', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'r', jsonb_build_object('type', 'number'),
                  'g', jsonb_build_object('type', 'number'),
                  'b', jsonb_build_object('type', 'number')
                ),
                'required', array['r', 'g', 'b']
              ),
              'ambientColor', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'r', jsonb_build_object('type', 'number'),
                  'g', jsonb_build_object('type', 'number'),
                  'b', jsonb_build_object('type', 'number')
                ),
                'required', array['r', 'g', 'b']
              ),
              'gravity', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'x', jsonb_build_object('type', 'number'),
                  'y', jsonb_build_object('type', 'number'),
                  'z', jsonb_build_object('type', 'number')
                ),
                'required', array['x', 'y', 'z']
              ),
              'activeCamera', jsonb_build_object('type', 'string'),
              'collisionsEnabled', jsonb_build_object('type', 'boolean'),
              'physicsEnabled', jsonb_build_object('type', 'boolean'),
              'physicsGravity', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'x', jsonb_build_object('type', 'number'),
                  'y', jsonb_build_object('type', 'number'),
                  'z', jsonb_build_object('type', 'number')
                ),
                'required', array['x', 'y', 'z']
              ),
              'physicsEngine', jsonb_build_object('type', 'string'),
              'autoAnimate', jsonb_build_object('type', 'boolean'),
              'autoAnimateFrom', jsonb_build_object('type', 'number'),
              'autoAnimateTo', jsonb_build_object('type', 'number'),
              'autoAnimateLoop', jsonb_build_object('type', 'boolean'),
              'autoAnimateSpeed', jsonb_build_object('type', 'number')
            )
          )
        )
      )
    )
  ) || (SELECT common_extras_schema());
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply JSON schemas to the respective tables
ALTER TABLE world_gltf
ADD CONSTRAINT world_gltf_extras_valid
CHECK (validate_json_schema(world_gltf_extras_schema(), extras));

ALTER TABLE scenes
ADD CONSTRAINT scenes_extras_valid
CHECK (validate_json_schema(scene_extras_schema(), extras));

ALTER TABLE nodes
ADD CONSTRAINT nodes_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE meshes
ADD CONSTRAINT meshes_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE materials
ADD CONSTRAINT materials_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE textures
ADD CONSTRAINT textures_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE images
ADD CONSTRAINT images_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE samplers
ADD CONSTRAINT samplers_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE animations
ADD CONSTRAINT animations_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE skins
ADD CONSTRAINT skins_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE cameras
ADD CONSTRAINT cameras_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE buffers
ADD CONSTRAINT buffers_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE buffer_views
ADD CONSTRAINT buffer_views_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));

ALTER TABLE accessors
ADD CONSTRAINT accessors_extras_valid
CHECK (validate_json_schema(common_extras_schema(), extras));
