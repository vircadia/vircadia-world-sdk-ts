/* eslint-disable no-unused-vars */
import { log } from "../../../modules/log.js";
import { Agent } from './agent.js';
import { Supabase } from '../supabase/supabase.js';
import { E_WorldTransportChannel } from "../../../routes/meta.js";

import { Scene } from '@babylonjs/core/scene.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Light } from '@babylonjs/core/Lights/light.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { ShadowLight } from '@babylonjs/core/Lights/shadowLight.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Sound } from '@babylonjs/core/Audio/sound.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture.js';
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe.js';
import { Animation } from '@babylonjs/core/Animations/animation.js';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import { Node } from '@babylonjs/core/node.js';

export namespace World_Babylon {
    const BABYLON_LOG_PREFIX = '[BABYLON]';

    interface ObjectData {
        id: string;
        objectType: string;
        data: any;
    }

    interface ObjectHandler<T extends Node> {
        serialize: (obj: T) => any;
        deserialize: (data: any, scene: Scene) => T;
        update: (existing: T, updated: T) => void;
        channel: E_WorldTransportChannel;
    }

    const handlers: { [key: string]: ObjectHandler<any> } = {
        camera: {
            serialize: (cam: Camera) => cam.serialize(),
            deserialize: (data: any, scene: Scene) => Camera.Parse(data, scene),
            update: (existing: Camera, updated: Camera) => updated,
            channel: E_WorldTransportChannel.CAMERAS
        },
        light: {
            serialize: (l: Light) => l.serialize(),
            deserialize: (data: any, scene: Scene) => Light.Parse(data, scene),
            update: (existing: Light, updated: Light) => updated,
            channel: E_WorldTransportChannel.LIGHTS
        },
        mesh: {
            serialize: (m: Mesh) => m.serialize(),
            deserialize: (data: any, scene: Scene) => Mesh.Parse(data, scene, ""),
            update: (existing: Mesh, updated: Mesh) => updated,
            channel: E_WorldTransportChannel.MESHES
        },
        transformnode: {
            serialize: (node: TransformNode) => node.serialize(),
            deserialize: (data: any, scene: Scene) => TransformNode.Parse(data, scene, ""),
            update: (existing: TransformNode, updated: TransformNode) => updated,
            channel: E_WorldTransportChannel.TRANSFORM_NODES
        },
        material: {
            serialize: (mat: Material) => mat.serialize(),
            deserialize: (data: any, scene: Scene) => Material.Parse(data, scene, ""),
            update: (existing: Material, updated: Material) => updated,
            channel: E_WorldTransportChannel.MATERIALS
        },
        multimaterial: {
            serialize: (mmat: MultiMaterial) => mmat.serialize(),
            deserialize: (data: any, scene: Scene) => MultiMaterial.ParseMultiMaterial(data, scene),
            update: (existing: MultiMaterial, updated: MultiMaterial) => updated,
            channel: E_WorldTransportChannel.MULTI_MATERIALS
        },
        texture: {
            serialize: (tex: Texture | CubeTexture) => (tex as Texture).serialize(),
            deserialize: (data: any, scene: Scene) => Texture.Parse(data, scene, ""),
            update: (existing: Texture, updated: Texture) => updated,
            channel: E_WorldTransportChannel.TEXTURES
        },
        particlesystem: {
            serialize: (system: ParticleSystem) => system.serialize(),
            deserialize: (data: any, scene: Scene) => ParticleSystem.Parse(data, scene, ""),
            update: (existing: ParticleSystem, updated: ParticleSystem) => updated,
            channel: E_WorldTransportChannel.PARTICLE_SYSTEMS
        },
        shadowgenerator: {
            serialize: (gen: ShadowGenerator) => gen.serialize(),
            deserialize: (data: any, scene: Scene) => ShadowGenerator.Parse(data, scene),
            update: (existing: ShadowGenerator, updated: ShadowGenerator) => updated,
            channel: E_WorldTransportChannel.SHADOW_GENERATORS
        },
        skeleton: {
            serialize: (skel: Skeleton) => skel.serialize(),
            deserialize: (data: any, scene: Scene) => Skeleton.Parse(data, scene),
            update: (existing: Skeleton, updated: Skeleton) => updated,
            channel: E_WorldTransportChannel.SKELETONS
        },
        animation: {
            serialize: (anim: Animation) => anim.serialize(),
            deserialize: (data: any) => Animation.Parse(data),
            update: (existing: Animation, updated: Animation) => updated,
            channel: E_WorldTransportChannel.ANIMATIONS
        },
        animationgroup: {
            serialize: (group: AnimationGroup) => group.serialize(),
            deserialize: (data: any, scene: Scene) => AnimationGroup.Parse(data, scene),
            update: (existing: AnimationGroup, updated: AnimationGroup) => updated,
            channel: E_WorldTransportChannel.ANIMATION_GROUPS
        },
        sound: {
            serialize: (snd: Sound) => snd.serialize(),
            deserialize: (data: any, scene: Scene) => Sound.Parse(data, scene, ""),
            update: (existing: Sound, updated: Sound) => updated,
            channel: E_WorldTransportChannel.SOUNDS
        },
        reflectionprobe: {
            serialize: (probe: ReflectionProbe) => probe.serialize(),
            deserialize: (data: any, scene: Scene) => ReflectionProbe.Parse(data, scene, ""),
            update: (existing: ReflectionProbe, updated: ReflectionProbe) => updated,
            channel: E_WorldTransportChannel.REFLECTION_PROBES
        },
    };

