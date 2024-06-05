// Agent <-> Server
import { io, Socket } from 'socket.io-client';
// Agent <-> Agent
import { Peer, DataConnection, MediaConnection } from 'peerjs';

import {
    EPacketType,
    C_AGENT_Heartbeat_Packet,
    C_WORLD_AgentList_Packet,
    C_AUDIO_Metadata_Packet,
} from '../routes/meta';

// FIXME: This should be defined in config.
const TEMP_ICE_SERVERS = [
    {
        urls: ['stun:stun.l.google.com:19302'],
    },
];

export namespace Client {
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

    export const isConnected = () => socket?.connected ?? false;

    export namespace Setup {
        let maintainInterval: ReturnType<typeof setInterval> | null = null;

        export const initializeAndConnectTo = (data: {
            // TODO: defaults should be in config
            host: string;
            port: number;
            agentId: string;
        }) => {
            TEMP_agentId = data.agentId;

            if (socket) {
                socket.removeAllListeners();
                socket.close();
                console.log('Closed existing socket.');
            }

            socket = io(`${data.host}:${data.port}`, {});

            Agent.InitializeAgentModule(data.agentId);

            // Listening to events
            socket.on('connect', () => {
                console.log(`Connected to server at ${data.host}:${data.port}`);

                maintainInterval = setInterval(() => {
                    sendMaintainPacket();
                    // TODO: Should be in config.
                }, 1000);
            });

            socket.on('disconnect', () => {
                socket?.removeAllListeners();
                clearInterval(
                    maintainInterval as ReturnType<typeof setInterval>,
                );
                console.log('Disconnected from server');
            });
        };

        const sendMaintainPacket = () => {
            socket?.emit(
                EPacketType.AGENT_Heartbeat,
                new C_AGENT_Heartbeat_Packet({
                    senderId: TEMP_agentId,
                }),
            );
        };
    }

    export namespace Agent {
        const AGENT_LOG_PREFIX = '[AGENT]';
        let peer: Peer | null = null;
        export const agentConnections: {
            [key: string]: {
                dataConnection: DataConnection | null;
                media: {
                    connection: MediaConnection | null;
                    metadata: C_AUDIO_Metadata_Packet | null;
                };
            };
        } = {};

