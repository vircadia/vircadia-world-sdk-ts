import * as GLTF2 from "babylonjs-gltf2interface";

export interface World {
    id: string;
    name: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
    defaultScene?: string;
    extensions?: Record<string, unknown>;
    extras?: Record<string, unknown>;
    scenes: GLTF2.IScene[];
    nodes: GLTF2.INode[];
    meshes: GLTF2.IMesh[];
    materials: GLTF2.IMaterial[];
    textures: GLTF2.ITexture[];
    images: GLTF2.IImage[];
    samplers: GLTF2.ISampler[];
    animations: GLTF2.IAnimation[];
    skins: GLTF2.ISkin[];
    cameras: GLTF2.ICamera[];
    buffers: GLTF2.IBuffer[];
    bufferViews: GLTF2.IBufferView[];
    accessors: GLTF2.IAccessor[];
}
