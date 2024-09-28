-- This migration adds application-specific structures and extras to the base glTF schema

-- Add user role enum and column
CREATE TYPE user_role AS ENUM ('guest', 'member', 'admin');

ALTER TABLE public.user_profiles
ADD COLUMN role user_role NOT NULL DEFAULT 'guest';

-- Define JSON schemas for extras

-- Common extras schema (for most tables)
CREATE OR REPLACE FUNCTION common_extras_schema() RETURNS json AS $$
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
  }'::json;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- World glTF extras schema (includes mutations)
CREATE OR REPLACE FUNCTION world_gltf_extras_schema() RETURNS json AS $$
DECLARE
  base_schema json;
  world_specific json;
BEGIN
  base_schema := (SELECT common_extras_schema());
  world_specific := json_build_object(
    'type', 'object',
    'properties', json_build_object(
      'vircadia', json_build_object(
        'type', 'object',
        'properties', json_build_object(
          'babylonjs', json_build_object(
            'type', 'object',
            'properties', json_build_object(
              'mutations', json_build_object(
                'type', 'array',
                'items', json_build_object(
                  'type', 'object',
                  'properties', json_build_object(
                    'type', json_build_object('type', 'string', 'enum', array['add', 'update', 'delete']),
                    'script', json_build_object('type', 'string'),
                    'unitTest', json_build_object('type', 'string')
                  ),
                  'required', array['type', 'script', 'unitTest']
                )
              )
            )
          )
        )
      )
    )
  );
  RETURN json_build_object(
    'allOf', json_build_array(base_schema, world_specific)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Scene extras schema
CREATE OR REPLACE FUNCTION scene_extras_schema() RETURNS json AS $$
DECLARE
  base_schema json;
  scene_specific json;
BEGIN
  base_schema := (SELECT common_extras_schema());
  scene_specific := json_build_object(
    'type', 'object',
    'properties', json_build_object(
      'vircadia', json_build_object(
        'type', 'object',
        'properties', json_build_object(
          'babylonjs', json_build_object(
            'type', 'object',
            'properties', json_build_object(
              'clearColor', json_build_object(
                'type', 'object',
                'properties', json_build_object(
                  'r', json_build_object('type', 'number'),
                  'g', json_build_object('type', 'number'),
                  'b', json_build_object('type', 'number')
                ),
                'required', array['r', 'g', 'b']
              ),
              'ambientColor', json_build_object(
                'type', 'object',
                'properties', json_build_object(
                  'r', json_build_object('type', 'number'),
                  'g', json_build_object('type', 'number'),
                  'b', json_build_object('type', 'number')
                ),
                'required', array['r', 'g', 'b']
              ),
              'gravity', json_build_object(
                'type', 'object',
                'properties', json_build_object(
                  'x', json_build_object('type', 'number'),
                  'y', json_build_object('type', 'number'),
                  'z', json_build_object('type', 'number')
                ),
                'required', array['x', 'y', 'z']
              ),
              'activeCamera', json_build_object('type', 'string'),
              'collisionsEnabled', json_build_object('type', 'boolean'),
              'physicsEnabled', json_build_object('type', 'boolean'),
              'physicsGravity', json_build_object(
                'type', 'object',
                'properties', json_build_object(
                  'x', json_build_object('type', 'number'),
                  'y', json_build_object('type', 'number'),
                  'z', json_build_object('type', 'number')
                ),
                'required', array['x', 'y', 'z']
              ),
              'physicsEngine', json_build_object('type', 'string'),
              'autoAnimate', json_build_object('type', 'boolean'),
              'autoAnimateFrom', json_build_object('type', 'number'),
              'autoAnimateTo', json_build_object('type', 'number'),
              'autoAnimateLoop', json_build_object('type', 'boolean'),
              'autoAnimateSpeed', json_build_object('type', 'number')
            )
          )
        )
      )
    )
  );
  RETURN json_build_object(
    'allOf', json_build_array(base_schema, scene_specific)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply JSON schemas to the respective tables
ALTER TABLE world_gltf
ADD CONSTRAINT world_gltf_extras_valid
CHECK (extensions.jsonb_matches_schema(world_gltf_extras_schema(), extras));

ALTER TABLE scenes
ADD CONSTRAINT scenes_extras_valid
CHECK (extensions.jsonb_matches_schema(scene_extras_schema(), extras));

ALTER TABLE nodes
ADD CONSTRAINT nodes_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE meshes
ADD CONSTRAINT meshes_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE materials
ADD CONSTRAINT materials_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE textures
ADD CONSTRAINT textures_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE images
ADD CONSTRAINT images_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE samplers
ADD CONSTRAINT samplers_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE animations
ADD CONSTRAINT animations_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE skins
ADD CONSTRAINT skins_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE cameras
ADD CONSTRAINT cameras_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE buffers
ADD CONSTRAINT buffers_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE buffer_views
ADD CONSTRAINT buffer_views_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));

ALTER TABLE accessors
ADD CONSTRAINT accessors_extras_valid
CHECK (extensions.jsonb_matches_schema(common_extras_schema(), extras));
