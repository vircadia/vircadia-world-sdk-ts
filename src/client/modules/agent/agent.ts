import { Supabase } from '../supabase/supabase.js';
import { E_AgentChannel, E_AgentEvent, AgentMetadata, Object } from '../../../routes/meta.js';
import { log } from '../../../modules/log.js';
import { Media } from './media.js';

export namespace Agent {
    const AGENT_LOG_PREFIX = '[AGENT]';

    export interface AgentConnection {
        rtcConnection: RTCPeerConnection | null;
        dataChannel: RTCDataChannel | null;
        mediaStream: MediaStream | null;
        metadata: AgentMetadata | null;
    }

    export const agentConnections: { [key: string]: AgentConnection } = {};

    // Our own agent data
    export namespace Self {
        export let id: string = '';
        export let position = new Object.Vector3();
        export let orientation = new Object.Vector3();

        export const updateId = (newId: typeof id) => {
            id = newId;
            void updatePresence();
        };

        export const updatePosition = (newPosition: Object.Vector3) => {
            position = newPosition;
            void updatePresence();
        };

        export const updateOrientation = (newOrientation: Object.Vector3) => {
            orientation = newOrientation;
            void updatePresence();
        };

        export const updatePresence = async () => {
            const presenceChannel = Supabase.getSupabaseClient()?.channel(E_AgentChannel.AGENT_METADATA);
            if (presenceChannel?.state === 'joined') {
                await presenceChannel.track({
                    agent_id: id,
                    position,
                    orientation,
                    online_at: new Date().toISOString(),
                });
            }
        };
    }

    export const createAgent = async (agentId: string, metadata: AgentMetadata) => {
        agentConnections[agentId] = {
            rtcConnection: null,
            dataChannel: null,
            mediaStream: null,
            metadata,
        };
        log(`${AGENT_LOG_PREFIX} Created agent ${agentId} in agent connections`);
        await WebRTC.createRTCConnection(agentId);
    };

    export const removeAgent = (agentId: string) => {
        if (agentConnections[agentId]) {
            WebRTC.closeRTCConnection(agentId);
            Media.cleanupAgentAudio(agentId);
            delete agentConnections[agentId];
            log(`${AGENT_LOG_PREFIX} Removed agent ${agentId} from agent connections`);
        }
    };

    export namespace Metadata {
        export const setupAgentMetadataChannel = () => {
            Supabase.getSupabaseClient()
                ?.channel(E_AgentChannel.AGENT_METADATA)
                .on('presence', { event: 'sync' }, () => {
                    const presenceChannel = Supabase.getSupabaseClient()?.channel(E_AgentChannel.AGENT_METADATA);
                    const state = presenceChannel?.presenceState() ?? {};
                    handleAgentMetadataSync(state);
                })
                .subscribe();
        };

        export const handleAgentMetadataSync = (state: Record<string, any>) => {
            const currentAgents = Object.keys(state);

            // Handle removals
            Object.keys(agentConnections).forEach((agentId) => {
                if (!currentAgents.includes(agentId)) {
                    removeAgent(agentId);
                }
            });

            // Handle additions and updates
            currentAgents.forEach(async (agentId) => {
                if (agentId !== Agent.Self.id) {
                    try {
                        const agentData = state[agentId][0];
                        const metadata = AgentMetadata.fromObject({
                            agentId,
                            position: agentData.position,
                            orientation: agentData.orientation,
                            onlineAt: agentData.online_at,
                        });

                        if (!agentConnections[agentId]) {
                            await createAgent(agentId, metadata);
                        } else {
                            updateAgentMetadata(agentId, metadata);
                        }
                    } catch (error) {
                        console.error(`Invalid metadata for agent ${agentId}:`, error);
                    }
                }
            });

            log(`${AGENT_LOG_PREFIX} Updated agent list: ${currentAgents}`, 'info');
        };

        export const updateAgentMetadata = (agentId: string, metadata: AgentMetadata) => {
            if (agentConnections[agentId]) {
                agentConnections[agentId].metadata = metadata;
                log(`${AGENT_LOG_PREFIX} Updated metadata for agent ${agentId}`);
            }
        };
    }

    export namespace WebRTC {
        // FIXME: These should be defined in config.
        const TEMP_ICE_SERVERS = [
            {
                urls: ['stun:stun.l.google.com:19302'],
            },
        ];

        export const setupSignalingChannel = () => {
            Supabase.getSupabaseClient()
                ?.channel(E_AgentChannel.SIGNALING_CHANNEL)
                .on('broadcast', { event: E_AgentEvent.AGENT_Offer }, (payload) => handleWebRTCOffer(payload.payload))
                .on('broadcast', { event: E_AgentEvent.AGENT_Answer }, (payload) => handleWebRTCAnswer(payload.payload))
                .on('broadcast', { event: E_AgentEvent.AGENT_ICE_Candidate }, (payload) => handleWebRTCIceCandidate(payload.payload))
                .subscribe();
        };