        export const InitializeAgentModule = (agentId: string) => {
            Audio.InitializeAudioModule();

            peer = new Peer(agentId, {
                host: '/', // or the server's address
                path: '/peerjs',
                port: 3000,
            });

            peer.on('connection', (conn) => {
                const remoteAgentId = conn.peer;
                console.log(`Received connection from agent ${remoteAgentId}`);
                if (agentConnections[remoteAgentId]) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Received connection from agent ${remoteAgentId}, but agent already exists.`,
                    );
                } else {
                    createAgent(remoteAgentId);
                    agentConnections[remoteAgentId].dataConnection = conn;
                }
            });

            peer.on('call', (call) => {
                console.log('Received a call from:', call.peer);
                acceptMediaChannel(call);

                call.on('stream', (remoteStream) => {
                    console.error('Received remote stream');
                    // Handle the remote stream
                    Audio.handleIncomingStream({
                        stream: remoteStream,
                        agentId: call.peer,
                    });

                    Audio.TEMP_broadcastAudioStreams();
                });

                call.on('close', () => {
                    console.log('Call closed');
                });

                call.on('error', (error) => {
                    console.error('Call error:', error);
                });
            });

            socket?.on(
                EPacketType.WORLD_AgentList,
                (message: C_WORLD_AgentList_Packet) => {
                    console.log('Received WORLD_AgentList');
                    const { agentList } = message;
                    console.log('Received agent list:', agentList);

                    // Remove connections for agents no longer present
                    Object.keys(agentConnections).forEach((foundAgentId) => {
                        if (!agentList.includes(foundAgentId)) {
                            disconnect(foundAgentId);
                        }
                    });

                    // Establish new connections for new agents
                    agentList.forEach((foundAgentId) => {
                        if (
                            foundAgentId !== peer?.id &&
                            !agentConnections[foundAgentId]
                        ) {
                            connectDataChannel(foundAgentId);
                            connectMediaChannel(foundAgentId);
                        }
                    });
                },
            );
        };

        const createAgent = (agentId: string) => {
            agentConnections[agentId] = {
                dataConnection: null,
                media: {
                    connection: null,
                    metadata: null,
                },
            };
        };

        const removeAgent = (agentId: string) => {
            delete agentConnections[agentId];
        };

        const acceptMediaChannel = (mediaConn: MediaConnection) => {
            mediaConn.answer(Audio.TEMP_mediaStream || undefined);
            if (agentConnections[mediaConn.peer]) {
                agentConnections[mediaConn.peer].media.connection = mediaConn;
            } else {
                createAgent(mediaConn.peer);
                if (agentConnections[mediaConn.peer]) {
                    agentConnections[mediaConn.peer].media.connection =
                        mediaConn;
                }
            }
        };

        const connectMediaChannel = (agentId: string) => {
            if (!Audio.TEMP_mediaStream) {
                console.error(`${AGENT_LOG_PREFIX} No media stream available.`);
                return;
            }
            console.info(
                `${AGENT_LOG_PREFIX} Establishing media connection with agent ${agentId}, media stream: [`,
                Audio.TEMP_mediaStream,
                `]`,
            );

            if (peer) {
                // Establish a media connection without a stream initially
                const mediaConn = peer.call(agentId, Audio.TEMP_mediaStream);

                if (!mediaConn) {
                    console.info(
                        `${AGENT_LOG_PREFIX} Failed to establish media connection with agent ${agentId}`,
                    );
                    return;
                }

                if (agentConnections[agentId]) {
                    agentConnections[agentId].media.connection = mediaConn;
                } else {
                    createAgent(agentId);
                    if (agentConnections[agentId]) {
                        agentConnections[agentId].media.connection = mediaConn;
                    }
                }

                console.info(
                    `${AGENT_LOG_PREFIX} Establishing media connection with agent ${agentId}, media stream: [`,
                    Audio.TEMP_mediaStream,
                    `]\nMedia connection: [`,
                    mediaConn,
                    `]`,
                );

                mediaConn.on('iceStateChanged', (state) => {
                    console.log(
                        `${AGENT_LOG_PREFIX} ICE state changed for agent ${agentId}: ${state}`,
                    );
                });

                mediaConn.on('close', () => {
                    console.info(
                        `${AGENT_LOG_PREFIX} Closed media connection with agent ${agentId}, connection: [`,
                        mediaConn,
                        `]`,
                    );
                });

                mediaConn.on('error', (error) => {
                    console.info(
                        `${AGENT_LOG_PREFIX} Error establishing media connection with agent ${agentId}, connection: [`,
                        mediaConn,
                        `]`,
                        error,
                    );
                });
            }
        };

        const connectDataChannel = (agentId: string) => {
            if (peer) {
                const dataConn = peer.connect(agentId);
                if (!dataConn) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Failed to establish data connection with agent ${agentId}`,
                    );
                    return;
                }

                if (agentConnections[agentId]) {
                    agentConnections[agentId].dataConnection = dataConn;
                } else {
                    createAgent(agentId);
                    if (agentConnections[agentId]) {
                        agentConnections[agentId].dataConnection = dataConn;
                    }
                }

                dataConn.on('open', () => {
                    console.log(`Data connection opened with agent ${agentId}`);
                });

                dataConn.on('data', (data) => {
                    console.log(`Received data from agent ${agentId}:`, data);
                    if (data instanceof C_AUDIO_Metadata_Packet) {
                        if (agentConnections[agentId].media.connection) {
                            agentConnections[agentId].media.metadata = data;
                        }
                    }
                });

                dataConn.on('close', () => {
                    console.log(`Data connection closed with agent ${agentId}`);
                    removeAgent(agentId);
                });
            }
        };

