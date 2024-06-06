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

    export const worldConnected = () => socket?.connected ?? false;

    export namespace Setup {
        let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

        export const InitializeWorldModule = (data: {
            host: string;
            port: number;
            agentId: string;
        }) => {
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

            Agent.InitializeAgentModule(data.agentId);

            // Listening to events
            socket.on('connect', () => {
                console.log(`Connected to server at ${data.host}:${data.port}`);

                heartbeatInterval = setInterval(() => {
                    sendHeartbeatPacket();
                }, 1000); // TODO: Use a constant or configuration variable for the interval duration
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

        const sendHeartbeatPacket = () => {
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

        export const hasAgentsConnected = () =>
            Object.keys(agentConnections).length > 0;

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
            Media.InitializeMediaModule();

            peer = new Peer(agentId, {
                host: '/',
                path: '/peerjs',
                port: 3000,
            });

            peer.on('connection', handleDataConnection);
            peer.on('call', handleMediaCall);

            socket?.on(EPacketType.WORLD_AgentList, handleAgentListUpdate);
        };

        const handleDataConnection = (conn: DataConnection) => {
            const remoteAgentId = conn.peer;
            console.log(`Received data connection from agent ${remoteAgentId}`);

            if (agentConnections[remoteAgentId]) {
                console.error(
                    `${AGENT_LOG_PREFIX} Received data connection from agent ${remoteAgentId}, but agent already exists.`,
                );
            } else {
                createAgent(remoteAgentId);
                agentConnections[remoteAgentId].dataConnection = conn;
            }

            conn.on('data', (data) => {
                console.log(`Received data from agent ${remoteAgentId}:`, data);
                if (data instanceof C_AUDIO_Metadata_Packet) {
                    if (agentConnections[remoteAgentId].media.connection) {
                        agentConnections[remoteAgentId].media.metadata = data;
                    }
                }
            });

            conn.on('close', () => {
                console.log(
                    `Data connection closed with agent ${remoteAgentId}`,
                );
                removeAgent(remoteAgentId);
            });
        };

        const handleMediaCall = (call: MediaConnection) => {
            console.log(
                `${AGENT_LOG_PREFIX} Received a media call from:`,
                call.peer,
            );

            const acceptedCall = acceptMediaCall(call);

            if (acceptedCall) {
                call.on('stream', (remoteStream) => {
                    console.log(
                        `${AGENT_LOG_PREFIX} Received remote stream from [${call.peer}]`,
                    );
                    Media.handleIncomingStream({
                        stream: remoteStream,
                        agentId: call.peer,
                    });
                });

                call.on('close', () => {
                    console.log('Media call closed');
                });

                call.on('error', (error) => {
                    console.error('Media call error:', error);
                });
            } else {
                console.info(
                    `${AGENT_LOG_PREFIX} Media call rejected from [${call.peer}]`,
                );
            }
        };

        const handleAgentListUpdate = (message: C_WORLD_AgentList_Packet) => {
            console.log('Received agent list update');
            const { agentList } = message;
            console.log('Updated agent list:', agentList);

            // Remove connections for agents no longer present
            Object.keys(agentConnections).forEach((agentId) => {
                if (!agentList.includes(agentId)) {
                    removeAgent(agentId);
                }
            });

            // Establish new connections for new agents
            agentList.forEach((agentId) => {
                if (agentId !== peer?.id && !agentConnections[agentId]) {
                    createAgent(agentId);
                    connectDataChannel(agentId);
                    connectMediaChannel(agentId);
                }
            });
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
            if (agentConnections[agentId]) {
                agentConnections[agentId].dataConnection?.close();
                agentConnections[agentId].media.connection?.close();
                delete agentConnections[agentId];
            }
        };

        const acceptMediaCall = (mediaCall: MediaConnection): boolean => {
            const localStream = Media.getLocalStream({ kind: 'audio' });

            if (!localStream) {
                return false;
            }

            mediaCall.answer(localStream);

            if (agentConnections[mediaCall.peer]) {
                agentConnections[mediaCall.peer].media.connection = mediaCall;
            } else {
                createAgent(mediaCall.peer);
                agentConnections[mediaCall.peer].media.connection = mediaCall;
            }

            return true;
        };

        const connectDataChannel = (agentId: string) => {
            if (peer && !agentConnections[agentId].dataConnection) {
                const dataConn = peer.connect(agentId);
                if (!dataConn) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Failed to establish data connection with agent ${agentId}`,
                    );
                    return;
                }

                agentConnections[agentId].dataConnection = dataConn;

                dataConn.on('open', () => {
                    console.log(`Data connection opened with agent ${agentId}`);
                });

                dataConn.on('close', () => {
                    console.log(`Data connection closed with agent ${agentId}`);
                    removeAgent(agentId);
                });
            }
        };

        const connectMediaChannel = (agentId: string) => {
            const localStream = Media.getLocalStream({ kind: 'audio' });

            if (
                peer &&
                !agentConnections[agentId].media.connection &&
                localStream
            ) {
                const mediaConn = peer.call(agentId, localStream);
                if (!mediaConn) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Failed to establish media connection with agent ${agentId}`,
                    );
                    return;
                }

                agentConnections[agentId].media.connection = mediaConn;

                console.log(
                    `${AGENT_LOG_PREFIX} Establishing media connection with agent ${agentId}`,
                );

                mediaConn.on('stream', (remoteStream) => {
                    console.log(`Received remote stream from agent ${agentId}`);
                    Media.handleIncomingStream({
                        stream: remoteStream,
                        agentId,
                    });
                });

                mediaConn.on('close', () => {
                    console.log(
                        `Media connection closed with agent ${agentId}`,
                    );
                    removeAgent(agentId);
                });

                mediaConn.on('error', (error) => {
                    console.error(
                        `Media connection error with agent ${agentId}:`,
                        error,
                    );
                });
            } else {
                console.error(
                    `${AGENT_LOG_PREFIX} Failed to establish media connection with agent ${agentId}`,
                );
            }
        };

        export const sendHeartbeatToAgents = () => {
            console.info(
                '#### TEMP: Are my audio tracks muted?',
                Media.getLocalStream({ kind: 'audio' }),
            );

            Object.entries(agentConnections).forEach(
                ([agentId, connection]) => {
                    if (
                        connection.dataConnection &&
                        connection.dataConnection.open &&
                        TEMP_position &&
                        TEMP_orientation
                    ) {
                        const packet = new C_AUDIO_Metadata_Packet({
                            senderId: TEMP_agentId,
                            audioPosition: TEMP_position,
                            audioOrientation: TEMP_orientation,
                        });
                        void connection.dataConnection.send(packet);
                        console.log(
                            `${AGENT_LOG_PREFIX} #### Sent metadata to agent ${agentId}, audio track:`,
                            connection.media.connection,
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

        export namespace Media {
            const MEDIA_LOG_PREFIX = '[MEDIA]';

            let audioContext: AudioContext | null = null;
            // eslint-disable-next-line prefer-const
            let localAudioStream: MediaStream | null = null;
            const localVideoStream: MediaStream | null = null;

            export const InitializeMediaModule = () => {
                audioContext = new AudioContext();
            };

            export const updateLocalStream = (data: {
                newStream: MediaStream;
                kind: 'video' | 'audio';
            }) => {
                localAudioStream = data.newStream;

                Object.values(Client.Agent.agentConnections).forEach(
                    (connection) => {
                        if (connection.media.connection) {
                            connection.media.connection.peerConnection
                                .getSenders()
                                .forEach(async (sender) => {
                                    if (
                                        sender.track &&
                                        sender.track.kind === data.kind
                                    ) {
                                        const newTrack =
                                            data.newStream.getAudioTracks()[0];
                                        if (newTrack) {
                                            await sender.replaceTrack(newTrack);
                                        }
                                    }

                                    console.log(
                                        `${MEDIA_LOG_PREFIX} Updated local audio stream for ${sender}.`,
                                    );
                                });
                        }
                    },
                );

                console.log(
                    `${MEDIA_LOG_PREFIX} Updated local audio stream for all media connections.`,
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

            export const handleIncomingStream = (data: {
                stream: MediaStream;
                agentId: string;
            }) => {
                if (!audioContext) {
                    console.error(
                        `${MEDIA_LOG_PREFIX} No audio context available.`,
                    );
                    return;
                }

                const audioTracks = data.stream.getAudioTracks();
                console.log(
                    `${MEDIA_LOG_PREFIX} Received ${audioTracks.length} audio tracks from agent ${data.agentId}`,
                );

                if (audioTracks.length === 0) {
                    console.warn(
                        `${MEDIA_LOG_PREFIX} No audio tracks in the incoming stream from agent ${data.agentId}`,
                    );
                    return;
                }

                const audioSource = audioContext.createMediaStreamSource(
                    data.stream,
                );
                const panner = createSpatialPanner(data.agentId);

                // Connect the audio source to both the panner and the destination
                audioSource.connect(panner);
                panner.connect(audioContext.destination);

                // Directly connect the audio source to the destination for echo
                audioSource.connect(audioContext.destination);

                console.log(
                    `${MEDIA_LOG_PREFIX} Connected incoming audio stream from agent ${data.agentId}`,
                );

                // Log "on data received" for each audio track
                data.stream.getTracks().forEach((track) => {
                    track.onunmute = () => {
                        console.log(
                            `${MEDIA_LOG_PREFIX} on data received from agent ${data.agentId}`,
                        );
                    };
                });
            };

            const createSpatialPanner = (agentId: string) => {
                const panner = audioContext!.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 0;
                panner.coneOuterGain = 0;

                updatePannerPosition(panner, agentId);

                return panner;
            };

            const updatePannerPosition = (
                panner: PannerNode,
                agentId: string,
            ) => {
                const agentMetadata = agentConnections[agentId]?.media.metadata;

                if (agentMetadata) {
                    const { audioPosition, audioOrientation } = agentMetadata;
                    if (audioPosition) {
                        panner.positionX.setValueAtTime(
                            audioPosition.x,
                            audioContext!.currentTime,
                        );
                        panner.positionY.setValueAtTime(
                            audioPosition.y,
                            audioContext!.currentTime,
                        );
                        panner.positionZ.setValueAtTime(
                            audioPosition.z,
                            audioContext!.currentTime,
                        );
                    }

                    if (audioOrientation) {
                        panner.orientationX.setValueAtTime(
                            audioOrientation.x,
                            audioContext!.currentTime,
                        );
                        panner.orientationY.setValueAtTime(
                            audioOrientation.y,
                            audioContext!.currentTime,
                        );
                        panner.orientationZ.setValueAtTime(
                            audioOrientation.z,
                            audioContext!.currentTime,
                        );
                    }
                } else {
                    console.warn(
                        `${MEDIA_LOG_PREFIX} No metadata available for agent ${agentId}`,
                    );
                }
            };
        }
    }
}
