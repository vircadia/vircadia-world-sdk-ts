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
                console.log(`[AGENT] Sent metadata to agent ${agentId}.`);
            } else {
                console.error(
                    `[AGENT] No data connection to send metadata for agent ${agentId}.`,
                );
            }
        });
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
            peer = new Peer(agentId, {
                host: '/', // or the server's address
                path: '/peerjs',
                port: 3000,
            });

            peer.on('connection', (conn) => {
                const remoteAgentId = conn.peer;
                console.log(`Received connection from agent ${remoteAgentId}`);
                agentConnections[remoteAgentId] = {
                    dataConnection: conn,
                    media: {
                        connection: null,
                        metadata: null,
                    },
                };

                Audio.TEMP_streamAudio();
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
                            connect(foundAgentId);
                        }
                    });
                },
            );
        };

        export const connect = (agentId: string) => {
            if (peer) {
                const dataConn = peer.connect(agentId);
                agentConnections[agentId] = {
                    dataConnection: dataConn,
                    media: {
                        connection: null,
                        metadata: null,
                    },
                };

                dataConn.on('open', () => {
                    console.log(`Connected to agent ${agentId}`);
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
                    console.log(`Connection closed with agent ${agentId}`);
                    delete agentConnections[agentId];
                });
            }
        };

        export const disconnect = (agentId: string) => {
            if (agentConnections[agentId]) {
                agentConnections[agentId].dataConnection?.close();
                agentConnections[agentId].media.connection?.close();
                delete agentConnections[agentId];
            }
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

            const handleIncomingStream = (data: {
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
                if (audioTracks.length === 0) {
                    console.error(
                        `${AUDIO_LOG_PREFIX} No audio tracks in the incoming stream.`,
                    );
                    return;
                }

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

                const agentMetadata =
                    agentConnections[data.agentId]?.media.metadata;
                if (agentMetadata) {
                    const { audioPosition, audioOrientation } = agentMetadata;
                    if (audioPosition) {
                        panner.positionX.setValueAtTime(
                            audioPosition.x,
                            audioContext.currentTime,
                        );
                        panner.positionY.setValueAtTime(
                            audioPosition.y,
                            audioContext.currentTime,
                        );
                        panner.positionZ.setValueAtTime(
                            audioPosition.z,
                            audioContext.currentTime,
                        );
                    }

                    if (audioOrientation) {
                        panner.orientationX.setValueAtTime(
                            audioOrientation.x,
                            audioContext.currentTime,
                        );
                        panner.orientationY.setValueAtTime(
                            audioOrientation.y,
                            audioContext.currentTime,
                        );
                        panner.orientationZ.setValueAtTime(
                            audioOrientation.z,
                            audioContext.currentTime,
                        );
                    }
                } else {
                    if (TEMP_position) {
                        panner.positionX.setValueAtTime(
                            TEMP_position.x,
                            audioContext.currentTime,
                        );
                        panner.positionY.setValueAtTime(
                            TEMP_position.y,
                            audioContext.currentTime,
                        );
                        panner.positionZ.setValueAtTime(
                            TEMP_position.z,
                            audioContext.currentTime,
                        );
                    }

                    if (TEMP_orientation) {
                        panner.orientationX.setValueAtTime(
                            TEMP_orientation.x,
                            audioContext.currentTime,
                        );
                        panner.orientationY.setValueAtTime(
                            TEMP_orientation.y,
                            audioContext.currentTime,
                        );
                        panner.orientationZ.setValueAtTime(
                            TEMP_orientation.z,
                            audioContext.currentTime,
                        );
                    }
                }

                audioSource.connect(panner);
                panner.connect(audioContext.destination);
                console.info(
                    `${AUDIO_LOG_PREFIX} Playing spatialized audio from incoming stream.`,
                );
            };

            export const TEMP_streamAudio = () => {
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
                    `${AUDIO_LOG_PREFIX} Updating audio streams for all connected agents.`,
                );

                Object.keys(agentConnections).forEach((agentId) => {
                    const connectionInfo = agentConnections[agentId];
                    if (!connectionInfo) {
                        console.error(
                            `${AUDIO_LOG_PREFIX} Agent connection not initialized for agent:`,
                            agentId,
                        );
                        return;
                    }

                    // Check if a media connection already exists
                    if (connectionInfo.media.connection) {
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
                            console.error(
                                `${AUDIO_LOG_PREFIX} No existing audio sender to replace track for agent ${agentId}.`,
                            );
                        }
                    } else if (peer) {
                        // If no media connection exists, create a new one
                        connectionInfo.media.connection = peer.call(
                            agentId,
                            TEMP_mediaStream as MediaStream,
                        );
                        connectionInfo.media.connection.on(
                            'stream',
                            (stream: MediaStream) =>
                                handleIncomingStream({
                                    stream,
                                    agentId,
                                }),
                        );
                        console.log(
                            `${AUDIO_LOG_PREFIX} New media connection established with agent ${agentId}.`,
                        );
                    }
                });
            };
        }
    }
}