        export const disconnect = (agentId: string) => {
            if (agentConnections[agentId]) {
                agentConnections[agentId].dataConnection?.close();
                agentConnections[agentId].media.connection?.close();
                removeAgent(agentId);
            }
        };

        export const sendHeartbeatToAgents = () => {
            // Check if data connections exist and send metadata to all open connections
            Object.keys(Agent.agentConnections).forEach((agentId) => {
                const connectionInfo = Agent.agentConnections[agentId];
                if (
                    connectionInfo.dataConnection &&
                    connectionInfo.dataConnection.open &&
                    TEMP_position &&
                    TEMP_orientation
                ) {
                    const packet = new C_AUDIO_Metadata_Packet({
                        senderId: TEMP_agentId,
                        audioPosition: TEMP_position,
                        audioOrientation: TEMP_orientation,
                    });
                    void connectionInfo.dataConnection.send(packet);
                    console.log(
                        `[AGENT] Sent metadata to agent ${agentId}. Connection status: \nDATA: [`,
                        connectionInfo.dataConnection,
                        `]\nMEDIA: [`,
                        connectionInfo.media.connection,
                        `]`,
                    );
                } else {
                    console.error(
                        `[AGENT] No data connection to send metadata for agent ${agentId}.`,
                    );
                }
            });
        };

        export namespace Audio {
            const AUDIO_LOG_PREFIX = '[AUDIO]';

            let audioContext: AudioContext | null = null;
            // eslint-disable-next-line prefer-const
            export let TEMP_mediaStream: MediaStream | null = null;

            export const InitializeAudioModule = () => {
                if (!audioContext) {
                    audioContext = new AudioContext();
                }
            };

            export const handleIncomingStream = (data: {
                stream: MediaStream;
                agentId: string;
            }) => {
                if (!audioContext) {
                    console.error(
                        `${AUDIO_LOG_PREFIX} No audio context available.`,
                    );
                    return;
                }

                const audioTracks = data.stream.getAudioTracks();
                console.log(
                    `${AUDIO_LOG_PREFIX} Number of audio tracks: ${audioTracks.length}`,
                );
                if (audioTracks.length === 0) {
                    console.error(
                        `${AUDIO_LOG_PREFIX} No audio tracks in the incoming stream.`,
                    );
                    return;
                }

                console.log(
                    `${AUDIO_LOG_PREFIX} Audio context state: ${audioContext.state}`,
                );
                console.log(
                    `${AUDIO_LOG_PREFIX} Establishing incoming media stream processor with agent ${data.agentId}.`,
                );

                const audioSource = audioContext.createMediaStreamSource(
                    data.stream,
                );
                // output the audio directly
                audioSource.connect(audioContext.destination);
                void audioContext.resume();

                // const panner = audioContext.createPanner();
                // panner.panningModel = 'HRTF';
                // panner.distanceModel = 'inverse';
                // panner.refDistance = 1;
                // panner.maxDistance = 10000;
                // panner.rolloffFactor = 1;
                // panner.coneInnerAngle = 360;
                // panner.coneOuterAngle = 0;
                // panner.coneOuterGain = 0;

                // const agentMetadata =
                //     agentConnections[data.agentId]?.media.metadata;

                // if (agentMetadata) {
                //     const { audioPosition, audioOrientation } = agentMetadata;
                //     if (audioPosition) {
                //         panner.positionX.setValueAtTime(
                //             audioPosition.x,
                //             audioContext.currentTime,
                //         );
                //         panner.positionY.setValueAtTime(
                //             audioPosition.y,
                //             audioContext.currentTime,
                //         );
                //         panner.positionZ.setValueAtTime(
                //             audioPosition.z,
                //             audioContext.currentTime,
                //         );
                //     }

                //     if (audioOrientation) {
                //         panner.orientationX.setValueAtTime(
                //             audioOrientation.x,
                //             audioContext.currentTime,
                //         );
                //         panner.orientationY.setValueAtTime(
                //             audioOrientation.y,
                //             audioContext.currentTime,
                //         );
                //         panner.orientationZ.setValueAtTime(
                //             audioOrientation.z,
                //             audioContext.currentTime,
                //         );
                //     }
                // } else {
                //     if (TEMP_position) {
                //         panner.positionX.setValueAtTime(
                //             TEMP_position.x,
                //             audioContext.currentTime,
                //         );
                //         panner.positionY.setValueAtTime(
                //             TEMP_position.y,
                //             audioContext.currentTime,
                //         );
                //         panner.positionZ.setValueAtTime(
                //             TEMP_position.z,
                //             audioContext.currentTime,
                //         );
                //     }

                //     if (TEMP_orientation) {
                //         panner.orientationX.setValueAtTime(
                //             TEMP_orientation.x,
                //             audioContext.currentTime,
                //         );
                //         panner.orientationY.setValueAtTime(
                //             TEMP_orientation.y,
                //             audioContext.currentTime,
                //         );
                //         panner.orientationZ.setValueAtTime(
                //             TEMP_orientation.z,
                //             audioContext.currentTime,
                //         );
                //     }
                // }

                // audioSource.connect(panner);
                // panner.connect(audioContext.destination);

                // console.log(
                //     `${AUDIO_LOG_PREFIX} Audio source connected to panner: ${audioSource.numberOfOutputs > 0}`,
                // );
                // console.log(
                //     `${AUDIO_LOG_PREFIX} Panner connected to destination: ${panner.numberOfOutputs > 0}`,
                // );

                // const analyser = audioContext.createAnalyser();
                // audioSource.connect(analyser);

                // const bufferLength = analyser.frequencyBinCount;
                // const dataArray = new Uint8Array(bufferLength);

                // function logAudioData() {
                //     analyser.getByteFrequencyData(dataArray);
                //     console.log(
                //         `${AUDIO_LOG_PREFIX} Audio data: ${Array.from(dataArray)}`,
                //     );
                //     requestAnimationFrame(logAudioData);
                // }

                // logAudioData();

                console.info(
                    `${AUDIO_LOG_PREFIX} Playing spatialized audio from incoming stream.`,
                );
            };

