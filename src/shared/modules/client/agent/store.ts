import { makeAutoObservable } from 'mobx';
import { Agent as AgentMeta } from '../../vircadia-world-meta/meta/meta.ts';

class agentStore {
    world: AgentMeta.I_AgentWorldConnection | null = null;
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