    export const sendObjectUpdate = async (worldId: string, object: Node) => {
        const world = Agent.worldConnections[worldId];
        if (!world) {
            log(`${BABYLON_LOG_PREFIX} World ${worldId} not connected`, 'error');
            return;
        }

        const handler = handlers[object.getClassName().toLowerCase()];
        if (!handler) {
            log(`${BABYLON_LOG_PREFIX} Unsupported object type: ${object.getClassName()}`, 'error');
            return;
        }

        const serializedData = handler.serialize(object);

        try {
            const supabaseClient = Supabase.getSupabaseClient();
            if (!supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            await supabaseClient
                .from(handler.channel)
                .upsert({ id: object.id, data: serializedData }, { onConflict: 'id' });

            log(`${BABYLON_LOG_PREFIX} Sent update for object ${object.id} in world ${worldId}`, 'info');
        } catch (error) {
            log(`${BABYLON_LOG_PREFIX} Failed to send update for object ${object.id} in world ${worldId}: ${error}`, 'error');
        }
    };

    interface ObjectSyncCallbacks {
        onAdd?: (object: Node) => void;
        onUpdate?: (existingObjectId: string, updatedObject: Node) => void;
        onRemove?: (objectId: string) => void;
    }

    export const setupObjectSync = (worldId: string, scene: Scene, callbacks: ObjectSyncCallbacks = {}) => {
        const world = Agent.worldConnections[worldId];
        if (!world) {
            log(`${BABYLON_LOG_PREFIX} World ${worldId} not connected`, 'error');
            return;
        }

        Object.values(handlers).forEach((handler) => {
            Supabase.subscribeToTable(
                handler.channel,
                (payload) => handleObjectSync(worldId, scene, payload, handler, callbacks)
            );
        });

        log(`${BABYLON_LOG_PREFIX} Set up object sync for world ${worldId}`, 'info');
    };

    const handleObjectSync = (
        worldId: string,
        scene: Scene,
        payload: any,
        handler: ObjectHandler<any>,
        callbacks: ObjectSyncCallbacks
    ) => {
        const { eventType } = payload;
        const objectData = payload.new || payload.old;

        switch (eventType) {
            case "INSERT":
            case "UPDATE":
                handleObjectAddOrUpdate(worldId, scene, objectData, handler, callbacks);
                break;
            case "DELETE":
                handleObjectRemove(worldId, objectData.id, callbacks);
                break;
            default:
                log(`${BABYLON_LOG_PREFIX} Unknown event type: ${eventType}`, 'warn');
        }
    };

    const handleObjectAddOrUpdate = (
        worldId: string,
        scene: Scene,
        objectData: ObjectData,
        handler: ObjectHandler<any>,
        callbacks: ObjectSyncCallbacks
    ) => {
        const updatedObject = handler.deserialize(objectData.data, scene);

        if (scene.getNodeByID(objectData.id)) {
            // Update existing object
            if (callbacks.onUpdate) {
                callbacks.onUpdate(objectData.id, updatedObject);
            }
            log(`${BABYLON_LOG_PREFIX} Updated object ${objectData.id} in world ${worldId}`, 'info');
        } else {
            // Add new object
            if (callbacks.onAdd) {
                callbacks.onAdd(updatedObject);
            }
            log(`${BABYLON_LOG_PREFIX} Added new object ${objectData.id} to world ${worldId}`, 'info');
        }
    };

    const handleObjectRemove = (
        worldId: string,
        objectId: string,
        callbacks: ObjectSyncCallbacks
    ) => {
        if (callbacks.onRemove) {
            callbacks.onRemove(objectId);
        }
        log(`${BABYLON_LOG_PREFIX} Removed object ${objectId} from world ${worldId}`, 'info');
    };
}
