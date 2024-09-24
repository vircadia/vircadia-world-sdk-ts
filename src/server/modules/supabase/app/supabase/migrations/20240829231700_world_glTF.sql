-- This migration conforms to the glTF 2.0 specification and uses custom features within extras.
-- If for some reason it falls out alignment with the ability to serialize without much conversion to glTF 2.0, then please update the migration to conform again.
-- Any fields prefixed with "vircadia_" are custom and not compliant with glTF 2.0, and may need to be removed when serializing to glTF 2.0 for unsupported editors.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
--
-- WORLD_GLTF
--
--

-- Create the world_gltf table
CREATE TABLE world_gltf (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE OR REPLACE FUNCTION create_world_gltf(
    _name TEXT,
    _version TEXT,
    _metadata JSONB,
    _defaultScene TEXT DEFAULT NULL,
    _extensionsUsed TEXT[] DEFAULT NULL,
    _extensionsRequired TEXT[] DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL,
    _asset JSONB
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO world_gltf (
        name, version, metadata, defaultScene, extensionsUsed, extensionsRequired, extensions, extras, asset
    ) VALUES (
        _name, _version, _metadata, _defaultScene, _extensionsUsed, _extensionsRequired, _extensions, _extras, _asset
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_world_gltf(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _version TEXT DEFAULT NULL,
    _metadata JSONB DEFAULT NULL,
    _defaultScene TEXT DEFAULT NULL,
    _extensionsUsed TEXT[] DEFAULT NULL,
    _extensionsRequired TEXT[] DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL,
    _asset JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE world_gltf
    SET
        name = COALESCE(_name, name),
        version = COALESCE(_version, version),
        metadata = COALESCE(_metadata, metadata),
        defaultScene = COALESCE(_defaultScene, defaultScene),
        extensionsUsed = COALESCE(_extensionsUsed, extensionsUsed),
        extensionsRequired = COALESCE(_extensionsRequired, extensionsRequired),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras),
        asset = COALESCE(_asset, asset),
        updated_at = NOW()
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_world_gltf(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM world_gltf
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- SCENES
--
--

-- Create the scenes table
CREATE TABLE scenes (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    nodes JSONB,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_scene(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _nodes JSONB,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO scenes (
        vircadia_world_uuid, name, nodes, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _nodes, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scene(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _nodes JSONB DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE scenes
    SET
        name = COALESCE(_name, name),
        nodes = COALESCE(_nodes, nodes),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_scene(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM scenes
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- NODES
--
--

-- Create the nodes table
CREATE TABLE nodes (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE OR REPLACE FUNCTION create_node(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _camera TEXT DEFAULT NULL,
    _children JSONB DEFAULT NULL,
    _skin TEXT DEFAULT NULL,
    _matrix NUMERIC[16] DEFAULT ARRAY[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    _mesh TEXT DEFAULT NULL,
    _rotation NUMERIC[4] DEFAULT ARRAY[0,0,0,1],
    _scale NUMERIC[3] DEFAULT ARRAY[1,1,1],
    _translation NUMERIC[3] DEFAULT ARRAY[0,0,0],
    _weights JSONB DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO nodes (
        vircadia_world_uuid, name, camera, children, skin, matrix, mesh, rotation, scale, translation, weights, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _camera, _children, _skin, _matrix, _mesh, _rotation, _scale, _translation, _weights, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_node(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _camera TEXT DEFAULT NULL,
    _children JSONB DEFAULT NULL,
    _skin TEXT DEFAULT NULL,
    _matrix NUMERIC[16] DEFAULT NULL,
    _mesh TEXT DEFAULT NULL,
    _rotation NUMERIC[4] DEFAULT NULL,
    _scale NUMERIC[3] DEFAULT NULL,
    _translation NUMERIC[3] DEFAULT NULL,
    _weights JSONB DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE nodes
    SET
        name = COALESCE(_name, name),
        camera = COALESCE(_camera, camera),
        children = COALESCE(_children, children),
        skin = COALESCE(_skin, skin),
        matrix = COALESCE(_matrix, matrix),
        mesh = COALESCE(_mesh, mesh),
        rotation = COALESCE(_rotation, rotation),
        scale = COALESCE(_scale, scale),
        translation = COALESCE(_translation, translation),
        weights = COALESCE(_weights, weights),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_node(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM nodes
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- MESHES
--
--

-- Create the meshes table
CREATE TABLE meshes (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    primitives JSONB NOT NULL,
    weights JSONB,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_mesh(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _primitives JSONB,
    _weights JSONB DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO meshes (
        vircadia_world_uuid, name, primitives, weights, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _primitives, _weights, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_mesh(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _primitives JSONB DEFAULT NULL,
    _weights JSONB DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE meshes
    SET
        name = COALESCE(_name, name),
        primitives = COALESCE(_primitives, primitives),
        weights = COALESCE(_weights, weights),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_mesh(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM meshes
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- MATERIALS
--
--

-- Create the materials table
CREATE TABLE materials (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
             jsonb_array_length(pbrMetallicRoughness->'baseColorFactor') = 4),
            jsonb_typeof(pbrMetallicRoughness->'metallicFactor') IN ('number', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'roughnessFactor') IN ('number', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'baseColorTexture') IN ('object', 'null'),
            jsonb_typeof(pbrMetallicRoughness->'metallicRoughnessTexture') IN ('object', 'null')
        )
    )
);

CREATE OR REPLACE FUNCTION create_material(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _pbrMetallicRoughness JSONB DEFAULT NULL,
    _normalTexture JSONB DEFAULT NULL,
    _occlusionTexture JSONB DEFAULT NULL,
    _emissiveTexture JSONB DEFAULT NULL,
    _emissiveFactor NUMERIC[3] DEFAULT ARRAY[0,0,0],
    _alphaMode TEXT DEFAULT 'OPAQUE',
    _alphaCutoff NUMERIC DEFAULT 0.5,
    _doubleSided BOOLEAN DEFAULT false,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO materials (
        vircadia_world_uuid, name, pbrMetallicRoughness, normalTexture, occlusionTexture, emissiveTexture, emissiveFactor, alphaMode, alphaCutoff, doubleSided, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _pbrMetallicRoughness, _normalTexture, _occlusionTexture, _emissiveTexture, _emissiveFactor, _alphaMode, _alphaCutoff, _doubleSided, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_material(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _pbrMetallicRoughness JSONB DEFAULT NULL,
    _normalTexture JSONB DEFAULT NULL,
    _occlusionTexture JSONB DEFAULT NULL,
    _emissiveTexture JSONB DEFAULT NULL,
    _emissiveFactor NUMERIC[3] DEFAULT NULL,
    _alphaMode TEXT DEFAULT NULL,
    _alphaCutoff NUMERIC DEFAULT NULL,
    _doubleSided BOOLEAN DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE materials
    SET
        name = COALESCE(_name, name),
        pbrMetallicRoughness = COALESCE(_pbrMetallicRoughness, pbrMetallicRoughness),
        normalTexture = COALESCE(_normalTexture, normalTexture),
        occlusionTexture = COALESCE(_occlusionTexture, occlusionTexture),
        emissiveTexture = COALESCE(_emissiveTexture, emissiveTexture),
        emissiveFactor = COALESCE(_emissiveFactor, emissiveFactor),
        alphaMode = COALESCE(_alphaMode, alphaMode),
        alphaCutoff = COALESCE(_alphaCutoff, alphaCutoff),
        doubleSided = COALESCE(_doubleSided, doubleSided),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_material(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM materials
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- TEXTURES
--
--

-- Create the textures table
CREATE TABLE textures (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    sampler TEXT,
    source TEXT,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_texture(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _sampler TEXT DEFAULT NULL,
    _source TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO textures (
        vircadia_world_uuid, name, sampler, source, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _sampler, _source, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_texture(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _sampler TEXT DEFAULT NULL,
    _source TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE textures
    SET
        name = COALESCE(_name, name),
        sampler = COALESCE(_sampler, sampler),
        source = COALESCE(_source, source),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_texture(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM textures
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- IMAGES
--
--

-- Create the images table
CREATE TABLE images (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    uri TEXT,
    mimeType TEXT,
    bufferView TEXT,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_image(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _uri TEXT DEFAULT NULL,
    _mimeType TEXT DEFAULT NULL,
    _bufferView TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO images (
        vircadia_world_uuid, name, uri, mimeType, bufferView, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _uri, _mimeType, _bufferView, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_image(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _uri TEXT DEFAULT NULL,
    _mimeType TEXT DEFAULT NULL,
    _bufferView TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE images
    SET
        name = COALESCE(_name, name),
        uri = COALESCE(_uri, uri),
        mimeType = COALESCE(_mimeType, mimeType),
        bufferView = COALESCE(_bufferView, bufferView),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_image(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM images
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- SAMPLERS
--
--

-- Create the samplers table
CREATE TABLE samplers (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    magFilter TEXT,
    minFilter TEXT,
    wrapS TEXT,
    wrapT TEXT,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_sampler(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _magFilter TEXT DEFAULT NULL,
    _minFilter TEXT DEFAULT NULL,
    _wrapS TEXT DEFAULT NULL,
    _wrapT TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO samplers (
        vircadia_world_uuid, name, magFilter, minFilter, wrapS, wrapT, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _magFilter, _minFilter, _wrapS, _wrapT, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_sampler(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _magFilter TEXT DEFAULT NULL,
    _minFilter TEXT DEFAULT NULL,
    _wrapS TEXT DEFAULT NULL,
    _wrapT TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE samplers
    SET
        name = COALESCE(_name, name),
        magFilter = COALESCE(_magFilter, magFilter),
        minFilter = COALESCE(_minFilter, minFilter),
        wrapS = COALESCE(_wrapS, wrapS),
        wrapT = COALESCE(_wrapT, wrapT),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_sampler(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM samplers
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- BUFFERS
--
--

-- Create the buffers table
CREATE TABLE buffers (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vircadia_world_uuid UUID NOT NULL REFERENCES world_gltf(vircadia_uuid),
    name TEXT,
    uri TEXT,
    byteLength INTEGER NOT NULL,
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_buffer(
    _vircadia_world_uuid UUID,
    _name TEXT,
    _uri TEXT DEFAULT NULL,
    _byteLength INTEGER,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO buffers (
        vircadia_world_uuid, name, uri, byteLength, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _name, _uri, _byteLength, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_buffer(
    _vircadia_uuid UUID,
    _name TEXT DEFAULT NULL,
    _uri TEXT DEFAULT NULL,
    _byteLength INTEGER DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE buffers
    SET
        name = COALESCE(_name, name),
        uri = COALESCE(_uri, uri),
        byteLength = COALESCE(_byteLength, byteLength),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_buffer(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM buffers
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- BUFFER VIEWS
--
--

-- Create the buffer_views table
CREATE TABLE buffer_views (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE OR REPLACE FUNCTION create_buffer_view(
    _vircadia_world_uuid UUID,
    _buffer TEXT,
    _byteOffset INTEGER DEFAULT 0,
    _byteLength INTEGER,
    _byteStride INTEGER DEFAULT NULL,
    _target TEXT DEFAULT NULL,
    _name TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO buffer_views (
        vircadia_world_uuid, buffer, byteOffset, byteLength, byteStride, target, name, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _buffer, _byteOffset, _byteLength, _byteStride, _target, _name, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_buffer_view(
    _vircadia_uuid UUID,
    _buffer TEXT DEFAULT NULL,
    _byteOffset INTEGER DEFAULT NULL,
    _byteLength INTEGER DEFAULT NULL,
    _byteStride INTEGER DEFAULT NULL,
    _target TEXT DEFAULT NULL,
    _name TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE buffer_views
    SET
        buffer = COALESCE(_buffer, buffer),
        byteOffset = COALESCE(_byteOffset, byteOffset),
        byteLength = COALESCE(_byteLength, byteLength),
        byteStride = COALESCE(_byteStride, byteStride),
        target = COALESCE(_target, target),
        name = COALESCE(_name, name),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_buffer_view(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM buffer_views
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

--
--
-- ACCESSORS
--
--

-- Create the accessors table
CREATE TABLE accessors (
    vircadia_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    extensions JSONB,
    extras JSONB
);

CREATE OR REPLACE FUNCTION create_accessor(
    _vircadia_world_uuid UUID,
    _bufferView TEXT DEFAULT NULL,
    _byteOffset INTEGER DEFAULT 0,
    _componentType INTEGER,
    _normalized BOOLEAN DEFAULT false,
    _count INTEGER,
    _type TEXT,
    _max JSONB DEFAULT NULL,
    _min JSONB DEFAULT NULL,
    _name TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_uuid UUID;
BEGIN
    INSERT INTO accessors (
        vircadia_world_uuid, bufferView, byteOffset, componentType, normalized, count, type, max, min, name, extensions, extras
    ) VALUES (
        _vircadia_world_uuid, _bufferView, _byteOffset, _componentType, _normalized, _count, _type, _max, _min, _name, _extensions, _extras
    ) RETURNING vircadia_uuid INTO new_uuid;
    RETURN new_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_accessor(
    _vircadia_uuid UUID,
    _bufferView TEXT DEFAULT NULL,
    _byteOffset INTEGER DEFAULT NULL,
    _componentType INTEGER DEFAULT NULL,
    _normalized BOOLEAN DEFAULT NULL,
    _count INTEGER DEFAULT NULL,
    _type TEXT DEFAULT NULL,
    _max JSONB DEFAULT NULL,
    _min JSONB DEFAULT NULL,
    _name TEXT DEFAULT NULL,
    _extensions JSONB DEFAULT NULL,
    _extras JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE accessors
    SET
        bufferView = COALESCE(_bufferView, bufferView),
        byteOffset = COALESCE(_byteOffset, byteOffset),
        componentType = COALESCE(_componentType, componentType),
        normalized = COALESCE(_normalized, normalized),
        count = COALESCE(_count, count),
        type = COALESCE(_type, type),
        max = COALESCE(_max, max),
        min = COALESCE(_min, min),
        name = COALESCE(_name, name),
        extensions = COALESCE(_extensions, extensions),
        extras = COALESCE(_extras, extras)
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_accessor(
    _vircadia_uuid UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM accessors
    WHERE vircadia_uuid = _vircadia_uuid;
END;
$$ LANGUAGE plpgsql;


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

-- Apply the trigger to the world_gltf table
CREATE TRIGGER update_worlds_gltf_modtime
BEFORE UPDATE ON world_gltf
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

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