            export const TEMP_broadcastAudioStreams = () => {
                if (!TEMP_mediaStream) {
                    console.error(
                        `${AUDIO_LOG_PREFIX} No media stream available.`,
                    );
                    return;
                }
                const newAudioTrack = TEMP_mediaStream.getAudioTracks()[0];

                if (!newAudioTrack) {
                    console.error(
                        `${AUDIO_LOG_PREFIX} No audio track in provided stream.`,
                    );
                    return;
                }

                console.log(
                    `${AUDIO_LOG_PREFIX} Updating audio streams for all connected agents. Tracks: [`,
                    TEMP_mediaStream.getAudioTracks(),
                    `]`,
                );

                Object.keys(agentConnections).forEach((agentId) => {
                    const connectionInfo = agentConnections[agentId];
                    if (!connectionInfo.media.connection) {
                        connectMediaChannel(agentId);

                        if (!connectionInfo.media.connection) {
                            console.error(
                                `${AUDIO_LOG_PREFIX} Agent connection not initialized for agent:`,
                                agentId,
                            );
                            return; // Continue to the next agent
                        }
                    }

                    const sender =
                        connectionInfo.media.connection.peerConnection
                            ?.getSenders()
                            .find((s) => s.track?.kind === 'audio');
                    if (sender) {
                        sender
                            .replaceTrack(newAudioTrack)
                            .then(() => {
                                console.log(
                                    `${AUDIO_LOG_PREFIX} Audio track replaced for agent ${agentId}.`,
                                );
                            })
                            .catch((error) => {
                                console.error(
                                    `${AUDIO_LOG_PREFIX} Error replacing track for agent ${agentId}:`,
                                    error,
                                );
                            });
                    } else {
                        connectionInfo.media.connection.peerConnection?.addTrack(
                            newAudioTrack,
                            TEMP_mediaStream as MediaStream,
                        );
                        console.log(
                            `${AUDIO_LOG_PREFIX} Audio track added for agent ${agentId}.`,
                        );
                    }
                });
            };
        }
    }
}
