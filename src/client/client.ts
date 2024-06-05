// Agent <-> Server
import { io, Socket } from 'socket.io-client';
// Agent <-> Agent
import { Peer, DataConnection, ConnectionType, MediaConnection } from 'peerjs';

import {
    EPacketType,
    C_AGENT_Heartbeat_Packet,
    C_WORLD_AgentList_Packet,
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
        x: number | null;
        y: number | null;
        z: number | null;
    } = {
        x: null,
        y: null,
        z: null,
    };
    let TEMP_orientation: {
        x: number | null;
        y: number | null;
        z: number | null;
    } = {
        x: null,
        y: null,
        z: null,
    };

    export const TEMP_updateMetadataLocally = (metadata: {
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number };
    }) => {
        TEMP_position = metadata.position;
        TEMP_orientation = metadata.orientation;
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
        const agentConnections: {
            [key: string]: {
                dataConnection: DataConnection | null;
                mediaConnection: MediaConnection | null;
            };
        } = {};

        export const InitializeAgentModule = (agentId: string) => {
            peer = new Peer(agentId, {
                host: 'localhost', // or the server's address
                port: 3000,
                path: '/myapp',
            });

            peer.on('connection', (conn) => {
                const remoteAgentId = conn.peer;
                console.log(`Received connection from agent ${remoteAgentId}`);
                agentConnections[remoteAgentId] = {
                    dataConnection: conn,
                    mediaConnection: null,
                };

                Audio.TEMP_streamAudio();

                conn.on('data', (data) => {
                    console.log(
                        `Received data from agent ${remoteAgentId}:`,
                        data,
                    );
                    // Handle received data
                });

                conn.on('close', () => {
                    console.log(
                        `Connection closed with agent ${remoteAgentId}`,
                    );
                    delete agentConnections[remoteAgentId];
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
                    mediaConnection: null,
                };

                dataConn.on('open', () => {
                    console.log(`Connected to agent ${agentId}`);
                });

                dataConn.on('data', (data) => {
                    console.log(`Received data from agent ${agentId}:`, data);
                    // Handle received data
                });

                dataConn.on('close', () => {
                    console.log(`Connection closed with agent ${agentId}`);
                    delete agentConnections[agentId];
                });
            }
        };

        export const sendData = (agentId: string, data: any) => {
            if (
                agentConnections[agentId] &&
                agentConnections[agentId].dataConnection
            ) {
                void agentConnections[agentId].dataConnection.send(data);
            }
        };

        export const disconnect = (agentId: string) => {
            if (agentConnections[agentId]) {
                agentConnections[agentId].dataConnection?.close();
                agentConnections[agentId].mediaConnection?.close();
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

                // socket?.on(EPacketType.AUDIO, async (audioData: C_AUDIO_Packet) => {
                //     console.log('#### Received audio stream ####');
                //     if (!audioData.audioData) {
                //         console.info('#### No audio data, not playing audio. ####');
                //         return;
                //     }
                //     if (!TEMP_audioContext) {
                //         TEMP_audioContext = new AudioContext();
                //     }
                //     // const audioDataAsBase64 = audioData.audioData;
                //     // const binaryString = atob(audioDataAsBase64);
                //     // const len = binaryString.length;
                //     // const bytes = new Uint8Array(len);
                //     // for (let i = 0; i < len; i++) {
                //     //     bytes[i] = binaryString.charCodeAt(i);
                //     // }
                //     // const uint8Array = new Uint8Array(bytes);
                //     const audioArrayBuffer = audioData.audioData;
                //     const audioDataAsUint8Array = new Uint8Array(audioArrayBuffer);
                //     console.info('#### POST-RECV Audio data', audioData.audioData);
                //     // Decode the Opus audio data
                //     const decodedAudio = TEMP_opusDecoder.decodeFrame(
                //         audioDataAsUint8Array,
                //     );
                //     await TEMP_opusDecoder.reset();
                //     // Get the decoded PCM samples for the mono channel
                //     const monoChannelData = decodedAudio.channelData[0];
                //     // Create an AudioBuffer for mono audio
                //     const audioBuffer = TEMP_audioContext.createBuffer(
                //         1, // 1 channel for mono
                //         monoChannelData.length,
                //         decodedAudio.sampleRate,
                //     );
                //     audioBuffer.copyToChannel(monoChannelData, 0, 0);
                //     console.info('#### Spatializing audio ####');
                //     const source = TEMP_audioContext.createBufferSource();
                //     source.buffer = audioBuffer;
                //     const panner = TEMP_audioContext.createPanner();
                //     panner.panningModel = 'HRTF';
                //     panner.distanceModel = 'inverse';
                //     panner.refDistance = 1;
                //     panner.maxDistance = 10000;
                //     panner.rolloffFactor = 1;
                //     panner.coneInnerAngle = 360;
                //     panner.coneOuterAngle = 0;
                //     panner.coneOuterGain = 0;
                //     if (
                //         TEMP_position.x !== null &&
                //         TEMP_position.y !== null &&
                //         TEMP_position.z !== null
                //     ) {
                //         panner.positionX.setValueAtTime(
                //             TEMP_position.x,
                //             TEMP_audioContext.currentTime,
                //         );
                //         panner.positionY.setValueAtTime(
                //             TEMP_position.y,
                //             TEMP_audioContext.currentTime,
                //         );
                //         panner.positionZ.setValueAtTime(
                //             TEMP_position.z,
                //             TEMP_audioContext.currentTime,
                //         );
                //     }
                //     if (
                //         TEMP_orientation.x !== null &&
                //         TEMP_orientation.y !== null &&
                //         TEMP_orientation.z !== null
                //     ) {
                //         panner.orientationX.setValueAtTime(
                //             TEMP_orientation.x,
                //             TEMP_audioContext.currentTime,
                //         );
                //         panner.orientationY.setValueAtTime(
                //             TEMP_orientation.y,
                //             TEMP_audioContext.currentTime,
                //         );
                //         panner.orientationZ.setValueAtTime(
                //             TEMP_orientation.z,
                //             TEMP_audioContext.currentTime,
                //         );
                //     }
                //     source.connect(panner);
                //     panner.connect(TEMP_audioContext.destination);
                //     console.info('#### Playing audio ####');
                //     source.start();
                // });
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
                    if (connectionInfo.mediaConnection) {
                        const sender =
                            connectionInfo.mediaConnection.peerConnection
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
                        connectionInfo.mediaConnection = peer.call(
                            agentId,
                            TEMP_mediaStream,
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
