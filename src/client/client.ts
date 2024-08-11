// Agent <-> Server
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Supabase } from './modules/supabase/supabase.js';
// Agent <-> Agent

import {
    E_PacketType,
    E_RequestType,
    E_WorldTransportChannels,
    C_AGENT_WorldHeartbeat_Packet,
    C_WORLD_AgentList_Packet,
    C_AUDIO_Metadata_Packet,
    I_REQUEST_ConfigAndStatusResponse,
} from '../routes/meta.js';

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

    let socket: Socket | null = null;
    let TEMP_agentId: string | null = null;
    // FIXME: This is temp, avatars shouldn't exist, all avatars should simply be entities.
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

        Agent.sendHeartbeatToAgents();
    };

    export const worldConnected = () => socket?.connected ?? false;

    export namespace Setup {
        let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

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

            if (socket && socket.connected) {
                console.log('Already connected to the server.');
                return;
            }

            if (socket) {
                socket.removeAllListeners();
                socket.close();
                console.log('Closed existing socket.');
            }

            socket = io(`${data.host}:${data.port}`, {});
            host = data.host;
            port = data.port;

            // Link up with the world transport layer.
            if (serverConfigAndStatus && serverConfigAndStatus.API_URL) {
                const url = serverConfigAndStatus.API_URL;
                const key =
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
                const supabaseClient = Supabase.initializeSupabaseClient(
                    url,
                    key,
                );

                try {
                    await Supabase.connectRealtime();
                    console.log('Successfully connected to Supabase Realtime');

                    // Example subscription
                    Supabase.subscribeToTable(
                        E_WorldTransportChannels.WORLD_METADATA,
                        (payload) => {
                            console.log(
                                'Received update from Supabase:',
                                payload,
                            );
                            // Handle the received data
                        },
                    );

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

            // Listening to events
            socket.on('connect', () => {
                console.log(`Connected to server at ${data.host}:${data.port}`);

                heartbeatInterval = setInterval(() => {
                    sendHeartbeatPacketToWorld();
                }, TEMP_AUDIO_METADATA_INTERVAL); // TODO: Use a constant or configuration variable for the interval duration
            });

            socket.on('disconnect', () => {
                socket?.removeAllListeners();
                clearInterval(
                    heartbeatInterval as ReturnType<typeof setInterval>,
                );
                console.log('Disconnected from server');
            });

            socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                // Handle the connection error, e.g., retry connection or notify the user
            });
        };

        const sendHeartbeatPacketToWorld = () => {
            socket?.emit(
                E_PacketType.AGENT_Heartbeat,
                new C_AGENT_WorldHeartbeat_Packet({
                    senderId: TEMP_agentId,
                }),
            );
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

            socket?.on(E_PacketType.AGENT_Offer, handleOffer);
            socket?.on(E_PacketType.AGENT_Answer, handleAnswer);
            socket?.on(E_PacketType.AGENT_ICE_Candidate, handleIceCandidate);
            socket?.on(E_PacketType.WORLD_AgentList, handleAgentListUpdate);
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

        const handleAgentListUpdate = (message: C_WORLD_AgentList_Packet) => {
            const { agentList } = message;

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

        const createRTCConnection = async (agentId: string) => {
            const agentConnection = agentConnections[agentId];

            if (agentConnection) {
                const rtcConnection = new RTCPeerConnection({
                    iceServers: TEMP_ICE_SERVERS,
                });
                agentConnection.rtcConnection = rtcConnection;

                rtcConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket?.emit('ice-candidate', {
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
                socket?.emit('offer', { offer, targetAgentId: agentId });

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

            // dataChannel.onmessage = (event) => {
            //     const dataReceived = JSON.parse(event.data as string);
            //     console.info(
            //         `Received data from agent ${agentId}:`,
            //         dataReceived,
            //         'is audio packet:',
            //         'audioPosition' in dataReceived &&
            //         'audioOrientation' in dataReceived,
            //     );
            //     if (
            //         'audioPosition' in dataReceived &&
            //         'audioOrientation' in dataReceived
            //     ) {
            //         agentConnections[agentId].media.metadata =
            //             dataReceived as C_AUDIO_Metadata_Packet;
            //     }
            // };

            dataChannel.onclose = () => {
                console.log(`Data channel closed with agent ${agentId}`);
                agentConnections[agentId].data.channel = null;
            };
        };

        export const sendHeartbeatToAgents = () => {
            Object.entries(agentConnections).forEach(
                ([agentId, connection]) => {
                    if (
                        connection.data.channel &&
                        connection.data.channel.readyState === 'open' &&
                        TEMP_position &&
                        TEMP_orientation
                    ) {
                        const packet = new C_AUDIO_Metadata_Packet({
                            senderId: TEMP_agentId,
                            audioPosition: TEMP_position,
                            audioOrientation: TEMP_orientation,
                        });
                        connection.data.channel.send(JSON.stringify(packet));
                        console.log(
                            `${AGENT_LOG_PREFIX} Sent metadata to agent ${agentId}`,
                        );
                    } else {
                        console.warn(
                            `${AGENT_LOG_PREFIX} Unable to send metadata to agent ${agentId}. Connection status:`,
                            connection,
                            'Position:',
                            TEMP_position,
                            'Orientation:',
                            TEMP_orientation,
                        );
                    }
                },
            );
        };

        // Add these new functions to handle offer, answer, and ICE candidates
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

            rtcConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit('ice-candidate', {
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
            socket?.emit('answer', { answer, targetAgentId: fromAgentId });
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
            // eslint-disable-next-line prefer-const
            let localAudioStream: MediaStream | null = null;
            const localVideoStream: MediaStream | null = null;

            export const InitializeMediaModule = () => {
                audioContext = new AudioContext();
            };

            // export const testAudioConnection = (
            //     agentId: string,
            // ): Promise<void> => {
            //     return new Promise((resolve, reject) => {
            //         const connection =
            //             agentConnections[agentId]?.media.connection;
            //         const connectionStatus = connection?.open;
            //         const audioContextStatus = audioContext?.state;
            //         if (
            //             connectionStatus &&
            //             audioContext &&
            //             audioContextStatus === 'running'
            //         ) {
            //             const oscillator = audioContext.createOscillator();
            //             oscillator.type = 'sine';
            //             oscillator.frequency.setValueAtTime(
            //                 440,
            //                 audioContext.currentTime,
            //             );
            //             const destination =
            //                 audioContext.createMediaStreamDestination();
            //             oscillator.connect(destination);
            //             oscillator.start();
            //             const testStream = destination.stream;
            //             const senders = connection.peerConnection.getSenders();
            //             if (senders.length === 0) {
            //                 console.error(
            //                     `${MEDIA_LOG_PREFIX} No senders available in peer connection.`,
            //                 );
            //                 reject('No senders available in peer connection.');
            //                 return;
            //             }
            //             Promise.all(
            //                 senders.map((sender) => {
            //                     if (
            //                         sender.track &&
            //                         sender.track.kind === 'audio'
            //                     ) {
            //                         return sender.replaceTrack(
            //                             testStream.getAudioTracks()[0],
            //                         );
            //                     }
            //                     return Promise.resolve();
            //                 }),
            //             )
            //                 .then(() => {
            //                     setTimeout(() => {
            //                         oscillator.stop();
            //                         oscillator.disconnect();
            //                         console.log(
            //                             `${MEDIA_LOG_PREFIX} Sent test audio to agent ${agentId}`,
            //                         );
            //                         resolve();
            //                     }, 1000);
            //                 })
            //                 .catch((error) => {
            //                     console.error(
            //                         `${MEDIA_LOG_PREFIX} Error replacing track:`,
            //                         error,
            //                     );
            //                     reject(error);
            //                 });
            //         } else {
            //             console.warn(
            //                 `${MEDIA_LOG_PREFIX} Failed to send test audio packet ${agentId}`,
            //                 connection,
            //                 audioContext,
            //             );
            //             reject('Connection or audio context not ready.');
            //         }
            //     });
            // };

            export const updateLocalStream = async (data: {
                newStream: MediaStream;
                kind: 'video' | 'audio';
            }) => {
                localAudioStream = data.newStream;

                // Connect the local stream to the audio context destination for echo
                if (audioContext && data.kind === 'audio') {
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                        console.log(
                            `${MEDIA_LOG_PREFIX} Resumed OUTGOING audio context.`,
                        );
                    }

                    // const audioSource = audioContext.createMediaStreamSource(
                    //     data.newStream,
                    // );
                    // audioSource.connect(audioContext.destination);
                    // console.log(
                    //     `${MEDIA_LOG_PREFIX} Connected local audio stream to audio context destination.`,
                    // );

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

                // START hack: Create an Audio element as a HACK because Chrome has a bug
                const audioElement = new Audio();
                audioElement.srcObject = data.stream;
                audioElement.pause();
                audioElement.autoplay = false;
                // END hack

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

                // Create and configure the spatial panner
                const panner = audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 0;
                panner.coneOuterGain = 0;

                // Connect the audio source to both the panner and the destination
                audioSource.connect(panner);
                panner.connect(audioContext.destination);

                console.log(
                    `${MEDIA_LOG_PREFIX} Connected incoming audio stream from agent ${data.agentId}`,
                );

                // Set an interval to update the panner position
                const intervalId = setInterval(() => {
                    if (
                        audioContext &&
                        audioContext.state === 'running' &&
                        panner
                    ) {
                        const agentMetadata =
                            agentConnections[data.agentId].media.metadata;
                        const ourMetadata = {
                            position: TEMP_position,
                            orientation: TEMP_orientation,
                        };

                        if (agentMetadata) {
                            const { audioPosition, audioOrientation } =
                                agentMetadata;

                            if (audioPosition && ourMetadata.position) {
                                const relativePosition = {
                                    x: audioPosition.x - ourMetadata.position.x,
                                    y: audioPosition.y - ourMetadata.position.y,
                                    z: audioPosition.z - ourMetadata.position.z,
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

                            if (audioOrientation && ourMetadata.orientation) {
                                const relativeOrientation = {
                                    x:
                                        audioOrientation.x -
                                        ourMetadata.orientation.x,
                                    y:
                                        audioOrientation.y -
                                        ourMetadata.orientation.y,
                                    z:
                                        audioOrientation.z -
                                        ourMetadata.orientation.z,
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
                                `${MEDIA_LOG_PREFIX} No metadata available for agent ${data.agentId}`,
                                agentConnection.media.metadata,
                                agentConnection.data.channel,
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
                }, TEMP_AUDIO_METADATA_INTERVAL); // Update every 1000 ms
            };

            // export const handleIncomingStream = (data: {
            //     stream: MediaStream;
            //     agentId: string;
            // }) => {
            //     const audioElement = new Audio();
            //     audioElement.srcObject = data.stream;
            //     audioElement.autoplay = true; // Ensure the audio plays automatically
            //     audioElement.controls = true; // Optionally add controls for testing
            //     document.body.appendChild(audioElement); // Append to the body to make it visible for debugging

            //     console.log(
            //         `${MEDIA_LOG_PREFIX} Playing incoming stream via HTML audio element for agent ${data.agentId}`,
            //     );
            // };

            // export const handleIncomingStream = (data: {
            //     stream: MediaStream;
            //     agentId: string;
            // }) => {
            //     if (
            //         !audioContext ||
            //         !audioContext.destination ||
            //         audioContext.state !== 'running'
            //     ) {
            //         console.error(
            //             `${MEDIA_LOG_PREFIX} No audio context available.`,
            //         );
            //         return;
            //     }

            //     // Create an Audio element for direct playback
            //     const audioElement = new Audio();
            //     audioElement.srcObject = data.stream;
            //     audioElement.pause();
            //     audioElement.autoplay = false; // Ensure the audio plays automatically

            //     // Optionally, you can append the audio element to the body to make it visible for debugging
            //     // document.body.appendChild(audioElement);

            //     // Use AudioContext for additional audio processing
            //     const audioSource = audioContext.createMediaStreamSource(
            //         data.stream,
            //     );
            //     audioSource.connect(audioContext.destination);

            //     console.info(
            //         `${MEDIA_LOG_PREFIX} Connected incoming audio stream from agent ${data.agentId} to both Audio element and AudioContext.`,
            //     );
            // };
        }
    }
}
