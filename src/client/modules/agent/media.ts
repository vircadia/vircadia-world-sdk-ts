import { log } from "../../../modules/log.js";
import { Supabase } from '../supabase/supabase.js';
import { E_AgentChannel, Object } from '../../../routes/meta.js';
import { Agent } from './agent.js';

export namespace Media {
    const MEDIA_LOG_PREFIX = '[MEDIA]';
    const AUDIO_METADATA_UPDATE_INTERVAL = 100; // ms

    let audioContext: AudioContext | null = null;
    let localAudioStream: MediaStream | null = null;
    let localVideoStream: MediaStream | null = null;

    const activePanners: { [agentId: string]: { panner: PannerNode, intervalId: number } } = {};

    export const InitializeMediaModule = () => {
        audioContext = new AudioContext();
    };

    export const updateLocalStream = async (data: {
        newStream: MediaStream;
        kind: 'video' | 'audio';
    }) => {
        if (data.kind === 'audio') {
            localAudioStream = data.newStream;
            await setupAudioContext(data.newStream);
        } else if (data.kind === 'video') {
            localVideoStream = data.newStream;
        }

        updateRTCConnections(data);

        log(`${MEDIA_LOG_PREFIX} Updated local ${data.kind} stream for all RTCPeerConnections.`);
    };

    const setupAudioContext = async (stream: MediaStream) => {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
            log(`${MEDIA_LOG_PREFIX} Resumed OUTGOING audio context.`);
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.warn(`${MEDIA_LOG_PREFIX} No audio tracks found in the stream.`);
        } else {
            audioTracks.forEach((track) => {
                track.enabled = true;
                log(`${MEDIA_LOG_PREFIX} Audio track: ${track}`, 'info');
            });
        }
    };

    const updateRTCConnections = (data: { newStream: MediaStream; kind: 'video' | 'audio' }) => {
        Object.values(Agent.agentConnections).forEach((connection) => {
            if (connection.rtcConnection) {
                const senders = connection.rtcConnection.getSenders();
                senders.forEach(async (sender) => {
                    if (sender.track && sender.track.kind === data.kind) {
                        const newTrack = data.newStream.getTracks().find((track) => track.kind === data.kind);
                        if (newTrack) {
                            await sender.replaceTrack(newTrack);
                            log(`${MEDIA_LOG_PREFIX} Updated ${data.kind} track for sender.`);
                        }
                    }
                });
            }
        });
    };

    export const getLocalStream = (data: { kind: 'video' | 'audio' }): MediaStream | null => (data.kind === 'video' ? localVideoStream : localAudioStream);

    export const addLocalStreamToConnection = (agentId: string) => {
        const connection = Agent.agentConnections[agentId];
        if (connection && connection.rtcConnection) {
            if (localAudioStream) {
                localAudioStream.getTracks().forEach((track) => {
                    connection.rtcConnection!.addTrack(track, localAudioStream!);
                });
            }
            if (localVideoStream) {
                localVideoStream.getTracks().forEach((track) => {
                    connection.rtcConnection!.addTrack(track, localVideoStream!);
                });
            }
            log(`${MEDIA_LOG_PREFIX} Added local streams to connection for agent ${agentId}`);
        }
    };

    export const handleIncomingStream = async (data: { stream: MediaStream; agentId: string }) => {
        const agentConnection = Agent.agentConnections[data.agentId];
        if (!agentConnection) {
            console.warn(`${MEDIA_LOG_PREFIX} No agent connection found for ${data.agentId}`);
            return;
        }

        agentConnection.mediaStream = data.stream;

        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioContext();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            log(`${MEDIA_LOG_PREFIX} Resumed INCOMING audio context.`);
        }

        const audioTracks = data.stream.getAudioTracks();
        log(`${MEDIA_LOG_PREFIX} Received ${audioTracks.length} audio tracks from agent ${data.agentId}`);

        if (audioTracks.length === 0) {
            console.warn(`${MEDIA_LOG_PREFIX} No audio tracks in the incoming stream from agent ${data.agentId}`);
            return;
        }

        const audioSource = audioContext.createMediaStreamSource(data.stream);
        const panner = createPanner(audioContext);
        audioSource.connect(panner);
        panner.connect(audioContext.destination);

        log(`${MEDIA_LOG_PREFIX} Connected incoming audio stream from agent ${data.agentId}`);

        startAudioPositionUpdateInterval(data.agentId, panner);
    };

    const createPanner = (context: AudioContext): PannerNode => {
        const panner = context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        return panner;
    };

    const startAudioPositionUpdateInterval = (agentId: string, panner: PannerNode) => {
        const intervalId = setInterval(() => {
            if (audioContext && audioContext.state === 'running' && panner) {
                updateAudioPosition(agentId, panner);
            } else {
                clearInterval(intervalId);
                log(`${MEDIA_LOG_PREFIX} Cleared interval for agent ${agentId} as the audio context is not available.`);
            }
        }, AUDIO_METADATA_UPDATE_INTERVAL);

        activePanners[agentId] = { panner, intervalId };
    };

    const updateAudioPosition = (agentId: string, panner: PannerNode) => {
        const presenceChannel = Supabase.getSupabaseClient()?.channel(E_AgentChannel.AGENT_METADATA);
        const state = presenceChannel?.presenceState() ?? {};
        const agentPresence = state[agentId]?.[0];
        const ourPresence = state[Agent.Self.id]?.[0];

        if (agentPresence && ourPresence) {
            const audioPosition = Object.Vector3.fromObject(agentPresence.position);
            const audioOrientation = Object.Vector3.fromObject(agentPresence.orientation);
            const ourPosition = Object.Vector3.fromObject(ourPresence.position);
            const ourOrientation = Object.Vector3.fromObject(ourPresence.orientation);

            const relativePosition = new Object.Vector3(
                audioPosition.x - ourPosition.x,
                audioPosition.y - ourPosition.y,
                audioPosition.z - ourPosition.z
            );

            panner.positionX.setValueAtTime(relativePosition.x, audioContext!.currentTime);
            panner.positionY.setValueAtTime(relativePosition.y, audioContext!.currentTime);
            panner.positionZ.setValueAtTime(relativePosition.z, audioContext!.currentTime);

            const relativeOrientation = new Object.Vector3(
                audioOrientation.x - ourOrientation.x,
                audioOrientation.y - ourOrientation.y,
                audioOrientation.z - ourOrientation.z
            );

            panner.orientationX.setValueAtTime(relativeOrientation.x, audioContext!.currentTime);
            panner.orientationY.setValueAtTime(relativeOrientation.y, audioContext!.currentTime);
            panner.orientationZ.setValueAtTime(relativeOrientation.z, audioContext!.currentTime);
        } else {
            console.warn(`${MEDIA_LOG_PREFIX} No presence data available for agent ${agentId} or current agent`);
        }
    };

    export const cleanupAgentAudio = (agentId: string) => {
        const activePanner = activePanners[agentId];
        if (activePanner) {
            clearInterval(activePanner.intervalId);
            activePanner.panner.disconnect();
            delete activePanners[agentId];
            log(`${MEDIA_LOG_PREFIX} Cleaned up audio resources for agent ${agentId}`);
        }
    };
}
