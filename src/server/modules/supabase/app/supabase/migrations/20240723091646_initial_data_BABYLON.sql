-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for object types
CREATE TYPE object_type AS ENUM (
  'scene',
  'camera',
  'light',
  'geometry',
  'material',
  'multiMaterial',
  'particleSystem',
  'lensFlareSystems',
  'shadowGenerator',
  'skeleton',
  'morphTargetManager',
  'mesh',
  'transformNode',
  'sound',
  'attachedSound',
  'actionManager',
  'layer',
  'texture',
  'reflectionProbe',
  'animation',
  'animationGroup',
  'environmentTexture',
  'effectLayer',
  'proceduralTexture',
  'sprite',
  'spriteManager'
);

-- Create metadata table for world/scene
CREATE TABLE world_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  author VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create base table for all objects
CREATE TABLE babylon_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type object_type NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create individual tables for each object type
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE geometries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE multi_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE particle_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lens_flare_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shadow_generators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skeletons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE morph_target_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meshes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transform_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attached_sounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE action_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE textures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reflection_probes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animation_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environment_textures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE effect_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE procedural_textures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sprites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sprite_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables
CREATE TRIGGER update_world_metadata_modtime BEFORE
UPDATE
  ON world_metadata FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_babylon_objects_modtime BEFORE
UPDATE
  ON babylon_objects FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_scenes_modtime BEFORE
UPDATE
  ON scenes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cameras_modtime BEFORE
UPDATE
  ON cameras FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_lights_modtime BEFORE
UPDATE
  ON lights FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_geometries_modtime BEFORE
UPDATE
  ON geometries FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_materials_modtime BEFORE
UPDATE
  ON materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_multi_materials_modtime BEFORE
UPDATE
  ON multi_materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_particle_systems_modtime BEFORE
UPDATE
  ON particle_systems FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_lens_flare_systems_modtime BEFORE
UPDATE
  ON lens_flare_systems FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_shadow_generators_modtime BEFORE
UPDATE
  ON shadow_generators FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_skeletons_modtime BEFORE
UPDATE
  ON skeletons FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_morph_target_managers_modtime BEFORE
UPDATE
  ON morph_target_managers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_meshes_modtime BEFORE
UPDATE
  ON meshes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_transform_nodes_modtime BEFORE
UPDATE
  ON transform_nodes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sounds_modtime BEFORE
UPDATE
  ON sounds FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_attached_sounds_modtime BEFORE
UPDATE
  ON attached_sounds FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_action_managers_modtime BEFORE
UPDATE
  ON action_managers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_layers_modtime BEFORE
UPDATE
  ON layers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_textures_modtime BEFORE
UPDATE
  ON textures FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_reflection_probes_modtime BEFORE
UPDATE
  ON reflection_probes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_animations_modtime BEFORE
UPDATE
  ON animations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_animation_groups_modtime BEFORE
UPDATE
  ON animation_groups FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_environment_textures_modtime BEFORE
UPDATE
  ON environment_textures FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_effect_layers_modtime BEFORE
UPDATE
  ON effect_layers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_procedural_textures_modtime BEFORE
UPDATE
  ON procedural_textures FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sprites_modtime BEFORE
UPDATE
  ON sprites FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sprite_managers_modtime BEFORE
UPDATE
  ON sprite_managers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE world_metadata;
ALTER PUBLICATION supabase_realtime ADD TABLE babylon_objects;
ALTER PUBLICATION supabase_realtime ADD TABLE scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE cameras;
ALTER PUBLICATION supabase_realtime ADD TABLE lights;
ALTER PUBLICATION supabase_realtime ADD TABLE geometries;
ALTER PUBLICATION supabase_realtime ADD TABLE materials;
ALTER PUBLICATION supabase_realtime ADD TABLE multi_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE particle_systems;
ALTER PUBLICATION supabase_realtime ADD TABLE lens_flare_systems;
ALTER PUBLICATION supabase_realtime ADD TABLE shadow_generators;
ALTER PUBLICATION supabase_realtime ADD TABLE skeletons;
ALTER PUBLICATION supabase_realtime ADD TABLE morph_target_managers;
ALTER PUBLICATION supabase_realtime ADD TABLE meshes;
ALTER PUBLICATION supabase_realtime ADD TABLE transform_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE sounds;
ALTER PUBLICATION supabase_realtime ADD TABLE attached_sounds;
ALTER PUBLICATION supabase_realtime ADD TABLE action_managers;
ALTER PUBLICATION supabase_realtime ADD TABLE layers;
ALTER PUBLICATION supabase_realtime ADD TABLE textures;
ALTER PUBLICATION supabase_realtime ADD TABLE reflection_probes;
ALTER PUBLICATION supabase_realtime ADD TABLE animations;
ALTER PUBLICATION supabase_realtime ADD TABLE animation_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE environment_textures;
ALTER PUBLICATION supabase_realtime ADD TABLE effect_layers;
ALTER PUBLICATION supabase_realtime ADD TABLE procedural_textures;
ALTER PUBLICATION supabase_realtime ADD TABLE sprites;
ALTER PUBLICATION supabase_realtime ADD TABLE sprite_managers;