        export const createRTCConnection = async (agentId: string) => {
            const rtcConnection = new RTCPeerConnection({ iceServers: TEMP_ICE_SERVERS });
            agentConnections[agentId].rtcConnection = rtcConnection;

            setupRTCEventListeners(agentId, rtcConnection);
            createDataChannel(agentId, rtcConnection);
            await Media.addLocalStreamToConnection(agentId);
            await createAndSendOffer(agentId, rtcConnection);

            log(`${AGENT_LOG_PREFIX} Created RTC connection for agent ${agentId}`);
        };

        export const closeRTCConnection = (agentId: string) => {
            const connection = agentConnections[agentId];
            if (connection) {
                if (connection.rtcConnection) {
                    connection.rtcConnection.close();
                }
                if (connection.dataChannel) {
                    connection.dataChannel.close();
                }
                if (connection.mediaStream) {
                    connection.mediaStream.getTracks().forEach((track) => track.stop());
                }
            }
        };

        const setupRTCEventListeners = (agentId: string, rtcConnection: RTCPeerConnection) => {
            rtcConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await sendWebRTCSignal({
                        type: E_AgentEvent.AGENT_ICE_Candidate,
                        candidate: event.candidate,
                        targetAgentId: agentId,
                    });
                }
            };

            rtcConnection.ontrack = async (event) => {
                log(`Received remote stream from agent ${agentId}`);
                await Media.handleIncomingStream({
                    stream: event.streams[0],
                    agentId,
                });
            };

            rtcConnection.onnegotiationneeded = async () => {
                log(`Negotiation needed for agent ${agentId}`);
                await createAndSendOffer(agentId, rtcConnection);
            };
        };

        const createDataChannel = (agentId: string, rtcConnection: RTCPeerConnection) => {
            const dataChannel = rtcConnection.createDataChannel('data');
            agentConnections[agentId].dataChannel = dataChannel;
            setupDataChannelListeners(agentId, dataChannel);
        };

        const createAndSendOffer = async (agentId: string, rtcConnection: RTCPeerConnection) => {
            const offer = await rtcConnection.createOffer();
            await rtcConnection.setLocalDescription(offer);
            await sendWebRTCSignal({
                type: E_AgentEvent.AGENT_Offer,
                offer,
                targetAgentId: agentId,
            });
        };

        const setupDataChannelListeners = (agentId: string, dataChannel: RTCDataChannel) => {
            dataChannel.onopen = () => {
                log(`${AGENT_LOG_PREFIX} Data channel opened with agent ${agentId}`);
            };

            dataChannel.onclose = () => {
                log(`Data channel closed with agent ${agentId}`);
                if (agentConnections[agentId]) {
                    agentConnections[agentId].dataChannel = null;
                }
            };

            // Add more data channel event listeners as needed
        };

        const sendWebRTCSignal = async (signal: any) => {
            await Supabase.getSupabaseClient()
                ?.channel(E_AgentChannel.SIGNALING_CHANNEL)
                .send({
                    type: 'broadcast',
                    event: signal.type,
                    payload: signal,
                });
        };

        export const handleWebRTCSignal = async (payload: any) => {
            switch (payload.type) {
                case E_AgentEvent.AGENT_Offer:
                    await handleWebRTCOffer(payload);
                    break;
                case E_AgentEvent.AGENT_Answer:
                    await handleWebRTCAnswer(payload);
                    break;
                case E_AgentEvent.AGENT_ICE_Candidate:
                    await handleWebRTCIceCandidate(payload);
                    break;
                default:
                    console.warn(`Unknown WebRTC signal type: ${payload.type}`);
            }
        };

        const handleWebRTCOffer = async (data: { offer: RTCSessionDescriptionInit; fromAgentId: string }) => {
            const { offer, fromAgentId } = data;
            if (!agentConnections[fromAgentId]) {
                await createAgent(fromAgentId, new AgentMetadata(
                    fromAgentId,
                    new Object.Vector3(),
                    new Object.Vector3(),
                    new Date().toISOString()
                ));
            }

            const rtcConnection = agentConnections[fromAgentId].rtcConnection;
            if (rtcConnection) {
                await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await rtcConnection.createAnswer();
                await rtcConnection.setLocalDescription(answer);
                await sendWebRTCSignal({
                    type: E_AgentEvent.AGENT_Answer,
                    answer,
                    targetAgentId: fromAgentId,
                });
            }
        };

        const handleWebRTCAnswer = async (data: { answer: RTCSessionDescriptionInit; fromAgentId: string }) => {
            const { answer, fromAgentId } = data;
            const rtcConnection = agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleWebRTCIceCandidate = async (data: { candidate: RTCIceCandidateInit; fromAgentId: string }) => {
            const { candidate, fromAgentId } = data;
            const rtcConnection = agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };
    }

    export const initialize = (agentId: string) => {
        Agent.Self.updateId(agentId);
        Metadata.setupAgentMetadataChannel();
        WebRTC.setupSignalingChannel();
    };
}
