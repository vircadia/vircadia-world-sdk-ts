import { Supabase } from '../supabase/supabase.js';
import { E_AgentChannel, E_AgentEvent, AgentMetadata, Object, E_HTTPRequestPath } from '../../../routes/meta.js';
import { log } from '../../../modules/log.js';
import { Media } from './media.js';
import axios from 'axios';

export namespace Agent {
    const AGENT_LOG_PREFIX = '[AGENT]';

    export interface AgentConnection {
        rtcConnection: RTCPeerConnection | null;
        dataChannel: RTCDataChannel | null;
        mediaStream: MediaStream | null;
        metadata: AgentMetadata | null;
    }

    export interface WorldConnection {
        host: string;
        port: number;
        supabaseClient: any; // Replace with actual Supabase client type
        agentConnections: { [key: string]: AgentConnection };
        presenceUpdateInterval: ReturnType<typeof setInterval> | null;
    }

    export const worldConnections: { [key: string]: WorldConnection } = {};

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
            for (const worldId in worldConnections) {
                const world = worldConnections[worldId];
                const presenceChannel = world.supabaseClient?.channel(E_AgentChannel.AGENT_METADATA);
                if (presenceChannel?.state === 'joined') {
                    await presenceChannel.track({
                        agent_id: id,
                        position,
                        orientation,
                        online_at: new Date().toISOString(),
                    });
                }
            }
        };
    }

    export const connectToWorld = async (worldId: string, host: string, port: number) => {
        if (worldConnections[worldId]) {
            log(`${AGENT_LOG_PREFIX} Already connected to world ${worldId}`, 'warn');
            return;
        }

        try {
            const response = await axios.get<I_REQUEST_ConfigAndStatusResponse>(
                `${host}:${port}${E_HTTPRequestPath.CONFIG_AND_STATUS}`,
            );
            const serverConfigAndStatus = response.data;
            log(`Server status for world ${worldId}: ${JSON.stringify(serverConfigAndStatus)}`, 'info');

            const url = `${host}:${port}${serverConfigAndStatus.API_URL}`;
            const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
            const supabaseClient = Supabase.createSupabaseClient(url, key);

            worldConnections[worldId] = {
                host,
                port,
                supabaseClient,
                agentConnections: {},
                presenceUpdateInterval: null,
            };

            await setupWorldConnection(worldId);
            log(`${AGENT_LOG_PREFIX} Connected to world ${worldId}`, 'info');
        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Failed to connect to world ${worldId}: ${error}`, 'error');
        }
    };

    export const disconnectFromWorld = (worldId: string) => {
        const world = worldConnections[worldId];
        if (world) {
            if (world.presenceUpdateInterval) {
                clearInterval(world.presenceUpdateInterval);
            }
            Object.keys(world.agentConnections).forEach((agentId) => {
                removeAgent(worldId, agentId);
            });
            world.supabaseClient.disconnect();
            delete worldConnections[worldId];
            log(`${AGENT_LOG_PREFIX} Disconnected from world ${worldId}`, 'info');
        }
    };

    export const isConnectedToAnyWorld = () => Object.keys(worldConnections).length > 0;

    const setupWorldConnection = async (worldId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        try {
            await world.supabaseClient.connect();
            log(`${AGENT_LOG_PREFIX} Successfully connected to Supabase Realtime for world ${worldId}`, 'info');

            Metadata.setupAgentMetadataChannel(worldId);
            WebRTC.setupSignalingChannel(worldId);

            world.presenceUpdateInterval = setInterval(() => {
                void Self.updatePresence();
            }, 250); // TEMP_AUDIO_METADATA_INTERVAL

        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Failed to connect to Supabase Realtime for world ${worldId}: ${error}`, 'error');
        }
    };

    export const createAgent = async (worldId: string, agentId: string, metadata: AgentMetadata) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        world.agentConnections[agentId] = {
            rtcConnection: null,
            dataChannel: null,
            mediaStream: null,
            metadata,
        };
        log(`${AGENT_LOG_PREFIX} Created agent ${agentId} in world ${worldId}`);
        await WebRTC.createRTCConnection(worldId, agentId);
    };

    export const removeAgent = (worldId: string, agentId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        if (world.agentConnections[agentId]) {
            WebRTC.closeRTCConnection(worldId, agentId);
            Media.cleanupAgentAudio(agentId);
            delete world.agentConnections[agentId];
            log(`${AGENT_LOG_PREFIX} Removed agent ${agentId} from world ${worldId}`);
        }
    };

    export namespace Metadata {
        export const setupAgentMetadataChannel = (worldId: string) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            world.supabaseClient
                .channel(E_AgentChannel.AGENT_METADATA)
                .on('presence', { event: 'sync' }, () => {
                    const presenceChannel = world.supabaseClient.channel(E_AgentChannel.AGENT_METADATA);
                    const state = presenceChannel?.presenceState() ?? {};
                    handleAgentMetadataSync(worldId, state);
                })
                .subscribe();
        };

        export const handleAgentMetadataSync = (worldId: string, state: Record<string, any>) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            const currentAgents = Object.keys(state);

            // Handle removals
            Object.keys(world.agentConnections).forEach((agentId) => {
                if (!currentAgents.includes(agentId)) {
                    removeAgent(worldId, agentId);
                }
            });

            // Handle additions and updates
            currentAgents.forEach(async (agentId) => {
                if (agentId !== Self.id) {
                    try {
                        const agentData = state[agentId][0];
                        const metadata = AgentMetadata.fromObject({
                            agentId,
                            position: agentData.position,
                            orientation: agentData.orientation,
                            onlineAt: agentData.online_at,
                        });

                        if (!world.agentConnections[agentId]) {
                            await createAgent(worldId, agentId, metadata);
                        } else {
                            updateAgentMetadata(worldId, agentId, metadata);
                        }
                    } catch (error) {
                        console.error(`Invalid metadata for agent ${agentId} in world ${worldId}:`, error);
                    }
                }
            });

            log(`${AGENT_LOG_PREFIX} Updated agent list for world ${worldId}: ${currentAgents}`, 'info');
        };

        export const updateAgentMetadata = (worldId: string, agentId: string, metadata: AgentMetadata) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            if (world.agentConnections[agentId]) {
                world.agentConnections[agentId].metadata = metadata;
                log(`${AGENT_LOG_PREFIX} Updated metadata for agent ${agentId} in world ${worldId}`);
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

        export const setupSignalingChannel = (worldId: string) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            world.supabaseClient
                .channel(E_AgentChannel.SIGNALING_CHANNEL)
                .on('broadcast', { event: E_AgentEvent.AGENT_Offer }, (payload) => handleWebRTCOffer(worldId, payload.payload))
                .on('broadcast', { event: E_AgentEvent.AGENT_Answer }, (payload) => handleWebRTCAnswer(worldId, payload.payload))
                .on('broadcast', { event: E_AgentEvent.AGENT_ICE_Candidate }, (payload) => handleWebRTCIceCandidate(worldId, payload.payload))
                .subscribe();
        };

        export const createRTCConnection = async (worldId: string, agentId: string) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            const rtcConnection = new RTCPeerConnection({ iceServers: TEMP_ICE_SERVERS });
            world.agentConnections[agentId].rtcConnection = rtcConnection;

            setupRTCEventListeners(worldId, agentId, rtcConnection);
            createDataChannel(worldId, agentId, rtcConnection);
            await Media.addLocalStreamToConnection(agentId);
            await createAndSendOffer(worldId, agentId, rtcConnection);

            log(`${AGENT_LOG_PREFIX} Created RTC connection for agent ${agentId} in world ${worldId}`);
        };

        export const closeRTCConnection = (worldId: string, agentId: string) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            const connection = world.agentConnections[agentId];
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

        const setupRTCEventListeners = (worldId: string, agentId: string, rtcConnection: RTCPeerConnection) => {
            rtcConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await sendWebRTCSignal(worldId, {
                        type: E_AgentEvent.AGENT_ICE_Candidate,
                        candidate: event.candidate,
                        targetAgentId: agentId,
                    });
                }
            };

            rtcConnection.ontrack = async (event) => {
                log(`Received remote stream from agent ${agentId} in world ${worldId}`);
                await Media.handleIncomingStream({
                    stream: event.streams[0],
                    agentId,
                });
            };

            rtcConnection.onnegotiationneeded = async () => {
                log(`Negotiation needed for agent ${agentId} in world ${worldId}`);
                await createAndSendOffer(worldId, agentId, rtcConnection);
            };
        };

        const createDataChannel = (worldId: string, agentId: string, rtcConnection: RTCPeerConnection) => {
            const dataChannel = rtcConnection.createDataChannel('data');
            worldConnections[worldId].agentConnections[agentId].dataChannel = dataChannel;
            setupDataChannelListeners(worldId, agentId, dataChannel);
        };

        const createAndSendOffer = async (worldId: string, agentId: string, rtcConnection: RTCPeerConnection) => {
            const offer = await rtcConnection.createOffer();
            await rtcConnection.setLocalDescription(offer);
            await sendWebRTCSignal(worldId, {
                type: E_AgentEvent.AGENT_Offer,
                offer,
                targetAgentId: agentId,
            });
        };

        const setupDataChannelListeners = (worldId: string, agentId: string, dataChannel: RTCDataChannel) => {
            dataChannel.onopen = () => {
                log(`${AGENT_LOG_PREFIX} Data channel opened with agent ${agentId} in world ${worldId}`);
            };

            dataChannel.onclose = () => {
                log(`Data channel closed with agent ${agentId} in world ${worldId}`);
                const world = worldConnections[worldId];
                if (world && world.agentConnections[agentId]) {
                    world.agentConnections[agentId].dataChannel = null;
                }
            };

            // Add more data channel event listeners as needed
        };

        const sendWebRTCSignal = async (worldId: string, signal: any) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            await world.supabaseClient
                .channel(E_AgentChannel.SIGNALING_CHANNEL)
                .send({
                    type: 'broadcast',
                    event: signal.type,
                    payload: signal,
                });
        };

        export const handleWebRTCSignal = async (worldId: string, payload: any) => {
            switch (payload.type) {
                case E_AgentEvent.AGENT_Offer:
                    await handleWebRTCOffer(worldId, payload);
                    break;
                case E_AgentEvent.AGENT_Answer:
                    await handleWebRTCAnswer(worldId, payload);
                    break;
                case E_AgentEvent.AGENT_ICE_Candidate:
                    await handleWebRTCIceCandidate(worldId, payload);
                    break;
                default:
                    console.warn(`Unknown WebRTC signal type: ${payload.type}`);
            }
        };

        const handleWebRTCOffer = async (worldId: string, data: { offer: RTCSessionDescriptionInit; fromAgentId: string }) => {
            const { offer, fromAgentId } = data;
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            if (!world.agentConnections[fromAgentId]) {
                await createAgent(worldId, fromAgentId, new AgentMetadata(
                    fromAgentId,
                    new Object.Vector3(),
                    new Object.Vector3(),
                    new Date().toISOString()
                ));
            }

            const rtcConnection = world.agentConnections[fromAgentId].rtcConnection;
            if (rtcConnection) {
                await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await rtcConnection.createAnswer();
                await rtcConnection.setLocalDescription(answer);
                await sendWebRTCSignal(worldId, {
                    type: E_AgentEvent.AGENT_Answer,
                    answer,
                    targetAgentId: fromAgentId,
                });
            }
        };

        const handleWebRTCAnswer = async (worldId: string, data: { answer: RTCSessionDescriptionInit; fromAgentId: string }) => {
            const { answer, fromAgentId } = data;
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            const rtcConnection = world.agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleWebRTCIceCandidate = async (worldId: string, data: { candidate: RTCIceCandidateInit; fromAgentId: string }) => {
            const { candidate, fromAgentId } = data;
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            const rtcConnection = world.agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };
    }

    export const initialize = async (agentId: string) => {
        Self.updateId(agentId);
    };
}
