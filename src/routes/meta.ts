export enum EPacketType {
    AGENT_Heartbeat = 'world-agent-heartbeat-packet',
    WORLD_AgentList = 'world-agent-list-packet',
    AGENT_Offer = 'agent-offer-packet',
    AGENT_Answer = 'agent-answer-packet',
    AGENT_Candidate = 'agent-candidate-packet',
    AUDIO = 'audio-packet',
}

interface I_BASE_Packet {
    type: EPacketType;
    senderId: string | null;
    receiverId?: string | null;
}

export class C_AGENT_Offer_Packet implements I_BASE_Packet {
    type: EPacketType.AGENT_Offer = EPacketType.AGENT_Offer;
    senderId: string | null;
    receiverId?: string | null;
    sdp: string;

    constructor(data: { senderId: string | null; sdp: string }) {
        this.senderId = data.senderId;
        this.sdp = data.sdp;
    }
}

export class C_AGENT_Answer_Packet implements I_BASE_Packet {
    type: EPacketType.AGENT_Answer = EPacketType.AGENT_Answer;
    senderId: string | null;
    receiverId?: string | null;
    sdp: string;

    constructor(data: { senderId: string | null; sdp: string }) {
        this.senderId = data.senderId;
        this.sdp = data.sdp;
    }
}

export class C_AGENT_Candidate_Packet implements I_BASE_Packet {
    type: EPacketType.AGENT_Candidate = EPacketType.AGENT_Candidate;
    senderId: string | null;
    receiverId?: string | null;
    candidate: RTCIceCandidateInit;

    constructor(data: {
        senderId: string | null;
        candidate: RTCIceCandidateInit;
    }) {
        this.senderId = data.senderId;
        this.candidate = data.candidate;
    }
}

export class C_AGENT_Heartbeat_Packet implements I_BASE_Packet {
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

export class C_AUDIO_Packet implements I_BASE_Packet {
    type: EPacketType.AUDIO = EPacketType.AUDIO;
    audioData: ArrayBuffer | null;
    audioPosition: {
        x: number | null;
        y: number | null;
        z: number | null;
    };

    audioOrientation: {
        x: number | null;
        y: number | null;
        z: number | null;
    };

    senderId: string | null;

    constructor(data: {
        audioData: ArrayBuffer | null;
        audioPosition: { x: number | null; y: number | null; z: number | null };
        audioOrientation: {
            x: number | null;
            y: number | null;
            z: number | null;
        };
        senderId: string | null;
    }) {
        this.audioData = data.audioData;
        this.audioPosition = data.audioPosition;
        this.audioOrientation = data.audioOrientation;
        this.senderId = data.senderId;
    }
}
