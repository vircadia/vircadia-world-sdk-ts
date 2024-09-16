# Vircadia World

## Install

To get started, clone the repository and install the dependencies:

```sh
npm install
```

## Develop

To run all apps and packages in development mode, run the following command:

```sh
npm run dev
```
## Configure

### Core Supabase Project

Configurations for the core Supabase project are found in `/src/server/modules/supabase/app/supabase/config.toml`.

### Client-Server Mutations

Configurations for client-server mutations are found in 


## TODO: REMOVE: glTF High Level

- glTF
  - extensionsUsed
  - extensionsRequired
  - accessors
    - bufferView
    - byteOffset
    - componentType
    - normalized
    - count
    - type
    - max
    - min
    - sparse
      - count
      - indices
        - bufferView
        - byteOffset
        - componentType
      - values
        - bufferView
        - byteOffset
    - name
    - extensions
    - extras
  - animations
    - channels
      - sampler
      - target
        - node
        - path
    - samplers
      - input
      - interpolation
      - output
    - name
    - extensions
    - extras
  - asset
    - copyright
    - generator
    - version
    - minVersion
    - extensions
    - extras
  - buffers
    - uri
    - byteLength
    - name
    - extensions
    - extras
  - bufferViews
    - buffer
    - byteOffset
    - byteLength
    - byteStride
    - target
    - name
    - extensions
    - extras
  - cameras
    - orthographic
      - xmag
      - ymag
      - zfar
      - znear
    - perspective
      - aspectRatio
      - yfov
      - zfar
      - znear
    - type
    - name
    - extensions
    - extras
  - images
    - uri
    - mimeType
    - bufferView
    - name
    - extensions
    - extras
  - materials
    - name
    - extensions
    - extras
    - pbrMetallicRoughness
      - baseColorFactor
      - baseColorTexture
        - index
        - texCoord
      - metallicFactor
      - roughnessFactor
      - metallicRoughnessTexture
        - index
        - texCoord
    - normalTexture
      - index
      - texCoord
      - scale
    - occlusionTexture
      - index
      - texCoord
      - strength
    - emissiveTexture
      - index
      - texCoord
    - emissiveFactor
    - alphaMode
    - alphaCutoff
    - doubleSided
  - meshes
    - primitives
      - attributes
      - indices
      - material
      - mode
      - targets
    - weights
    - name
    - extensions
    - extras
  - nodes
    - camera
    - children
    - skin
    - matrix
    - mesh
    - rotation
    - scale
    - translation
    - weights
    - name
    - extensions
    - extras
  - samplers
    - magFilter
    - minFilter
    - wrapS
    - wrapT
    - name
    - extensions
    - extras
  - scene
  - scenes
    - nodes
    - name
    - extensions
    - extras
  - skins
    - inverseBindMatrices
    - skeleton
    - joints
    - name
    - extensions
    - extras
  - textures
    - sampler
    - source
    - name
    - extensions
    - extras
  - extensions
  - extras