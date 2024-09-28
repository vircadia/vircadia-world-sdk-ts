-- This migration conforms to the glTF 2.0 specification and uses custom features within extras.
-- If for some reason it falls out alignment with the ability to serialize without much conversion to glTF 2.0, then please update the migration to conform again.
-- Any fields prefixed with "vircadia_" are custom and not compliant with glTF 2.0, and may need to be removed when serializing to glTF 2.0 for unsupported editors.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pg_jsonschema extension for JSON schema validation
CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;

--
--
-- USERS
--
--

-- Create the user_profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a trigger to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', 'guest');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--
--
-- WORLD_GLTF
--
--

-- Create the world_gltf table
CREATE TABLE world_gltf (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL,
    defaultScene TEXT,
    extensionsUsed TEXT[],
    extensionsRequired TEXT[],
    extensions JSONB,
    extras JSONB,
    asset JSONB NOT NULL
);

--
--
-- SCENES
--
--

-- Create the scenes table
CREATE TABLE scenes (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    nodes JSONB,
    extensions JSONB,
    extras JSONB
);

--
--
-- NODES
--
--

-- Create the nodes table
CREATE TABLE nodes (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    camera TEXT,
    children JSONB,
    skin TEXT,
    matrix NUMERIC[16] DEFAULT ARRAY[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    mesh TEXT,
    rotation NUMERIC[4] DEFAULT ARRAY[0,0,0,1],
    scale NUMERIC[3] DEFAULT ARRAY[1,1,1],
    translation NUMERIC[3] DEFAULT ARRAY[0,0,0],
    weights JSONB,
    extensions JSONB,
    extras JSONB
);

--
--
-- MESHES
--
--

-- Create the meshes table
CREATE TABLE meshes (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    primitives JSONB NOT NULL,
    weights JSONB,
    extensions JSONB,
    extras JSONB
);

--
--
-- MATERIALS
--
--

-- Create the materials table
CREATE TABLE materials (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    pbrMetallicRoughness JSONB,
    normalTexture JSONB,
    occlusionTexture JSONB,
    emissiveTexture JSONB,
    emissiveFactor NUMERIC[3] DEFAULT ARRAY[0,0,0],
    alphaMode TEXT DEFAULT 'OPAQUE',
    alphaCutoff NUMERIC DEFAULT 0.5,
    doubleSided BOOLEAN DEFAULT false,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_alphamode CHECK (alphaMode IN ('OPAQUE', 'MASK', 'BLEND')),
    CONSTRAINT check_pbr_metallic_roughness_structure CHECK (
        pbrMetallicRoughness IS NULL OR (
            (pbrMetallicRoughness->>'baseColorFactor' IS NULL OR
             jsonb_array_length(pbrMetallicRoughness->'baseColorFactor') = 4) AND
            (pbrMetallicRoughness->>'metallicFactor' IS NULL OR
             jsonb_typeof(pbrMetallicRoughness->'metallicFactor') = 'number') AND
            (pbrMetallicRoughness->>'roughnessFactor' IS NULL OR
             jsonb_typeof(pbrMetallicRoughness->'roughnessFactor') = 'number') AND
            (pbrMetallicRoughness->>'baseColorTexture' IS NULL OR
             jsonb_typeof(pbrMetallicRoughness->'baseColorTexture') = 'object') AND
            (pbrMetallicRoughness->>'metallicRoughnessTexture' IS NULL OR
             jsonb_typeof(pbrMetallicRoughness->'metallicRoughnessTexture') = 'object')
        )
    )
);

--
--
-- TEXTURES
--
--

-- Create the textures table
CREATE TABLE textures (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    sampler TEXT,
    source TEXT,
    extensions JSONB,
    extras JSONB
);

--
--
-- IMAGES
--
--

-- Create the images table
CREATE TABLE images (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    uri TEXT,
    mimeType TEXT,
    bufferView TEXT,
    extensions JSONB,
    extras JSONB
);

--
--
-- SAMPLERS
--
--

-- Create the samplers table
CREATE TABLE samplers (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    magFilter TEXT,
    minFilter TEXT,
    wrapS TEXT,
    wrapT TEXT,
    extensions JSONB,
    extras JSONB
);

--
--
-- BUFFERS
--
--

-- Create the buffers table
CREATE TABLE buffers (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    uri TEXT,
    byteLength INTEGER NOT NULL,
    extensions JSONB,
    extras JSONB
);

--
--
-- BUFFER VIEWS
--
--

-- Create the buffer_views table
CREATE TABLE buffer_views (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    buffer TEXT NOT NULL,
    byteOffset INTEGER DEFAULT 0,
    byteLength INTEGER NOT NULL,
    byteStride INTEGER,
    target TEXT,
    name TEXT,
    extensions JSONB,
    extras JSONB
);

--
--
-- ACCESSORS
--
--

-- Create the accessors table
CREATE TABLE accessors (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    bufferView TEXT,
    byteOffset INTEGER DEFAULT 0,
    componentType INTEGER NOT NULL,
    normalized BOOLEAN DEFAULT false,
    count INTEGER NOT NULL,
    type TEXT NOT NULL,
    max JSONB,
    min JSONB,
    name TEXT,
    sparse JSONB,
    extensions JSONB,
    extras JSONB
);

--
--
-- ANIMATIONS
--
--

-- Create the animations table
CREATE TABLE animations (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    channels JSONB NOT NULL,
    samplers JSONB NOT NULL,
    extensions JSONB,
    extras JSONB
);

--
--
-- CAMERAS
--
--

-- Create the cameras table
CREATE TABLE cameras (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    type TEXT NOT NULL,
    orthographic JSONB,
    perspective JSONB,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_camera_type CHECK (type IN ('perspective', 'orthographic'))
);

--
--
-- SKINS
--
--

-- Create the skins table
CREATE TABLE skins (
    vircadia_uuid UUID UNIQUE PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    inverseBindMatrices TEXT,
    skeleton TEXT,
    joints JSONB NOT NULL,
    extensions JSONB,
    extras JSONB
);

--
--
-- GENERAL SETUP
--
--

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at column
CREATE TRIGGER update_user_profiles_modtime
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_world_gltf_modtime
BEFORE UPDATE ON world_gltf
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_scenes_modtime
BEFORE UPDATE ON scenes
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_nodes_modtime
BEFORE UPDATE ON nodes
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_meshes_modtime
BEFORE UPDATE ON meshes
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_materials_modtime
BEFORE UPDATE ON materials
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_textures_modtime
BEFORE UPDATE ON textures
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_images_modtime
BEFORE UPDATE ON images
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_samplers_modtime
BEFORE UPDATE ON samplers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_buffers_modtime
BEFORE UPDATE ON buffers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_buffer_views_modtime
BEFORE UPDATE ON buffer_views
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_accessors_modtime
BEFORE UPDATE ON accessors
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_animations_modtime
BEFORE UPDATE ON animations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cameras_modtime
BEFORE UPDATE ON cameras
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_skins_modtime
BEFORE UPDATE ON skins
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_gltf ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meshes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE samplers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffer_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime
ADD TABLE world_gltf, scenes, nodes, meshes, materials, textures,
          images, samplers, animations, skins, cameras, buffers,
          buffer_views, accessors;

-- Add indexes for better query performance
CREATE INDEX idx_worlds_gltf_name ON world_gltf(name);
CREATE INDEX idx_scenes_name ON scenes(name);
CREATE INDEX idx_nodes_name ON nodes(name);
CREATE INDEX idx_meshes_name ON meshes(name);
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_textures_name ON textures(name);
CREATE INDEX idx_images_name ON images(name);
CREATE INDEX idx_samplers_name ON samplers(name);
CREATE INDEX idx_animations_name ON animations(name);
CREATE INDEX idx_skins_name ON skins(name);
CREATE INDEX idx_cameras_name ON cameras(name);
CREATE INDEX idx_buffers_name ON buffers(name);
CREATE INDEX idx_buffer_views_name ON buffer_views(name);
CREATE INDEX idx_accessors_name ON accessors(name);

-- Add GIN indexes for JSONB columns to improve query performance on these fields
CREATE INDEX idx_worlds_gltf_extensions ON world_gltf USING GIN (extensions);
CREATE INDEX idx_scenes_nodes ON scenes USING GIN (nodes);
CREATE INDEX idx_meshes_primitives ON meshes USING GIN (primitives);
CREATE INDEX idx_materials_pbr_metallic_roughness ON materials USING GIN (pbrMetallicRoughness);
CREATE INDEX idx_animations_channels ON animations USING GIN (channels);
CREATE INDEX idx_animations_samplers ON animations USING GIN (samplers);
CREATE INDEX idx_skins_joints ON skins USING GIN (joints);
CREATE INDEX idx_accessors_sparse ON accessors USING GIN (sparse);
