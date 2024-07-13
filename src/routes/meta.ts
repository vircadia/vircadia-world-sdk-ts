export enum EPacketType {
    AGENT_Join = 'agent-agent-join-packet',
    AGENT_Offer = 'agent-agent-offer-packet',
    AGENT_Answer = 'agent-agent-answer-packet',
    AGENT_ICE_Candidate = 'agent-agent-ice-candidate-packet',
    AGENT_Heartbeat = 'world-agent-heartbeat-packet',
    WORLD_AgentList = 'world-agent-list-packet',
    AUDIO_Metadata = 'agent-agent-audio-metadata-packet',
}

interface I_BASE_Packet {
    type: EPacketType;
    senderId: string | null;
    receiverId?: string | null;
}

export class C_AGENT_WorldHeartbeat_Packet implements I_BASE_Packet {
    type: EPacketType.AGENT_Heartbeat = EPacketType.AGENT_Heartbeat;
    senderId: string | null;

    constructor(data: { senderId: string | null }) {
        this.senderId = data.senderId;
    }
}

export class C_WORLD_AgentList_Packet implements I_BASE_Packet {
    type: EPacketType.WORLD_AgentList = EPacketType.WORLD_AgentList;
    senderId: string | null;
    agentList: string[];

    constructor(data: { senderId: string | null; agentList: string[] }) {
        this.senderId = data.senderId;
        this.agentList = data.agentList;
    }
}

export class C_AUDIO_Metadata_Packet implements I_BASE_Packet {
    type: EPacketType.AUDIO_Metadata = EPacketType.AUDIO_Metadata;
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
