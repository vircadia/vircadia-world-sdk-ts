import { makeAutoObservable } from 'mobx';
import type { World_Client } from './world_client';
import { Agent } from '../../vircadia-world-meta/typescript/meta';

export interface I_AgentPeerConnection {
    rtcConnection: RTCPeerConnection | null;
    rtcConnectionOffer: RTCSessionDescriptionInit | null;
    rtcConnectionAnswer: RTCSessionDescriptionInit | null;
    rtcConnectionIceCandidate: RTCIceCandidateInit | null;
    rtcDataChannel: RTCDataChannel | null;
    incomingAudioMediaStream: MediaStream | null;
    incomingAudioMediaPanner: PannerNode | null;
    presence: Agent.C_Presence | null;
}

export interface I_AgentWorldConnection {
    host: string;
    port: number;
    worldClient: World_Client | null;
    agentPeerConnections: { [key: string]: I_AgentPeerConnection };
    presence: Agent.C_Presence;
    audioContext: AudioContext | null;
}

class agentStore {
    world: I_AgentWorldConnection | null = null;
    localAudioMediaStream: MediaStream | null = null;
    agentId: string | null = null;
    useWebRTC: boolean = false;
    useWebAudio: boolean = false;
    debugMode: boolean = false;
    iceServers: RTCIceServer[] = [];

    constructor() {
        makeAutoObservable(this);
    }
}

export const Agent_Store = new agentStore();
