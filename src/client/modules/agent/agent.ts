import { Supabase } from '../providers/supabase/supabase.js';
import { SupabaseClient, REALTIME_PRESENCE_LISTEN_EVENTS, REALTIME_CHANNEL_STATES, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';
import { Agent as AgentMeta, Primitive, Server } from '../../../meta.js';
import { log } from '../../../server/modules/general/log.js';
import { WebRTC } from './agent_webRTC.js';
import { WebRTC_Media } from './agent_webRTC_media.js';
import axios from 'axios';

export namespace Agent {
    export const AGENT_LOG_PREFIX = '[AGENT]';
    const PRESENCE_UPDATE_INTERVAL = 250;
    const AUDIO_METADATA_UPDATE_INTERVAL = 100;

    export interface AgentConnection {
        rtcConnection: RTCPeerConnection | null;
        dataChannel: RTCDataChannel | null;
        mediaStream: MediaStream | null;
        metadata: AgentMeta.C_Metadata | null;
        panner: PannerNode | null;
        audioUpdateInterval: ReturnType<typeof setInterval> | null;
    }

    export interface WorldConnection {
        host: string;
        port: number;
        supabaseClient: SupabaseClient | null;
        agentConnections: { [key: string]: AgentConnection };
        presenceUpdateInterval: ReturnType<typeof setInterval> | null;
        position: Primitive.C_Vector3;
        orientation: Primitive.C_Vector3;
        audioContext: AudioContext | null;
    }

    interface AgentPresenceState {
        agent_id: string;
        position: Primitive.C_Vector3;
        orientation: Primitive.C_Vector3;
        online_at: string;
    }

    export const worldConnections: { [worldId: string]: WorldConnection } = {};

    // Our own agent data
    export namespace Self {
        export let id: string = '';
        export let localAudioStream: MediaStream | null = null;
        export let localVideoStream: MediaStream | null = null;

        export const updateId = (newId: typeof id) => {
            id = newId;
        };

        export const updatePosition = (worldId: string, newPosition: Primitive.C_Vector3) => {
            const world = worldConnections[worldId];
            if (world) {
                world.position = newPosition;
                void updatePresence(worldId);
            }
        };

        export const updateOrientation = (worldId: string, newOrientation: Primitive.C_Vector3) => {
            const world = worldConnections[worldId];
            if (world) {
                world.orientation = newOrientation;
                void updatePresence(worldId);
            }
        };

        export const updatePresence = async (worldId: string) => {
            const world = worldConnections[worldId];
            if (!world) {
                return;
            }

            try {
                const presenceChannel = world.supabaseClient?.channel(AgentMeta.E_ChannelType.AGENT_METADATA);
                if (presenceChannel?.state === 'joined') {
                    try {
                        const presenceData: AgentPresenceState = {
                            agent_id: id,
                            position: world.position,
                            orientation: world.orientation,
                            online_at: new Date().toISOString(),
                        };
                        await presenceChannel.track(presenceData);
                    } catch (error) {
                        log(`${AGENT_LOG_PREFIX} Failed to update presence for world ${worldId}: ${error}`, 'error');
                    }
                } else {
                    log(`${AGENT_LOG_PREFIX} Presence channel not joined for world ${worldId}, skipping update`, 'warn');
                }
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error updating presence for world ${worldId}: ${error}`, 'error');
            }
        };

        export const initializeLocalStreams = async () => {
            try {
                localAudioStream = await WebRTC_Media.createLocalStream({ audio: true });
                localVideoStream = await WebRTC_Media.createLocalStream({ video: true });
                log(`${AGENT_LOG_PREFIX} Local audio and video streams initialized`);
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error initializing local streams: ${error}`, 'error');
            }
        };
    }

    export const connectToWorld = async (worldId: string, host: string, port: number) => {
        if (worldConnections[worldId]) {
            log(`${AGENT_LOG_PREFIX} Already connected to world ${worldId}`, 'warn');
            return;
        }

        try {
            const response = await axios.get<Server.I_REQUEST_ConfigAndStatusResponse>(
                `${host}:${port}${Server.E_HTTPRequestPath.CONFIG_AND_STATUS}`,
            );
            const serverConfigAndStatus = response.data;
            log(`Server status for world ${worldId}: ${JSON.stringify(serverConfigAndStatus)}`, 'info');

            const url = `${host}:${port}${serverConfigAndStatus.API_URL}`;
            const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
            const supabaseClient = Supabase.initializeSupabaseClient(url, key);

            // Double-checked locking
            if (!worldConnections[worldId]) {
                const newWorldConnection: WorldConnection = {
                    host,
                    port,
                    supabaseClient,
                    agentConnections: {},
                    presenceUpdateInterval: null,
                    position: new Primitive.C_Vector3(),
                    orientation: new Primitive.C_Vector3(),
                    audioContext: WebRTC_Media.createAudioContext(),
                };

                worldConnections[worldId] = newWorldConnection;

                setupWorldConnection(worldId);
                log(`${AGENT_LOG_PREFIX} Connected to world ${worldId}`, 'info');
            } else {
                log(`${AGENT_LOG_PREFIX} World ${worldId} was connected by another process`, 'warn');
            }
        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Failed to connect to world ${worldId}: ${error}`, 'error');
        }
    };

    export const disconnectFromWorld = async (worldId: string) => {
        const world = worldConnections[worldId];
        if (world) {
            if (world.presenceUpdateInterval) {
                clearInterval(world.presenceUpdateInterval);
            }
            Object.keys(world.agentConnections).forEach((agentId) => {
                removeAgent(worldId, agentId);
            });
            await world.supabaseClient?.removeAllChannels();
            if (world.audioContext) {
                await world.audioContext.close();
            }
            delete worldConnections[worldId];
            log(`${AGENT_LOG_PREFIX} Disconnected from world ${worldId}`, 'info');
        }
    };

    export const isConnectedToAnyWorld = () => Object.keys(worldConnections).length > 0;

    const setupWorldConnection = (worldId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        try {
            world.supabaseClient?.channel(AgentMeta.E_ChannelType.AGENT_METADATA)
                .on('presence', { event: 'sync' }, () => {
                    const presenceChannel = world.supabaseClient?.channel(AgentMeta.E_ChannelType.AGENT_METADATA);
                    const state = presenceChannel?.presenceState() ?? {};
                    handleAgentMetadataSync(worldId, state as unknown as Record<string, AgentPresenceState[]>);
                })
                .subscribe();
            world.supabaseClient?.channel(AgentMeta.E_ChannelType.SIGNALING_CHANNEL)
                .on(REALTIME_LISTEN_TYPES.BROADCAST, { event: AgentMeta.E_SignalType.AGENT_Offer }, (payload) => handleWebRTCOffer(worldId, payload.payload))
                .on(REALTIME_LISTEN_TYPES.BROADCAST, { event: AgentMeta.E_SignalType.AGENT_Answer }, (payload) => handleWebRTCAnswer(worldId, payload.payload))
                .on(REALTIME_LISTEN_TYPES.BROADCAST, { event: AgentMeta.E_SignalType.AGENT_ICE_Candidate }, (payload) => handleWebRTCIceCandidate(worldId, payload.payload))
                .subscribe();
            log(`${AGENT_LOG_PREFIX} Successfully connected to Supabase Realtime for world ${worldId}`, 'info');

            world.presenceUpdateInterval = setInterval(() => {
                void Self.updatePresence(worldId);
            }, PRESENCE_UPDATE_INTERVAL);

        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Failed to connect to Supabase Realtime for world ${worldId}: ${error}`, 'error');
        }
    };

    export const createAgent = async (worldId: string, agentId: string, metadata: AgentMeta.C_Metadata) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const rtcConnection = WebRTC.createRTCConnection(agentId);
        const dataChannel = WebRTC.createDataChannel(rtcConnection, 'data');

        world.agentConnections[agentId] = {
            rtcConnection,
            dataChannel,
            mediaStream: null,
            metadata,
            panner: null,
            audioUpdateInterval: null,
        };

        WebRTC.setupRTCEventListeners(
            rtcConnection,
            (candidate) => sendWebRTCSignal(worldId, {
                type: AgentMeta.E_SignalType.AGENT_ICE_Candidate,
                payload: candidate,
                targetAgentId: agentId,
            }),
            (event) => handleIncomingStream(worldId, agentId, event.streams[0]),
            () => createAndSendOffer(worldId, agentId)
        );

        WebRTC.setupDataChannelListeners(
            dataChannel,
            () => log(`${AGENT_LOG_PREFIX} Data channel opened with agent ${agentId} in world ${worldId}`),
            () => log(`${AGENT_LOG_PREFIX} Data channel closed with agent ${agentId} in world ${worldId}`),
            (event) => handleDataChannelMessage(worldId, agentId, event)
        );

        addLocalStreamsToConnection(worldId, agentId);

        log(`${AGENT_LOG_PREFIX} Created agent ${agentId} in world ${worldId}`);
        await createAndSendOffer(worldId, agentId);
    };

    export const removeAgent = (worldId: string, agentId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[agentId];
        if (connection) {
            if (connection.rtcConnection) {
                WebRTC.closeRTCConnection(connection.rtcConnection);
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
            delete world.agentConnections[agentId];
            log(`${AGENT_LOG_PREFIX} Removed agent ${agentId} from world ${worldId}`);
        }
    };

    const handleAgentMetadataSync = (worldId: string, state: Record<string, AgentPresenceState[]>) => {
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
                    const metadata: AgentMeta.C_Metadata = {
                        agentId: agentData.agent_id,
                        position: agentData.position,
                        orientation: agentData.orientation,
                        onlineAt: agentData.online_at,
                    };

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

    const updateAgentMetadata = (worldId: string, agentId: string, metadata: AgentMeta.C_Metadata) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        if (world.agentConnections[agentId]) {
            world.agentConnections[agentId].metadata = metadata;
            log(`${AGENT_LOG_PREFIX} Updated metadata for agent ${agentId} in world ${worldId}`);
        }
    };

    const addLocalStreamsToConnection = (worldId: string, agentId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[agentId];
        if (connection && connection.rtcConnection) {
            if (Self.localAudioStream) {
                WebRTC_Media.addStreamToConnection(connection.rtcConnection, Self.localAudioStream);
            }
            if (Self.localVideoStream) {
                WebRTC_Media.addStreamToConnection(connection.rtcConnection, Self.localVideoStream);
            }
        }
    };

    const createAndSendOffer = async (worldId: string, agentId: string) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[agentId];
        if (connection && connection.rtcConnection) {
            try {
                const offer = await WebRTC.createOffer(connection.rtcConnection);
                await sendWebRTCSignal(worldId, {
                    type: AgentMeta.E_SignalType.AGENT_Offer,
                    payload: offer,
                    targetAgentId: agentId,
                });
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error creating and sending offer: ${error}`, 'error');
            }
        }
    };

    const handleWebRTCOffer = async (worldId: string, data: { offer: RTCSessionDescriptionInit; fromAgentId: string }) => {
        const { offer, fromAgentId } = data;
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[fromAgentId];
        if (connection && connection.rtcConnection) {
            try {
                const answer = await WebRTC.handleOffer(connection.rtcConnection, offer);
                await sendWebRTCSignal(worldId, {
                    type: AgentMeta.E_SignalType.AGENT_Answer,
                    payload: answer,
                    targetAgentId: fromAgentId,
                });
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error handling WebRTC offer: ${error}`, 'error');
            }
        }
    };

    const handleWebRTCAnswer = async (worldId: string, data: { answer: RTCSessionDescriptionInit; fromAgentId: string }) => {
        const { answer, fromAgentId } = data;
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[fromAgentId];
        if (connection && connection.rtcConnection) {
            try {
                await WebRTC.handleAnswer(connection.rtcConnection, answer);
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error handling WebRTC answer: ${error}`, 'error');
            }
        }
    };

    const handleWebRTCIceCandidate = async (worldId: string, data: { candidate: RTCIceCandidateInit; fromAgentId: string }) => {
        const { candidate, fromAgentId } = data;
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        const connection = world.agentConnections[fromAgentId];
        if (connection && connection.rtcConnection) {
            try {
                await WebRTC.handleIceCandidate(connection.rtcConnection, candidate);
            } catch (error) {
                log(`${AGENT_LOG_PREFIX} Error handling ICE candidate: ${error}`, 'error');
            }
        }
    };

    const sendWebRTCSignal = async (worldId: string, signal: {
        type: AgentMeta.E_SignalType;
        payload: RTCSessionDescriptionInit | RTCIceCandidateInit | RTCIceCandidate;
        targetAgentId: string;
    }) => {
        const world = worldConnections[worldId];
        if (!world) {
            return;
        }

        try {
            await world.supabaseClient?.channel(AgentMeta.E_ChannelType.SIGNALING_CHANNEL)
                .send({
                    type: REALTIME_LISTEN_TYPES.BROADCAST,
                    event: signal.type,
                    payload: signal,
                });
        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Error sending WebRTC signal: ${error}`, 'error');
        }
    };

    const handleIncomingStream = async (worldId: string, agentId: string, stream: MediaStream) => {
        const world = worldConnections[worldId];
        if (!world || !world.audioContext) {
            return;
        }

        const connection = world.agentConnections[agentId];
        if (!connection) {
            return;
        }

        connection.mediaStream = stream;

        try {
            await WebRTC_Media.resumeAudioContext(world.audioContext);
            const panner = WebRTC_Media.createPanner(world.audioContext);
            connection.panner = panner;

            WebRTC_Media.setupIncomingAudio(world.audioContext, stream, panner);

            connection.audioUpdateInterval = setInterval(() => {
                updateAgentAudioPosition(worldId, agentId);
            }, AUDIO_METADATA_UPDATE_INTERVAL);

            log(`${AGENT_LOG_PREFIX} Set up incoming audio for agent ${agentId} in world ${worldId}`);
        } catch (error) {
            log(`${AGENT_LOG_PREFIX} Error setting up incoming audio: ${error}`, 'error');
        }
    };

    const updateAgentAudioPosition = (worldId: string, agentId: string) => {
        const world = worldConnections[worldId];
        if (!world || !world.audioContext) {
            return;
        }

        const connection = world.agentConnections[agentId];
        if (!connection || !connection.panner || !connection.metadata) {
            return;
        }

        const agentPosition = connection.metadata.position;
        const agentOrientation = connection.metadata.orientation;

        WebRTC_Media.updateAudioPosition(
            connection.panner,
            world.audioContext,
            {
                x: agentPosition.x - world.position.x,
                y: agentPosition.y - world.position.y,
                z: agentPosition.z - world.position.z,
            },
            {
                x: agentOrientation.x - world.orientation.x,
                y: agentOrientation.y - world.orientation.y,
                z: agentOrientation.z - world.orientation.z,
            }
        );
    };

    const handleDataChannelMessage = (worldId: string, agentId: string, event: MessageEvent) => {
        // Handle incoming data channel messages
        log(`${AGENT_LOG_PREFIX} Received message from agent ${agentId} in world ${worldId}: ${event.data}`);
        // Implement your logic for handling different types of messages here
    };
}
