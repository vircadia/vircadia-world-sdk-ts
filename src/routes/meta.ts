/* eslint-disable no-unused-vars */
export enum E_PacketType {
    AGENT_Join = 'agent-agent-join-packet',
    AGENT_Offer = 'agent-agent-offer-packet',
    AGENT_Answer = 'agent-agent-answer-packet',
    AGENT_ICE_Candidate = 'agent-agent-ice-candidate-packet',
    AGENT_Heartbeat = 'world-agent-heartbeat-packet',
    WORLD_AgentList = 'world-agent-list-packet',
    AUDIO_Metadata = 'agent-agent-audio-metadata-packet',
}

export enum E_HTTPRoutes {
    REALTIME = '/realtime',
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
    REALTIME_API_URL: string | null;
    S3_STORAGE_URL: string | null;
}

interface I_BASE_Packet {
    type: E_PacketType;
    senderId: string | null;
    receiverId?: string | null;
}

export class C_AGENT_WorldHeartbeat_Packet implements I_BASE_Packet {
    type: E_PacketType.AGENT_Heartbeat = E_PacketType.AGENT_Heartbeat;
    senderId: string | null;

    constructor(data: { senderId: string | null }) {
        this.senderId = data.senderId;
    }
}

export class C_WORLD_AgentList_Packet implements I_BASE_Packet {
    type: E_PacketType.WORLD_AgentList = E_PacketType.WORLD_AgentList;
    senderId: string | null;
    agentList: string[];

    constructor(data: { senderId: string | null; agentList: string[] }) {
        this.senderId = data.senderId;
        this.agentList = data.agentList;
    }
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
