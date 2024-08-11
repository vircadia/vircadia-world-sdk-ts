/* eslint-disable no-unused-vars */
export enum E_PacketType {
    AGENT_Join = 'agent-agent-join-packet',
    AGENT_Offer = 'agent-agent-offer-packet',
    AGENT_Answer = 'agent-agent-answer-packet',
    AGENT_ICE_Candidate = 'agent-agent-ice-candidate-packet',
    AUDIO_Metadata = 'agent-agent-audio-metadata-packet',
}

export enum E_WorldTransportChannels {
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

export enum E_AgentChannels {
    AGENT_METADATA = 'agent_metadata',
    SIGNALING_CHANNEL = 'signaling_channel',
}

export enum E_HTTPRoutes {
    API = '/api',
    GRAPHQL = '/graphql',
    STORAGE = '/storage',
    STUDIO = '/studio',
    INBUCKET = '/inbucket',
    DB = '/db',
}

export enum E_RequestType {
    CONFIG_AND_STATUS = '/config-and-status',
}

export interface I_REQUEST_ConfigAndStatusResponse {
    API_URL: string | null;
    S3_STORAGE_URL: string | null;
}

interface I_BASE_Packet {
    type: E_PacketType;
    senderId: string | null;
    receiverId?: string | null;
}

export class C_AUDIO_Metadata_Packet implements I_BASE_Packet {
    type: E_PacketType.AUDIO_Metadata = E_PacketType.AUDIO_Metadata;
    audioPosition: {
        x: number;
        y: number;
        z: number;
    } | null;

    audioOrientation: {
        x: number;
        y: number;
        z: number;
    } | null;

    senderId: string | null;

    constructor(data: {
        audioPosition: { x: number; y: number; z: number };
        audioOrientation: {
            x: number;
            y: number;
            z: number;
        };
        senderId: string | null;
    }) {
        this.audioPosition = data.audioPosition;
        this.audioOrientation = data.audioOrientation;
        this.senderId = data.senderId;
    }
}
