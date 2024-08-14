-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for object types
CREATE TYPE object_type AS ENUM (
  'camera',
  'light',
  'mesh',
  'transformNode',
  'material',
  'multiMaterial',
  'texture',
  'particleSystem',
  'shadowGenerator',
  'skeleton',
  'animation',
  'animationGroup',
  'sound',
  'reflectionProbe',
);

-- Create world_metadata table (representing the scene)
CREATE TABLE world_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  author VARCHAR(255),
  auto_clear BOOLEAN,
  clear_color JSONB,
  ambient_color JSONB,
  gravity JSONB,
  active_camera UUID,
  collisions_enabled BOOLEAN,
  physics_enabled BOOLEAN,
  physics_gravity JSONB,
  physics_engine VARCHAR(50),
  auto_animate BOOLEAN,
  auto_animate_from INTEGER,
  auto_animate_to INTEGER,
  auto_animate_loop BOOLEAN,
  auto_animate_speed NUMERIC,
  scene_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cameras table
CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lights table
CREATE TABLE lights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create meshes table
CREATE TABLE meshes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  material_id UUID,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create transform_nodes table
CREATE TABLE transform_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create materials table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create multi_materials table
CREATE TABLE multi_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create textures table
CREATE TABLE textures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  material_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create particle_systems table
CREATE TABLE particle_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  emitter_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create shadow_generators table
CREATE TABLE shadow_generators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  light_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create skeletons table
CREATE TABLE skeletons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create animations table
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  target_id UUID,
  target_type object_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create animation_groups table
CREATE TABLE animation_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sounds table
CREATE TABLE sounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reflection_probes table
CREATE TABLE reflection_probes (
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
CREATE TRIGGER update_world_metadata_modtime BEFORE UPDATE
  ON world_metadata FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cameras_modtime BEFORE UPDATE
  ON cameras FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_lights_modtime BEFORE UPDATE
  ON lights FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_meshes_modtime BEFORE UPDATE
  ON meshes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_transform_nodes_modtime BEFORE UPDATE
  ON transform_nodes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_materials_modtime BEFORE UPDATE
  ON materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_multi_materials_modtime BEFORE UPDATE
  ON multi_materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_textures_modtime BEFORE UPDATE
  ON textures FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_particle_systems_modtime BEFORE UPDATE
  ON particle_systems FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_shadow_generators_modtime BEFORE UPDATE
  ON shadow_generators FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_skeletons_modtime BEFORE UPDATE
  ON skeletons FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_animations_modtime BEFORE UPDATE
  ON animations FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_animation_groups_modtime BEFORE UPDATE
  ON animation_groups FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sounds_modtime BEFORE UPDATE
  ON sounds FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_reflection_probes_modtime BEFORE UPDATE
  ON reflection_probes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE world_metadata;
ALTER PUBLICATION supabase_realtime ADD TABLE cameras;
ALTER PUBLICATION supabase_realtime ADD TABLE lights;
ALTER PUBLICATION supabase_realtime ADD TABLE meshes;
ALTER PUBLICATION supabase_realtime ADD TABLE transform_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE materials;
ALTER PUBLICATION supabase_realtime ADD TABLE multi_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE textures;
ALTER PUBLICATION supabase_realtime ADD TABLE particle_systems;
ALTER PUBLICATION supabase_realtime ADD TABLE shadow_generators;
ALTER PUBLICATION supabase_realtime ADD TABLE skeletons;
ALTER PUBLICATION supabase_realtime ADD TABLE animations;
ALTER PUBLICATION supabase_realtime ADD TABLE animation_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE sounds;
ALTER PUBLICATION supabase_realtime ADD TABLE reflection_probes;

-- Add foreign key constraints
ALTER TABLE world_metadata
ADD CONSTRAINT fk_active_camera FOREIGN KEY (active_camera) REFERENCES cameras(id);

ALTER TABLE meshes
ADD CONSTRAINT fk_mesh_material FOREIGN KEY (material_id) REFERENCES materials(id),
ADD CONSTRAINT fk_mesh_parent FOREIGN KEY (parent_id) REFERENCES transform_nodes(id);

ALTER TABLE transform_nodes
ADD CONSTRAINT fk_transform_node_parent FOREIGN KEY (parent_id) REFERENCES transform_nodes(id);

ALTER TABLE textures
ADD CONSTRAINT fk_texture_material FOREIGN KEY (material_id) REFERENCES materials(id);

ALTER TABLE particle_systems
ADD CONSTRAINT fk_particle_system_emitter FOREIGN KEY (emitter_id) REFERENCES meshes(id);

ALTER TABLE shadow_generators
ADD CONSTRAINT fk_shadow_generator_light FOREIGN KEY (light_id) REFERENCES lights(id);

-- Add indexes for better query performance
CREATE INDEX idx_meshes_material_id ON meshes(material_id);
CREATE INDEX idx_meshes_parent_id ON meshes(parent_id);
CREATE INDEX idx_transform_nodes_parent_id ON transform_nodes(parent_id);
CREATE INDEX idx_textures_material_id ON textures(material_id);
CREATE INDEX idx_particle_systems_emitter_id ON particle_systems(emitter_id);
CREATE INDEX idx_shadow_generators_light_id ON shadow_generators(light_id);
CREATE INDEX idx_animations_target_id ON animations(target_id);
CREATE INDEX idx_animations_target_type ON animations(target_type);
