-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user is a member
CREATE OR REPLACE FUNCTION is_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'member' FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user is a guest
CREATE OR REPLACE FUNCTION is_guest()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'guest' FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Profiles

CREATE OR REPLACE FUNCTION create_user_profile(
  p_username TEXT,
  p_role user_role
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO user_profiles (id, username, role)
  VALUES (auth.uid(), p_username, p_role)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_profile(
  p_username TEXT,
  p_role user_role
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET username = p_username, role = p_role
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_profile()
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for user_profiles
CREATE POLICY user_profiles_select_policy ON user_profiles FOR SELECT USING (true);
CREATE POLICY user_profiles_insert_policy ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY user_profiles_update_policy ON user_profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY user_profiles_delete_policy ON user_profiles FOR DELETE USING (is_admin());

-- World GLTF

CREATE OR REPLACE FUNCTION create_world_gltf(
  p_name TEXT,
  p_version TEXT,
  p_metadata JSONB,
  p_defaultScene TEXT,
  p_extensionsUsed TEXT[],
  p_extensionsRequired TEXT[],
  p_extensions JSONB,
  p_extras JSONB,
  p_asset JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create world_gltf entries';
  END IF;

  INSERT INTO world_gltf (name, version, metadata, defaultScene, extensionsUsed, extensionsRequired, extensions, extras, asset)
  VALUES (p_name, p_version, p_metadata, p_defaultScene, p_extensionsUsed, p_extensionsRequired, p_extensions, p_extras, p_asset)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_world_gltf(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_version TEXT,
  p_metadata JSONB,
  p_defaultScene TEXT,
  p_extensionsUsed TEXT[],
  p_extensionsRequired TEXT[],
  p_extensions JSONB,
  p_extras JSONB,
  p_asset JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update world_gltf entries';
  END IF;

  UPDATE world_gltf
  SET name = p_name,
      version = p_version,
      metadata = p_metadata,
      defaultScene = p_defaultScene,
      extensionsUsed = p_extensionsUsed,
      extensionsRequired = p_extensionsRequired,
      extensions = p_extensions,
      extras = p_extras,
      asset = p_asset
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_world_gltf(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete world_gltf entries';
  END IF;

  DELETE FROM world_gltf WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for world_gltf
CREATE POLICY world_gltf_select_policy ON world_gltf FOR SELECT USING (true);
CREATE POLICY world_gltf_insert_policy ON world_gltf FOR INSERT WITH CHECK (is_admin());
CREATE POLICY world_gltf_update_policy ON world_gltf FOR UPDATE USING (is_admin());
CREATE POLICY world_gltf_delete_policy ON world_gltf FOR DELETE USING (is_admin());

-- Scenes

CREATE OR REPLACE FUNCTION create_scene(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_nodes JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create scene entries';
  END IF;

  INSERT INTO scenes (vircadia_world_uuid, name, nodes, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_nodes, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_scene(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_nodes JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update scene entries';
  END IF;

  UPDATE scenes
  SET name = p_name,
      nodes = p_nodes,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_scene(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete scene entries';
  END IF;

  DELETE FROM scenes WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for scenes
CREATE POLICY scenes_select_policy ON scenes FOR SELECT USING (true);
CREATE POLICY scenes_insert_policy ON scenes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY scenes_update_policy ON scenes FOR UPDATE USING (is_admin());
CREATE POLICY scenes_delete_policy ON scenes FOR DELETE USING (is_admin());

-- Nodes

CREATE OR REPLACE FUNCTION create_node(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_camera TEXT,
  p_children JSONB,
  p_skin TEXT,
  p_matrix NUMERIC[16],
  p_mesh TEXT,
  p_rotation NUMERIC[4],
  p_scale NUMERIC[3],
  p_translation NUMERIC[3],
  p_weights JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create node entries';
  END IF;

  INSERT INTO nodes (vircadia_world_uuid, name, camera, children, skin, matrix, mesh, rotation, scale, translation, weights, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_camera, p_children, p_skin, p_matrix, p_mesh, p_rotation, p_scale, p_translation, p_weights, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_node(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_camera TEXT,
  p_children JSONB,
  p_skin TEXT,
  p_matrix NUMERIC[16],
  p_mesh TEXT,
  p_rotation NUMERIC[4],
  p_scale NUMERIC[3],
  p_translation NUMERIC[3],
  p_weights JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update node entries';
  END IF;

  UPDATE nodes
  SET name = p_name,
      camera = p_camera,
      children = p_children,
      skin = p_skin,
      matrix = p_matrix,
      mesh = p_mesh,
      rotation = p_rotation,
      scale = p_scale,
      translation = p_translation,
      weights = p_weights,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_node(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete node entries';
  END IF;

  DELETE FROM nodes WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for nodes
CREATE POLICY nodes_select_policy ON nodes FOR SELECT USING (true);
CREATE POLICY nodes_insert_policy ON nodes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY nodes_update_policy ON nodes FOR UPDATE USING (is_admin());
CREATE POLICY nodes_delete_policy ON nodes FOR DELETE USING (is_admin());

-- Similar functions and policies should be created for the remaining tables:
-- meshes, materials, textures, images, samplers, buffers, buffer_views, and accessors.
-- The structure will be similar to the examples above, adjusting for the specific
-- columns of each table.

-- Example for meshes (repeat this pattern for other tables):

CREATE OR REPLACE FUNCTION create_mesh(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_primitives JSONB,
  p_weights JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create mesh entries';
  END IF;

  INSERT INTO meshes (vircadia_world_uuid, name, primitives, weights, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_primitives, p_weights, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_mesh(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_primitives JSONB,
  p_weights JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update mesh entries';
  END IF;

  UPDATE meshes
  SET name = p_name,
      primitives = p_primitives,
      weights = p_weights,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_mesh(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete mesh entries';
  END IF;

  DELETE FROM meshes WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for meshes
CREATE POLICY meshes_select_policy ON meshes FOR SELECT USING (true);
CREATE POLICY meshes_insert_policy ON meshes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY meshes_update_policy ON meshes FOR UPDATE USING (is_admin());
CREATE POLICY meshes_delete_policy ON meshes FOR DELETE USING (is_admin());

-- Materials

CREATE OR REPLACE FUNCTION create_material(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_pbrMetallicRoughness JSONB,
  p_normalTexture JSONB,
  p_occlusionTexture JSONB,
  p_emissiveTexture JSONB,
  p_emissiveFactor NUMERIC[3],
  p_alphaMode TEXT,
  p_alphaCutoff NUMERIC,
  p_doubleSided BOOLEAN,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create material entries';
  END IF;

  INSERT INTO materials (vircadia_world_uuid, name, pbrMetallicRoughness, normalTexture, occlusionTexture, emissiveTexture, emissiveFactor, alphaMode, alphaCutoff, doubleSided, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_pbrMetallicRoughness, p_normalTexture, p_occlusionTexture, p_emissiveTexture, p_emissiveFactor, p_alphaMode, p_alphaCutoff, p_doubleSided, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_material(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_pbrMetallicRoughness JSONB,
  p_normalTexture JSONB,
  p_occlusionTexture JSONB,
  p_emissiveTexture JSONB,
  p_emissiveFactor NUMERIC[3],
  p_alphaMode TEXT,
  p_alphaCutoff NUMERIC,
  p_doubleSided BOOLEAN,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update material entries';
  END IF;

  UPDATE materials
  SET name = p_name,
      pbrMetallicRoughness = p_pbrMetallicRoughness,
      normalTexture = p_normalTexture,
      occlusionTexture = p_occlusionTexture,
      emissiveTexture = p_emissiveTexture,
      emissiveFactor = p_emissiveFactor,
      alphaMode = p_alphaMode,
      alphaCutoff = p_alphaCutoff,
      doubleSided = p_doubleSided,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_material(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete material entries';
  END IF;

  DELETE FROM materials WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for materials
CREATE POLICY materials_select_policy ON materials FOR SELECT USING (true);
CREATE POLICY materials_insert_policy ON materials FOR INSERT WITH CHECK (is_admin());
CREATE POLICY materials_update_policy ON materials FOR UPDATE USING (is_admin());
CREATE POLICY materials_delete_policy ON materials FOR DELETE USING (is_admin());

-- Textures

CREATE OR REPLACE FUNCTION create_texture(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_sampler TEXT,
  p_source TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create texture entries';
  END IF;

  INSERT INTO textures (vircadia_world_uuid, name, sampler, source, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_sampler, p_source, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_texture(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_sampler TEXT,
  p_source TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update texture entries';
  END IF;

  UPDATE textures
  SET name = p_name,
      sampler = p_sampler,
      source = p_source,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_texture(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete texture entries';
  END IF;

  DELETE FROM textures WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for textures
CREATE POLICY textures_select_policy ON textures FOR SELECT USING (true);
CREATE POLICY textures_insert_policy ON textures FOR INSERT WITH CHECK (is_admin());
CREATE POLICY textures_update_policy ON textures FOR UPDATE USING (is_admin());
CREATE POLICY textures_delete_policy ON textures FOR DELETE USING (is_admin());

-- Images

CREATE OR REPLACE FUNCTION create_image(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_uri TEXT,
  p_mimeType TEXT,
  p_bufferView TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create image entries';
  END IF;

  INSERT INTO images (vircadia_world_uuid, name, uri, mimeType, bufferView, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_uri, p_mimeType, p_bufferView, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_image(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_uri TEXT,
  p_mimeType TEXT,
  p_bufferView TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update image entries';
  END IF;

  UPDATE images
  SET name = p_name,
      uri = p_uri,
      mimeType = p_mimeType,
      bufferView = p_bufferView,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_image(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete image entries';
  END IF;

  DELETE FROM images WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for images
CREATE POLICY images_select_policy ON images FOR SELECT USING (true);
CREATE POLICY images_insert_policy ON images FOR INSERT WITH CHECK (is_admin());
CREATE POLICY images_update_policy ON images FOR UPDATE USING (is_admin());
CREATE POLICY images_delete_policy ON images FOR DELETE USING (is_admin());

-- Samplers

CREATE OR REPLACE FUNCTION create_sampler(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_magFilter TEXT,
  p_minFilter TEXT,
  p_wrapS TEXT,
  p_wrapT TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create sampler entries';
  END IF;

  INSERT INTO samplers (vircadia_world_uuid, name, magFilter, minFilter, wrapS, wrapT, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_magFilter, p_minFilter, p_wrapS, p_wrapT, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_sampler(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_magFilter TEXT,
  p_minFilter TEXT,
  p_wrapS TEXT,
  p_wrapT TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update sampler entries';
  END IF;

  UPDATE samplers
  SET name = p_name,
      magFilter = p_magFilter,
      minFilter = p_minFilter,
      wrapS = p_wrapS,
      wrapT = p_wrapT,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_sampler(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete sampler entries';
  END IF;

  DELETE FROM samplers WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for samplers
CREATE POLICY samplers_select_policy ON samplers FOR SELECT USING (true);
CREATE POLICY samplers_insert_policy ON samplers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY samplers_update_policy ON samplers FOR UPDATE USING (is_admin());
CREATE POLICY samplers_delete_policy ON samplers FOR DELETE USING (is_admin());

-- Buffers

CREATE OR REPLACE FUNCTION create_buffer(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_uri TEXT,
  p_byteLength INTEGER,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create buffer entries';
  END IF;

  INSERT INTO buffers (vircadia_world_uuid, name, uri, byteLength, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_uri, p_byteLength, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_buffer(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_uri TEXT,
  p_byteLength INTEGER,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update buffer entries';
  END IF;

  UPDATE buffers
  SET name = p_name,
      uri = p_uri,
      byteLength = p_byteLength,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_buffer(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete buffer entries';
  END IF;

  DELETE FROM buffers WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for buffers
CREATE POLICY buffers_select_policy ON buffers FOR SELECT USING (true);
CREATE POLICY buffers_insert_policy ON buffers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY buffers_update_policy ON buffers FOR UPDATE USING (is_admin());
CREATE POLICY buffers_delete_policy ON buffers FOR DELETE USING (is_admin());

-- Buffer Views

CREATE OR REPLACE FUNCTION create_buffer_view(
  p_vircadia_world_uuid UUID,
  p_buffer TEXT,
  p_byteOffset INTEGER,
  p_byteLength INTEGER,
  p_byteStride INTEGER,
  p_target TEXT,
  p_name TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create buffer view entries';
  END IF;

  INSERT INTO buffer_views (vircadia_world_uuid, buffer, byteOffset, byteLength, byteStride, target, name, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_buffer, p_byteOffset, p_byteLength, p_byteStride, p_target, p_name, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_buffer_view(
  p_vircadia_uuid UUID,
  p_buffer TEXT,
  p_byteOffset INTEGER,
  p_byteLength INTEGER,
  p_byteStride INTEGER,
  p_target TEXT,
  p_name TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update buffer view entries';
  END IF;

  UPDATE buffer_views
  SET buffer = p_buffer,
      byteOffset = p_byteOffset,
      byteLength = p_byteLength,
      byteStride = p_byteStride,
      target = p_target,
      name = p_name,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_buffer_view(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete buffer view entries';
  END IF;

  DELETE FROM buffer_views WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for buffer_views
CREATE POLICY buffer_views_select_policy ON buffer_views FOR SELECT USING (true);
CREATE POLICY buffer_views_insert_policy ON buffer_views FOR INSERT WITH CHECK (is_admin());
CREATE POLICY buffer_views_update_policy ON buffer_views FOR UPDATE USING (is_admin());
CREATE POLICY buffer_views_delete_policy ON buffer_views FOR DELETE USING (is_admin());

-- Accessors

CREATE OR REPLACE FUNCTION create_accessor(
  p_vircadia_world_uuid UUID,
  p_bufferView TEXT,
  p_byteOffset INTEGER,
  p_componentType INTEGER,
  p_normalized BOOLEAN,
  p_count INTEGER,
  p_type TEXT,
  p_max JSONB,
  p_min JSONB,
  p_name TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create accessor entries';
  END IF;

  INSERT INTO accessors (vircadia_world_uuid, bufferView, byteOffset, componentType, normalized, count, type, max, min, name, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_bufferView, p_byteOffset, p_componentType, p_normalized, p_count, p_type, p_max, p_min, p_name, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_accessor(
  p_vircadia_uuid UUID,
  p_bufferView TEXT,
  p_byteOffset INTEGER,
  p_componentType INTEGER,
  p_normalized BOOLEAN,
  p_count INTEGER,
  p_type TEXT,
  p_max JSONB,
  p_min JSONB,
  p_name TEXT,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update accessor entries';
  END IF;

  UPDATE accessors
  SET bufferView = p_bufferView,
      byteOffset = p_byteOffset,
      componentType = p_componentType,
      normalized = p_normalized,
      count = p_count,
      type = p_type,
      max = p_max,
      min = p_min,
      name = p_name,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_accessor(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete accessor entries';
  END IF;

  DELETE FROM accessors WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for accessors
CREATE POLICY accessors_select_policy ON accessors FOR SELECT USING (true);
CREATE POLICY accessors_insert_policy ON accessors FOR INSERT WITH CHECK (is_admin());
CREATE POLICY accessors_update_policy ON accessors FOR UPDATE USING (is_admin());
CREATE POLICY accessors_delete_policy ON accessors FOR DELETE USING (is_admin());

-- Cameras

CREATE OR REPLACE FUNCTION create_camera(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_type TEXT,
  p_orthographic JSONB,
  p_perspective JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create camera entries';
  END IF;

  INSERT INTO cameras (vircadia_world_uuid, name, type, orthographic, perspective, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_type, p_orthographic, p_perspective, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_camera(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_type TEXT,
  p_orthographic JSONB,
  p_perspective JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update camera entries';
  END IF;

  UPDATE cameras
  SET name = p_name,
      type = p_type,
      orthographic = p_orthographic,
      perspective = p_perspective,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_camera(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete camera entries';
  END IF;

  DELETE FROM cameras WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for cameras
CREATE POLICY cameras_select_policy ON cameras FOR SELECT USING (true);
CREATE POLICY cameras_insert_policy ON cameras FOR INSERT WITH CHECK (is_admin());
CREATE POLICY cameras_update_policy ON cameras FOR UPDATE USING (is_admin());
CREATE POLICY cameras_delete_policy ON cameras FOR DELETE USING (is_admin());

-- Animations

CREATE OR REPLACE FUNCTION create_animation(
  p_vircadia_world_uuid UUID,
  p_name TEXT,
  p_channels JSONB,
  p_samplers JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create animation entries';
  END IF;

  INSERT INTO animations (vircadia_world_uuid, name, channels, samplers, extensions, extras)
  VALUES (p_vircadia_world_uuid, p_name, p_channels, p_samplers, p_extensions, p_extras)
  RETURNING vircadia_uuid INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_animation(
  p_vircadia_uuid UUID,
  p_name TEXT,
  p_channels JSONB,
  p_samplers JSONB,
  p_extensions JSONB,
  p_extras JSONB
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update animation entries';
  END IF;

  UPDATE animations
  SET name = p_name,
      channels = p_channels,
      samplers = p_samplers,
      extensions = p_extensions,
      extras = p_extras
  WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_animation(p_vircadia_uuid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete animation entries';
  END IF;

  DELETE FROM animations WHERE vircadia_uuid = p_vircadia_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for animations
CREATE POLICY animations_select_policy ON animations FOR SELECT USING (true);
CREATE POLICY animations_insert_policy ON animations FOR INSERT WITH CHECK (is_admin());
CREATE POLICY animations_update_policy ON animations FOR UPDATE USING (is_admin());
CREATE POLICY animations_delete_policy ON animations FOR DELETE USING (is_admin());

