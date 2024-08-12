/* eslint-disable no-unused-vars */
export enum E_AgentEvent {
    AGENT_Offer = 'agent-agent-offer-packet',
    AGENT_Answer = 'agent-agent-answer-packet',
    AGENT_ICE_Candidate = 'agent-agent-ice-candidate-packet',
    AGENT_JOINED = 'agent-joined',
    AGENT_LEFT = 'agent-left',
    AGENT_METADATA_UPDATED = 'agent-metadata-updated',
}

export enum E_AgentChannel {
    AGENT_METADATA = 'agent_metadata',
    SIGNALING_CHANNEL = 'signaling_channel',
}

export class AgentMetadata {
    constructor(
        public agentId: string,
        public position: Vector3,
        public orientation: Vector3,
        public onlineAt: string
    ) { }

    static fromObject(obj: any): AgentMetadata {
        if (typeof obj.agentId === 'string' && obj.position && obj.orientation && typeof obj.onlineAt === 'string') {
            return new AgentMetadata(
                obj.agentId,
                Object.Vector3.fromObject(obj.position),
                Object.Vector3.fromObject(obj.orientation),
                obj.onlineAt
            );
        }
        throw new Error('Invalid AgentMetadata data');
    }
}

export namespace Object {
    export class Vector3 {
        constructor(public x: number = 0, public y: number = 0, public z: number = 0) { }

        static fromObject(obj: any): Vector3 {
            if (typeof obj.x === 'number' && typeof obj.y === 'number' && typeof obj.z === 'number') {
                return new Vector3(obj.x, obj.y, obj.z);
            }
            throw new Error('Invalid Vector3 data');
        }
    }

}

export enum E_WorldTransportChannel {
    WORLD_METADATA = 'world_metadata',
    SCENES = 'scenes',
    CAMERAS = 'cameras',
    LIGHTS = 'lights',
    GEOMETRIES = 'geometries',
    MATERIALS = 'materials',
    MULTI_MATERIALS = 'multi_materials',
    PARTICLE_SYSTEMS = 'particle_systems',
    LENS_FLARE_SYSTEMS = 'lens_flare_systems',
    SHADOW_GENERATORS = 'shadow_generators',
    SKELETONS = 'skeletons',
    MORPH_TARGET_MANAGERS = 'morph_target_managers',
    MESHES = 'meshes',
    TRANSFORM_NODES = 'transform_nodes',
    SOUNDS = 'sounds',
    ATTACHED_SOUNDS = 'attached_sounds',
    ACTION_MANAGERS = 'action_managers',
    LAYERS = 'layers',
    TEXTURES = 'textures',
    REFLECTION_PROBES = 'reflection_probes',
    ANIMATIONS = 'animations',
    ANIMATION_GROUPS = 'animation_groups',
    ENVIRONMENT_TEXTURES = 'environment_textures',
    EFFECT_LAYERS = 'effect_layers',
    PROCEDURAL_TEXTURES = 'procedural_textures',
    SPRITES = 'sprites',
    SPRITE_MANAGERS = 'sprite_managers',
}

export enum E_HTTPRoute {
    API = '/api',
    GRAPHQL = '/graphql',
    STORAGE = '/storage',
    STUDIO = '/studio',
    INBUCKET = '/inbucket',
    DB = '/db',
}

export enum E_HTTPRequestPath {
    CONFIG_AND_STATUS = '/config-and-status',
}

export interface I_REQUEST_ConfigAndStatusResponse {
    API_URL: string | null;
    S3_STORAGE_URL: string | null;
}

