import axios from 'axios';
import { Supabase } from './modules/supabase/supabase.js';
import { REALTIME_CHANNEL_STATES } from '@supabase/supabase-js';
import {
    E_RequestType,
    E_AgentChannels,
    C_AUDIO_Metadata_Packet,
    I_REQUEST_ConfigAndStatusResponse,
} from '../routes/meta.js';
import { log } from '../modules/log.js';

// FIXME: These should be defined in config.
const TEMP_ICE_SERVERS = [
    {
        urls: ['stun:stun.l.google.com:19302'],
    },
];

const TEMP_AUDIO_METADATA_INTERVAL = 250;

export namespace Client {
    let serverConfigAndStatus: I_REQUEST_ConfigAndStatusResponse | null = null;

    let host: string | null = null;
    let port: number | null = null;

    let TEMP_agentId: string | null = null;
    let TEMP_position: {
        x: number;
        y: number;
        z: number;
    } | null = null;
    let TEMP_orientation: {
        x: number;
        y: number;
        z: number;
    } | null = null;

    export const TEMP_updateMetadataLocally = (metadata: {
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number };
    }) => {
        TEMP_position = metadata.position;
        TEMP_orientation = metadata.orientation;

        void Agent.updatePresence();
    };

    export const worldConnected = () => Supabase.getSupabaseClient() !== null;

    export namespace Setup {
        let presenceUpdateInterval: ReturnType<typeof setInterval> | null =
            null;

        export const InitializeWorldModule = async (data: {
            host: string;
            port: number;
            agentId: string;
        }) => {
            // Retrieve the status.
            try {
                const response =
                    await axios.get<I_REQUEST_ConfigAndStatusResponse>(
                        `${data.host}:${data.port}${E_RequestType.CONFIG_AND_STATUS}`,
                    );
                serverConfigAndStatus = response.data;
                console.log('Server status:', serverConfigAndStatus);
            } catch (error) {
                console.error('Failed to retrieve server status:', error);
            }

            TEMP_agentId = data.agentId;

            if (Supabase.getSupabaseClient()) {
                console.log('Already connected to Supabase.');
                return;
            }

            host = data.host;
            port = data.port;

            // Initialize Supabase client
            if (serverConfigAndStatus && serverConfigAndStatus.API_URL) {
                const url = `${data.host}:${data.port}${serverConfigAndStatus.API_URL}`;
                const key = 'your-supabase-anon-key'; // Replace with your actual key
                Supabase.initializeSupabaseClient(url, key);

                try {
                    await Supabase.connectRealtime();
                    console.log('Successfully connected to Supabase Realtime');

                    // Set up presence channel
                    const presenceChannel =
                        Supabase.getSupabaseClient()?.channel(
                            E_AgentChannels.AGENT_METADATA,
                        );

                    // Subscribe to the channel first
                    presenceChannel?.subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            // Only track presence after successful subscription
                            await presenceChannel.track({
                                agent_id: TEMP_agentId,
                                online_at: new Date().toISOString(),
                            });
                        }
                    });

                    // Set up broadcast channel for WebRTC signaling
                    Supabase.getSupabaseClient()
                        ?.channel(E_AgentChannels.SIGNALING_CHANNEL)
                        .on(
                            'broadcast',
                            { event: 'webrtc-signal' },
                            ({ payload }) => {
                                void Agent.handleWebRTCSignal(payload);
                            },
                        )
                        .subscribe();

                    // Subscribe to agent metadata updates
                    subscribeToAgentMetadata();

                    console.info(
                        'Active subscriptions:',
                        Supabase.getActiveSubscriptions(),
                    );
                } catch (error) {
                    console.error(
                        'Failed to connect to Supabase Realtime:',
                        error,
                    );
                }
            }

            Agent.InitializeAgentModule();

            // Start presence update interval
            presenceUpdateInterval = setInterval(() => {
                void Agent.updatePresence();
            }, TEMP_AUDIO_METADATA_INTERVAL);
        };

        const subscribeToAgentMetadata = () => {
            Supabase.getSupabaseClient()
                ?.channel(E_AgentChannels.AGENT_METADATA)
                .on('presence', { event: 'sync' }, () => {
                    const presenceChannel =
                        Supabase.getSupabaseClient()?.channel(
                            E_AgentChannels.AGENT_METADATA,
                        );
                    const state = presenceChannel?.presenceState() ?? {};
                    Agent.handleAgentListUpdate(Object.keys(state));
                })
                .subscribe();
        };
    }

    export namespace Agent {
        const AGENT_LOG_PREFIX = '[AGENT]';

        export const hasAgentsConnected = () =>
            Object.keys(agentConnections).length > 0;

        export const agentConnections: {
            [key: string]: {
                rtcConnection: RTCPeerConnection | null;
                data: {
                    isOpening: boolean;
                    channel: RTCDataChannel | null;
                };
                media: {
                    isOpening: boolean;
                    stream: MediaStream | null;
                    metadata: C_AUDIO_Metadata_Packet | null;
                    currentStreamSymbol: symbol | null;
                };
            };
        } = {};

        export const InitializeAgentModule = () => {
            Media.InitializeMediaModule();

            if (!host || !port) {
                console.error(
                    'Host and port must be set before initializing the agent module.',
                );
                return;
            }

            // Set up broadcast listener for WebRTC signaling
            Supabase.getSupabaseClient()
                ?.channel(E_AgentChannels.SIGNALING_CHANNEL)
                .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
                    void handleWebRTCSignal(payload);
                })
                .subscribe();
        };

        export const updatePresence = async () => {
            const presenceChannel = Supabase.getSupabaseClient()?.channel(
                E_AgentChannels.AGENT_METADATA,
            );
            if (presenceChannel?.state === REALTIME_CHANNEL_STATES.joined) {
                await presenceChannel.track({
                    agent_id: TEMP_agentId,
                    position: TEMP_position,
                    orientation: TEMP_orientation,
                    online_at: new Date().toISOString(),
                });
            }
        };

        export const handleAgentListUpdate = (agentList: string[]) => {
            // Remove connections for agents no longer present
            Object.keys(agentConnections).forEach((agentId) => {
                if (!agentList.includes(agentId)) {
                    void removeAgent(agentId);
                }
            });

            // Establish new connections for new agents
            agentList.forEach((agentId) => {
                if (agentId !== TEMP_agentId) {
                    if (!agentConnections[agentId]) {
                        createAgent(agentId);
                    }

                    if (!agentConnections[agentId].rtcConnection) {
                        void createRTCConnection(agentId);
                    }
                }
            });
        };

        const createAgent = (agentId: string) => {
            agentConnections[agentId] = {
                rtcConnection: null,
                data: {
                    isOpening: false,
                    channel: null,
                },
                media: {
                    isOpening: false,
                    stream: null,
                    metadata: null,
                    currentStreamSymbol: null,
                },
            };
            console.info(
                `${AGENT_LOG_PREFIX} Created agent ${agentId} in agent connections`,
            );
        };

        const removeAgent = (agentId: string) => {
            if (agentConnections[agentId]) {
                removeDataConnection(agentId);
                removeMediaConnection(agentId);
                delete agentConnections[agentId];
                console.info(
                    `${AGENT_LOG_PREFIX} Removed agent ${agentId} from agent connections`,
                );
            }
        };

        const removeDataConnection = (agentId: string) => {
            const agentConnection = agentConnections[agentId];
            if (agentConnection?.data.channel) {
                agentConnection.data.channel.close();
                agentConnection.data.channel = null;
            }
        };

        const removeMediaConnection = (agentId: string) => {
            console.info(
                `${AGENT_LOG_PREFIX} Removing media connection with agent ${agentId}`,
            );
            const agentConnection = agentConnections[agentId];
            if (agentConnection?.rtcConnection) {
                agentConnection.rtcConnection.close();
                agentConnection.rtcConnection = null;
            }
            if (agentConnection?.media.stream) {
                agentConnection.media.stream
                    .getTracks()
                    .forEach((track) => track.stop());
                agentConnection.media.stream = null;
            }
        };

        const createRTCConnection = async (agentId: string) => {
            const agentConnection = agentConnections[agentId];

            if (agentConnection) {
                const rtcConnection = new RTCPeerConnection({
                    iceServers: TEMP_ICE_SERVERS,
                });
                agentConnection.rtcConnection = rtcConnection;

                rtcConnection.onicecandidate = async (event) => {
                    if (event.candidate) {
                        await sendWebRTCSignal({
                            type: 'ice-candidate',
                            candidate: event.candidate,
                            targetAgentId: agentId,
                        });
                    }
                };

                rtcConnection.ontrack = (event) => {
                    console.log(`Received remote stream from agent ${agentId}`);
                    void Media.handleIncomingStream({
                        stream: event.streams[0],
                        agentId,
                    });
                };

                // Create data channel
                const dataChannel = rtcConnection.createDataChannel('data');
                agentConnection.data.channel = dataChannel;
                setupDataChannelListeners(agentId, dataChannel);

                // Create and send offer
                const offer = await rtcConnection.createOffer();
                await rtcConnection.setLocalDescription(offer);
                await sendWebRTCSignal({
                    type: 'offer',
                    offer,
                    targetAgentId: agentId,
                });

                console.info(
                    `${AGENT_LOG_PREFIX} Created RTC connection for agent ${agentId}`,
                );
            }
        };

        const setupDataChannelListeners = (
            agentId: string,
            dataChannel: RTCDataChannel,
        ) => {
            dataChannel.onopen = () => {
                console.log(
                    `${AGENT_LOG_PREFIX} Data channel opened with agent ${agentId}`,
                );
            };

            dataChannel.onclose = () => {
                console.log(`Data channel closed with agent ${agentId}`);
                agentConnections[agentId].data.channel = null;
            };
        };

        const sendWebRTCSignal = async (signal: any) => {
            await Supabase.getSupabaseClient()
                ?.channel(E_AgentChannels.SIGNALING_CHANNEL)
                .send({
                    type: 'broadcast',
                    event: 'webrtc-signal',
                    payload: signal,
                });
        };

        export const handleWebRTCSignal = async (signal: any) => {
            const { type, targetAgentId } = signal;

            if (targetAgentId !== TEMP_agentId) {
                return;
            }

            switch (type) {
                case 'offer':
                    await handleOffer(signal);
                    break;
                case 'answer':
                    await handleAnswer(signal);
                    break;
                case 'ice-candidate':
                    await handleIceCandidate(signal);
                    break;
                default:
                    log(
                        `${AGENT_LOG_PREFIX} Unknown WebRTC signal type: ${type}`,
                        'error',
                    );
            }
        };

        const handleOffer = async (data: {
            offer: RTCSessionDescriptionInit;
            fromAgentId: string;
        }) => {
            const { offer, fromAgentId } = data;
            if (!agentConnections[fromAgentId]) {
                createAgent(fromAgentId);
            }
            const rtcConnection = new RTCPeerConnection({
                iceServers: TEMP_ICE_SERVERS,
            });
            agentConnections[fromAgentId].rtcConnection = rtcConnection;

            rtcConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await sendWebRTCSignal({
                        type: 'ice-candidate',
                        candidate: event.candidate,
                        targetAgentId: fromAgentId,
                    });
                }
            };

            rtcConnection.ontrack = (event) => {
                console.log(`Received remote stream from agent ${fromAgentId}`);
                void Media.handleIncomingStream({
                    stream: event.streams[0],
                    agentId: fromAgentId,
                });
            };

            rtcConnection.ondatachannel = (event) => {
                const dataChannel = event.channel;
                agentConnections[fromAgentId].data.channel = dataChannel;
                setupDataChannelListeners(fromAgentId, dataChannel);
            };

            await rtcConnection.setRemoteDescription(
                new RTCSessionDescription(offer),
            );
            const answer = await rtcConnection.createAnswer();
            await rtcConnection.setLocalDescription(answer);
            await sendWebRTCSignal({
                type: 'answer',
                answer,
                targetAgentId: fromAgentId,
            });
        };

        const handleAnswer = async (data: {
            answer: RTCSessionDescriptionInit;
            fromAgentId: string;
        }) => {
            const { answer, fromAgentId } = data;
            const rtcConnection = agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.setRemoteDescription(
                    new RTCSessionDescription(answer),
                );
            }
        };

        const handleIceCandidate = async (data: {
            candidate: RTCIceCandidateInit;
            fromAgentId: string;
        }) => {
            const { candidate, fromAgentId } = data;
            const rtcConnection = agentConnections[fromAgentId]?.rtcConnection;
            if (rtcConnection) {
                await rtcConnection.addIceCandidate(
                    new RTCIceCandidate(candidate),
                );
            }
        };

        export namespace Media {
            const MEDIA_LOG_PREFIX = '[MEDIA]';

            let audioContext: AudioContext | null = null;
            let localAudioStream: MediaStream | null = null;
            const localVideoStream: MediaStream | null = null;

            export const InitializeMediaModule = () => {
                audioContext = new AudioContext();
            };

            export const updateLocalStream = async (data: {
                newStream: MediaStream;
                kind: 'video' | 'audio';
            }) => {
                localAudioStream = data.newStream;

                if (audioContext && data.kind === 'audio') {
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                        console.log(
                            `${MEDIA_LOG_PREFIX} Resumed OUTGOING audio context.`,
                        );
                    }

                    const audioTracks = data.newStream.getAudioTracks();
                    if (audioTracks.length === 0) {
                        console.warn(
                            `${MEDIA_LOG_PREFIX} No audio tracks found in the stream.`,
                        );
                    } else {
                        audioTracks.forEach((track) => {
                            track.enabled = true;
                            console.log(
                                `${MEDIA_LOG_PREFIX} Audio track:`,
                                track,
                            );
                        });
                    }
                } else {
                    console.info(
                        `${MEDIA_LOG_PREFIX} No audio context available [${audioContext}] or kind is not audio [${data.kind}]`,
                    );
                }

                Object.values(Client.Agent.agentConnections).forEach(
                    (connection) => {
                        if (connection.rtcConnection) {
                            const senders =
                                connection.rtcConnection.getSenders();
                            senders.forEach(async (sender) => {
                                if (
                                    sender.track &&
                                    sender.track.kind === data.kind
                                ) {
                                    const newTrack = data.newStream
                                        .getTracks()
                                        .find(
                                            (track) => track.kind === data.kind,
                                        );
                                    if (newTrack) {
                                        await sender.replaceTrack(newTrack);
                                        console.log(
                                            `${MEDIA_LOG_PREFIX} Updated ${data.kind} track for sender.`,
                                        );
                                    }
                                }
                            });
                        }
                    },
                );

                console.log(
                    `${MEDIA_LOG_PREFIX} Updated local ${data.kind} stream for all RTCPeerConnections.`,
                );
            };

            export const getLocalStream = (data: {
                kind: 'video' | 'audio';
            }): MediaStream | null => {
                if (data.kind === 'video') {
                    return localVideoStream;
                }
                if (data.kind === 'audio') {
                    return localAudioStream;
                }
                return null;
            };

            export const handleIncomingStream = async (data: {
                stream: MediaStream;
                agentId: string;
            }) => {
                const agentConnection = agentConnections[data.agentId];
                const streamSymbol = Symbol('stream');
                agentConnection.media.currentStreamSymbol = streamSymbol;

                if (!audioContext || audioContext.state === 'closed') {
                    audioContext = new AudioContext();
                }

                if (audioContext?.state === 'suspended') {
                    await audioContext.resume();
                    console.log(
                        `${MEDIA_LOG_PREFIX} Resumed INCOMING audio context.`,
                    );
                }

                const audioTracks = data.stream.getAudioTracks();
                console.info(
                    `${MEDIA_LOG_PREFIX} Received ${audioTracks.length} audio tracks from agent ${data.agentId} for stream [${data.stream}]`,
                );

                if (audioTracks.length === 0) {
                    console.warn(
                        `${MEDIA_LOG_PREFIX} No audio tracks in the incoming stream from agent ${data.agentId}`,
                    );
                    return;
                }

                const audioElement = new Audio();
                audioElement.srcObject = data.stream;
                audioElement.pause();
                audioElement.autoplay = false;

                audioTracks.forEach((track) => {
                    track.enabled = true;
                    console.info(
                        `${MEDIA_LOG_PREFIX} Incoming audio track:`,
                        track,
                    );
                });

                const audioSource = audioContext.createMediaStreamSource(
                    data.stream,
                );

                const panner = audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 0;
                panner.coneOuterGain = 0;

                audioSource.connect(panner);
                panner.connect(audioContext.destination);

                console.log(
                    `${MEDIA_LOG_PREFIX} Connected incoming audio stream from agent ${data.agentId}`,
                );

                const intervalId = setInterval(() => {
                    if (
                        audioContext &&
                        audioContext.state === 'running' &&
                        panner
                    ) {
                        const presenceChannel =
                            Supabase.getSupabaseClient()?.channel(
                                E_AgentChannels.AGENT_METADATA,
                            );
                        const state = presenceChannel?.presenceState() ?? {};
                        const agentPresence = state[data.agentId]?.[0];
                        const ourPresence = state[TEMP_agentId ?? '']?.[0];

                        if (agentPresence && ourPresence) {
                            const audioPosition = (agentPresence as any)
                                .position;
                            const audioOrientation = (agentPresence as any)
                                .orientation;
                            const ourPosition = (ourPresence as any).position;
                            const ourOrientation = (ourPresence as any)
                                .orientation;

                            if (
                                audioPosition &&
                                ourPosition &&
                                typeof audioPosition.x === 'number' &&
                                typeof audioPosition.y === 'number' &&
                                typeof audioPosition.z === 'number' &&
                                typeof ourPosition.x === 'number' &&
                                typeof ourPosition.y === 'number' &&
                                typeof ourPosition.z === 'number'
                            ) {
                                const relativePosition = {
                                    x: audioPosition.x - ourPosition.x,
                                    y: audioPosition.y - ourPosition.y,
                                    z: audioPosition.z - ourPosition.z,
                                };

                                panner.positionX.setValueAtTime(
                                    relativePosition.x,
                                    audioContext.currentTime,
                                );
                                panner.positionY.setValueAtTime(
                                    relativePosition.y,
                                    audioContext.currentTime,
                                );
                                panner.positionZ.setValueAtTime(
                                    relativePosition.z,
                                    audioContext.currentTime,
                                );
                            }

                            if (
                                audioOrientation &&
                                ourOrientation &&
                                typeof audioOrientation.x === 'number' &&
                                typeof audioOrientation.y === 'number' &&
                                typeof audioOrientation.z === 'number' &&
                                typeof ourOrientation.x === 'number' &&
                                typeof ourOrientation.y === 'number' &&
                                typeof ourOrientation.z === 'number'
                            ) {
                                const relativeOrientation = {
                                    x: audioOrientation.x - ourOrientation.x,
                                    y: audioOrientation.y - ourOrientation.y,
                                    z: audioOrientation.z - ourOrientation.z,
                                };

                                panner.orientationX.setValueAtTime(
                                    relativeOrientation.x,
                                    audioContext.currentTime,
                                );
                                panner.orientationY.setValueAtTime(
                                    relativeOrientation.y,
                                    audioContext.currentTime,
                                );
                                panner.orientationZ.setValueAtTime(
                                    relativeOrientation.z,
                                    audioContext.currentTime,
                                );
                            }
                        } else {
                            console.warn(
                                `${MEDIA_LOG_PREFIX} No presence data available for agent ${data.agentId} or current agent`,
                            );
                        }
                    } else {
                        console.warn(
                            `${MEDIA_LOG_PREFIX} No panner or audio context available for agent ${data.agentId}`,
                            audioContext,
                            panner,
                        );
                    }

                    if (
                        agentConnection.media.currentStreamSymbol !==
                        streamSymbol
                    ) {
                        audioSource.disconnect(panner);
                        if (audioContext) {
                            panner.disconnect(audioContext.destination);
                        }
                        clearInterval(intervalId);
                        console.log(
                            `${MEDIA_LOG_PREFIX} Cleared interval for agent ${data.agentId} as the media stream connection no longer exists.`,
                        );
                    }
                }, TEMP_AUDIO_METADATA_INTERVAL);
            };
        }
    }
}
