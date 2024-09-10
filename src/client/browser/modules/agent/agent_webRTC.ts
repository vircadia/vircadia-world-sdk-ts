import { Agent, AgentMeta, Primitive } from '../../../shared/meta.js';
import { WebRTC_Media } from './agent_webRTC_media.js';
import { log } from '../../../server/modules/general/log.js';

export namespace WebRTC {
    export const WEBRTC_LOG_PREFIX = '[WEBRTC]';

    // FIXME: These should be defined in config.
    const TEMP_ICE_SERVERS = [
        {
            urls: ['stun:stun.l.google.com:19302'],
        },
    ];

    export const createAgentConnection = (worldId: string, agentId: string, metadata: AgentMeta.C_Metadata): Agent.AgentConnection => {
        const rtcConnection = createRTCConnection(agentId);
        const dataChannel = createDataChannel(rtcConnection, 'data');

        return {
            rtcConnection,
            dataChannel,
            mediaStream: null,
            metadata,
            panner: null,
            audioUpdateInterval: null,
        };
    };

    export const createRTCConnection = (agentId: string): RTCPeerConnection => {
        const rtcConnection = new RTCPeerConnection({ iceServers: TEMP_ICE_SERVERS });
        return rtcConnection;
    };

    export const setupRTCEventListeners = (worldId: string, agentId: string) => {
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[agentId];
        if (!connection || !connection.rtcConnection) return;

        connection.rtcConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendWebRTCSignal(worldId, {
                    type: AgentMeta.E_SignalType.AGENT_ICE_Candidate,
                    payload: event.candidate,
                    targetAgentId: agentId,
                });
            }
        };

        connection.rtcConnection.ontrack = (event) => handleIncomingStream(worldId, agentId, event.streams[0]);
        connection.rtcConnection.onnegotiationneeded = () => createAndSendOffer(worldId, agentId);

        setupDataChannelListeners(
            connection.dataChannel,
            () => log(`${WEBRTC_LOG_PREFIX} Data channel opened with agent ${agentId} in world ${worldId}`),
            () => log(`${WEBRTC_LOG_PREFIX} Data channel closed with agent ${agentId} in world ${worldId}`),
            (event) => handleDataChannelMessage(worldId, agentId, event)
        );
    };

    export const createDataChannel = (rtcConnection: RTCPeerConnection, label: string): RTCDataChannel => rtcConnection.createDataChannel(label);

    export const setupDataChannelListeners = (
        dataChannel: RTCDataChannel | null,
        onOpen: () => void,
        onClose: () => void,
        onMessage: (event: MessageEvent) => void
    ) => {
        if (dataChannel) {
            dataChannel.onopen = onOpen;
            dataChannel.onclose = onClose;
            dataChannel.onmessage = onMessage;
        }
    };

    export const addLocalStreamsToConnection = (worldId: string, agentId: string) => {
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[agentId];
        if (!connection || !connection.rtcConnection) return;

        if (Agent.Self.localAudioStream) {
            WebRTC_Media.addStreamToConnection(connection.rtcConnection, Agent.Self.localAudioStream);
        }
        if (Agent.Self.localVideoStream) {
            WebRTC_Media.addStreamToConnection(connection.rtcConnection, Agent.Self.localVideoStream);
        }
    };

    export const createAndSendOffer = async (worldId: string, agentId: string) => {
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[agentId];
        if (!connection || !connection.rtcConnection) return;

        try {
            const offer = await createOffer(connection.rtcConnection);
            await sendWebRTCSignal(worldId, {
                type: AgentMeta.E_SignalType.AGENT_Offer,
                payload: offer,
                targetAgentId: agentId,
            });
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error creating and sending offer: ${error}`, 'error');
        }
    };

    export const removeAgentConnection = (worldId: string, agentId: string) => {
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[agentId];
        if (connection) {
            if (connection.rtcConnection) {
                closeRTCConnection(connection.rtcConnection);
            }
            if (connection.dataChannel) {
                connection.dataChannel.close();
            }
            if (connection.mediaStream) {
                connection.mediaStream.getTracks().forEach((track) => track.stop());
            }
            if (connection.panner) {
                WebRTC_Media.cleanupAudio(connection.panner);
            }
            if (connection.audioUpdateInterval) {
                clearInterval(connection.audioUpdateInterval);
            }
        }
    };

    export const handleWebRTCOffer = async (worldId: string, data: { offer: RTCSessionDescriptionInit; fromAgentId: string }) => {
        const { offer, fromAgentId } = data;
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[fromAgentId];
        if (!connection || !connection.rtcConnection) return;

        try {
            const answer = await handleOffer(connection.rtcConnection, offer);
            await sendWebRTCSignal(worldId, {
                type: AgentMeta.E_SignalType.AGENT_Answer,
                payload: answer,
                targetAgentId: fromAgentId,
            });
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error handling WebRTC offer: ${error}`, 'error');
        }
    };

    export const handleWebRTCAnswer = async (worldId: string, data: { answer: RTCSessionDescriptionInit; fromAgentId: string }) => {
        const { answer, fromAgentId } = data;
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[fromAgentId];
        if (!connection || !connection.rtcConnection) return;

        try {
            await handleAnswer(connection.rtcConnection, answer);
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error handling WebRTC answer: ${error}`, 'error');
        }
    };

    export const handleWebRTCIceCandidate = async (worldId: string, data: { candidate: RTCIceCandidateInit; fromAgentId: string }) => {
        const { candidate, fromAgentId } = data;
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        const connection = world.agentConnections[fromAgentId];
        if (!connection || !connection.rtcConnection) return;

        try {
            await handleIceCandidate(connection.rtcConnection, candidate);
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error handling ICE candidate: ${error}`, 'error');
        }
    };

    const createOffer = async (rtcConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
        const offer = await rtcConnection.createOffer();
        await rtcConnection.setLocalDescription(offer);
        return offer;
    };

    const handleOffer = async (
        rtcConnection: RTCPeerConnection,
        offer: RTCSessionDescriptionInit
    ): Promise<RTCSessionDescriptionInit> => {
        await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await rtcConnection.createAnswer();
        await rtcConnection.setLocalDescription(answer);
        return answer;
    };

    const handleAnswer = async (
        rtcConnection: RTCPeerConnection,
        answer: RTCSessionDescriptionInit
    ): Promise<void> => {
        await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async (
        rtcConnection: RTCPeerConnection,
        candidate: RTCIceCandidateInit
    ): Promise<void> => {
        await rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const closeRTCConnection = (rtcConnection: RTCPeerConnection): void => {
        rtcConnection.close();
    };

    const sendWebRTCSignal = async (worldId: string, signal: {
        type: AgentMeta.E_SignalType;
        payload: RTCSessionDescriptionInit | RTCIceCandidateInit | RTCIceCandidate;
        targetAgentId: string;
    }) => {
        const world = Agent.worldConnections[worldId];
        if (!world) return;

        try {
            await world.supabaseClient?.channel(AgentMeta.E_ChannelType.SIGNALING_CHANNEL)
                .send({
                    type: 'broadcast',
                    event: signal.type,
                    payload: signal,
                });
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error sending WebRTC signal: ${error}`, 'error');
        }
    };

    const handleIncomingStream = async (worldId: string, agentId: string, stream: MediaStream) => {
        const world = Agent.worldConnections[worldId];
        if (!world || !world.audioContext) return;

        const connection = world.agentConnections[agentId];
        if (!connection) return;

        connection.mediaStream = stream;

        try {
            await WebRTC_Media.resumeAudioContext(world.audioContext);
            const panner = WebRTC_Media.createPanner(world.audioContext);
            connection.panner = panner;

            WebRTC_Media.setupIncomingAudio(world.audioContext, stream, panner);

            connection.audioUpdateInterval = setInterval(() => {
                Agent.updateAgentAudioPosition(worldId, agentId);
            }, 100); // Update interval

            log(`${WEBRTC_LOG_PREFIX} Set up incoming audio for agent ${agentId} in world ${worldId}`);
        } catch (error) {
            log(`${WEBRTC_LOG_PREFIX} Error setting up incoming audio: ${error}`, 'error');
        }
    };

    const handleDataChannelMessage = (worldId: string, agentId: string, event: MessageEvent) => {
        // Handle incoming data channel messages
        log(`${WEBRTC_LOG_PREFIX} Received message from agent ${agentId} in world ${worldId}: ${event.data}`);
        // Implement your logic for handling different types of messages here
    };
}