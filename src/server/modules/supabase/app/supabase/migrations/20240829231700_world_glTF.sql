-- This migration conforms to the glTF 2.0 specification and uses custom features within extras.
-- If for some reason it falls out alignment with the ability to serialize without much conversion to glTF 2.0, then please update the migration to conform again.
-- The fields "uuid" and "world_uuid" do not conform, but are necessary, and should be dropped when serializing to glTF 2.0.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the worlds_gltf table
CREATE TABLE worlds_gltf (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    asset JSONB NOT NULL,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the scenes table
CREATE TABLE scenes (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    nodes JSONB,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the nodes table
CREATE TABLE nodes (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
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
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the meshes table
CREATE TABLE meshes (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    primitives JSONB NOT NULL,
    weights JSONB,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the materials table
CREATE TABLE materials (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
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
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    ),
    CONSTRAINT check_alphamode CHECK (alphaMode IN ('OPAQUE', 'MASK', 'BLEND')),
    CONSTRAINT check_pbr_metallic_roughness_structure CHECK (
        pbrMetallicRoughness IS NULL OR (
            (pbrMetallicRoughness->>'baseColorFactor' IS NULL OR 
             jsonb_array_length(pbrMetallicRoughness->'baseColorFactor') = 4),
            jsonb_typeof(pbrMetallicRoughness->'metallicFactor') IN ('number', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'roughnessFactor') IN ('number', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'baseColorTexture') IN ('object', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'metallicRoughnessTexture') IN ('object', 'null')
        )
    )
);

-- Create the textures table
CREATE TABLE textures (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    sampler TEXT,
    source TEXT,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the images table
CREATE TABLE images (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    uri TEXT,
    mimeType TEXT,
    bufferView TEXT,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the samplers table
CREATE TABLE samplers (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    magFilter INTEGER,
    minFilter INTEGER,
    wrapS INTEGER DEFAULT 10497,
    wrapT INTEGER DEFAULT 10497,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    ),
    CONSTRAINT check_mag_filter CHECK (magFilter IN (9728, 9729)),
    CONSTRAINT check_min_filter CHECK (minFilter IN (9728, 9729, 9984, 9985, 9986, 9987)),
    CONSTRAINT check_wrap_s CHECK (wrapS IN (33071, 33648, 10497)),
    CONSTRAINT check_wrap_t CHECK (wrapT IN (33071, 33648, 10497))
);

-- Create the animations table
CREATE TABLE animations (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    channels JSONB NOT NULL,
    samplers JSONB NOT NULL,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the skins table
CREATE TABLE skins (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    inverseBindMatrices TEXT,
    skeleton TEXT,
    joints JSONB NOT NULL,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the cameras table
CREATE TABLE cameras (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    type TEXT NOT NULL,
    orthographic JSONB,
    perspective JSONB,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    ),
    CONSTRAINT check_camera_type CHECK (type IN ('perspective', 'orthographic'))
);

-- Create the buffers table
CREATE TABLE buffers (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    uri TEXT,
    byteLength INTEGER NOT NULL,
    data BYTEA,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    )
);

-- Create the buffer_views table
CREATE TABLE buffer_views (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    buffer TEXT NOT NULL,
    byteOffset INTEGER DEFAULT 0,
    byteLength INTEGER NOT NULL,
    byteStride INTEGER,
    target INTEGER,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    ),
    CONSTRAINT check_target CHECK (target IN (34962, 34963))
);

-- Create the accessors table
CREATE TABLE accessors (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_uuid UUID NOT NULL REFERENCES worlds_gltf(id),
    name TEXT,
    bufferView TEXT,
    byteOffset INTEGER DEFAULT 0,
    componentType INTEGER NOT NULL,
    normalized BOOLEAN DEFAULT false,
    count INTEGER NOT NULL,
    type TEXT NOT NULL,
    max JSONB,
    min JSONB,
    sparse JSONB,
    extensions JSONB,
    extras JSONB,
    CONSTRAINT check_extras_structure CHECK (
        extras IS NULL OR (
            extras ? 'vircadia' AND 
            jsonb_typeof(extras->'vircadia') = 'object'
        )
    ),
    CONSTRAINT check_component_type CHECK (componentType IN (5120, 5121, 5122, 5123, 5125, 5126)),
    CONSTRAINT check_type CHECK (type IN ('SCALAR', 'VEC2', 'VEC3', 'VEC4', 'MAT2', 'MAT3', 'MAT4')),
    CONSTRAINT check_sparse_structure CHECK (
        sparse IS NULL OR (
            jsonb_typeof(sparse->'count') = 'number' AND
            jsonb_typeof(sparse->'indices') = 'object' AND
            jsonb_typeof(sparse->'values') = 'object' AND
            sparse->'indices' ? 'bufferView' AND
            sparse->'indices' ? 'componentType' AND
            sparse->'values' ? 'bufferView'
        )
    )
);

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the worlds_gltf table
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
CREATE INDEX idx_worlds_gltf_extensions ON worlds_gltf USING GIN (extensions);
CREATE INDEX idx_scenes_nodes ON scenes USING GIN (nodes);
CREATE INDEX idx_meshes_primitives ON meshes USING GIN (primitives);
CREATE INDEX idx_materials_pbr_metallic_roughness ON materials USING GIN (pbrMetallicRoughness);
CREATE INDEX idx_animations_channels ON animations USING GIN (channels);
CREATE INDEX idx_animations_samplers ON animations USING GIN (samplers);
CREATE INDEX idx_skins_joints ON skins USING GIN (joints);
CREATE INDEX idx_accessors_sparse ON accessors USING GIN (sparse);