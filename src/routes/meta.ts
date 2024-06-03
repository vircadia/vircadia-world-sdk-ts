export enum EPacketType {
    WORLD_Maintain = 'world-maintain-packet',
    PEER_Offer = 'peer-offer-packet',
    PEER_Answer = 'peer-answer-packet',
    PEER_Candidate = 'peer-candidate-packet',
    AUDIO = 'audio-packet',
}

interface IBasePacket {
    type: EPacketType;
    senderId: string | null;
    receiverId?: string | null;
}

export class C_PEER_Offer_Packet implements IBasePacket {
    type: EPacketType.PEER_Offer = EPacketType.PEER_Offer;
    senderId: string | null;
    receiverId?: string | null;
    sdp: string;

    constructor(data: { senderId: string | null; sdp: string }) {
        this.senderId = data.senderId;
        this.sdp = data.sdp;
    }
}

export class C_PEER_Answer_Packet implements IBasePacket {
    type: EPacketType.PEER_Answer = EPacketType.PEER_Answer;
    senderId: string | null;
    receiverId?: string | null;
    sdp: string;

    constructor(data: { senderId: string | null; sdp: string }) {
        this.senderId = data.senderId;
        this.sdp = data.sdp;
    }
}

export class C_PEER_Candidate_Packet implements IBasePacket {
    type: EPacketType.PEER_Candidate = EPacketType.PEER_Candidate;
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

export class C_WORLD_Maintain_Packet implements IBasePacket {
    type: EPacketType.WORLD_Maintain = EPacketType.WORLD_Maintain;
    senderId: string | null;

    constructor(data: { senderId: string | null }) {
        this.senderId = data.senderId;
    }
}

export class C_AUDIO_Packet implements IBasePacket {
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
