-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the worlds_gltf table
CREATE TABLE worlds_gltf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- metadata is the glTF metadata
    metadata JSONB NOT NULL,
    -- default_scene is the "scene" that is loaded when the world is loaded
    default_scene UUID,
    extensions JSONB,
    extras JSONB
);

-- Create the scenes table
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    nodes JSONB,
    extensions JSONB,
    extras JSONB
);

-- Create the nodes table
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    camera UUID,
    children JSONB,
    skin UUID,
    matrix NUMERIC[16],
    mesh UUID,
    rotation NUMERIC[4],
    scale NUMERIC[3],
    translation NUMERIC[3],
    weights JSONB,
    extensions JSONB,
    extras JSONB
);

-- Create the meshes table
CREATE TABLE meshes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    primitives JSONB NOT NULL,
    weights JSONB,
    extensions JSONB,
    extras JSONB
);

-- Create the materials table
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    pbr_metallic_roughness JSONB,
    normal_texture JSONB,
    occlusion_texture JSONB,
    emissive_texture JSONB,
    emissive_factor NUMERIC[3],
    alpha_mode TEXT,
    alpha_cutoff NUMERIC,
    double_sided BOOLEAN,
    extensions JSONB,
    extras JSONB
);

-- Create the textures table
CREATE TABLE textures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    sampler UUID,
    source UUID,
    extensions JSONB,
    extras JSONB
);

-- Create the images table
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    uri TEXT,
    mime_type TEXT,
    buffer_view UUID,
    extensions JSONB,
    extras JSONB
);

-- Create the samplers table
CREATE TABLE samplers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    mag_filter INTEGER,
    min_filter INTEGER,
    wrap_s INTEGER,
    wrap_t INTEGER,
    extensions JSONB,
    extras JSONB
);

-- Create the animations table
CREATE TABLE animations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    channels JSONB NOT NULL,
    samplers JSONB NOT NULL,
    extensions JSONB,
    extras JSONB
);

-- Create the skins table
CREATE TABLE skins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    inverse_bind_matrices UUID,
    skeleton UUID,
    joints JSONB NOT NULL,
    extensions JSONB,
    extras JSONB
);

-- Create the cameras table
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL,
    orthographic JSONB,
    perspective JSONB,
    extensions JSONB,
    extras JSONB
);

-- Create the buffers table
CREATE TABLE buffers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    uri TEXT,
    byte_length INTEGER NOT NULL,
    extensions JSONB,
    extras JSONB
);

-- Create the buffer_views table
CREATE TABLE buffer_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    buffer UUID NOT NULL,
    byte_offset INTEGER,
    byte_length INTEGER NOT NULL,
    byte_stride INTEGER,
    target INTEGER,
    extensions JSONB,
    extras JSONB
);

-- Create the accessors table
CREATE TABLE accessors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gltf_asset_id UUID NOT NULL REFERENCES worlds_gltf(id) ON DELETE CASCADE,
    name TEXT,
    buffer_view UUID,
    byte_offset INTEGER,
    component_type INTEGER NOT NULL,
    normalized BOOLEAN,
    count INTEGER NOT NULL,
    type TEXT NOT NULL,
    max JSONB,
    min JSONB,
    sparse JSONB,
    extensions JSONB,
    extras JSONB
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
CREATE TRIGGER update_worlds_gltf_modtime
BEFORE UPDATE ON worlds_gltf
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime
ADD TABLE worlds_gltf, scenes, nodes, meshes, materials, textures,
          images, samplers, animations, skins, cameras, buffers,
          buffer_views, accessors;

-- Add indexes for better query performance
CREATE INDEX idx_worlds_gltf_name ON worlds_gltf(name);
CREATE INDEX idx_scenes_gltf_asset_id ON scenes(gltf_asset_id);
CREATE INDEX idx_nodes_gltf_asset_id ON nodes(gltf_asset_id);
CREATE INDEX idx_meshes_gltf_asset_id ON meshes(gltf_asset_id);
CREATE INDEX idx_materials_gltf_asset_id ON materials(gltf_asset_id);
CREATE INDEX idx_textures_gltf_asset_id ON textures(gltf_asset_id);
CREATE INDEX idx_images_gltf_asset_id ON images(gltf_asset_id);
CREATE INDEX idx_samplers_gltf_asset_id ON samplers(gltf_asset_id);
CREATE INDEX idx_animations_gltf_asset_id ON animations(gltf_asset_id);
CREATE INDEX idx_skins_gltf_asset_id ON skins(gltf_asset_id);
CREATE INDEX idx_cameras_gltf_asset_id ON cameras(gltf_asset_id);
CREATE INDEX idx_buffers_gltf_asset_id ON buffers(gltf_asset_id);
CREATE INDEX idx_buffer_views_gltf_asset_id ON buffer_views(gltf_asset_id);
CREATE INDEX idx_accessors_gltf_asset_id ON accessors(gltf_asset_id);

-- Add GIN indexes for JSONB columns to improve query performance on these fields
CREATE INDEX idx_worlds_gltf_extensions ON worlds_gltf USING GIN (extensions);
CREATE INDEX idx_scenes_nodes ON scenes USING GIN (nodes);
CREATE INDEX idx_meshes_primitives ON meshes USING GIN (primitives);
CREATE INDEX idx_materials_pbr_metallic_roughness ON materials USING GIN (pbr_metallic_roughness);
CREATE INDEX idx_animations_channels ON animations USING GIN (channels);
CREATE INDEX idx_animations_samplers ON animations USING GIN (samplers);
CREATE INDEX idx_skins_joints ON skins USING GIN (joints);
CREATE INDEX idx_accessors_sparse ON accessors USING GIN (sparse);
