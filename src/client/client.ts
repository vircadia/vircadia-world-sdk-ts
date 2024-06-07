// Agent <-> Server
import { io, Socket } from 'socket.io-client';
// Agent <-> Agent
import { Peer, DataConnection, MediaConnection } from 'peerjs';

import {
    EPacketType,
    C_AGENT_WorldHeartbeat_Packet,
    C_WORLD_AgentList_Packet,
    C_AUDIO_Metadata_Packet,
} from '../routes/meta';

// FIXME: This should be defined in config.
const TEMP_ICE_SERVERS = [
    {
        urls: ['stun:stun.l.google.com:19302'],
    },
];

const TEMP_AUDIO_METADATA_INTERVAL = 250;

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
                EPacketType.AGENT_Heartbeat,
                new C_AGENT_WorldHeartbeat_Packet({
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
                data: {
                    isOpening: boolean;
                    connection: DataConnection | null;
                };
                media: {
                    isOpening: boolean;
                    connection: MediaConnection | null;
                    metadata: C_AUDIO_Metadata_Packet | null;
                    currentStreamSymbol: symbol | null;
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

            peer.on('connection', (conn: DataConnection) => {
                console.log(
                    `${AGENT_LOG_PREFIX} Incoming data connection from ${conn.peer}`,
                );
                const existingConnection =
                    agentConnections[conn.peer]?.data.connection;

                if (existingConnection) {
                    // If a connection exists, it is either loading or open, we ASSUME that closed connections were removed from the other listeners.
                    console.info(
                        `${AGENT_LOG_PREFIX} Data connection already exists with agent ${conn.peer}. Ignoring.`,
                    );
                } else {
                    if (!agentConnections[conn.peer]) {
                        createAgent(conn.peer);
                    }

                    const remoteAgentId = conn.peer;

                    agentConnections[remoteAgentId].data.isOpening = true;

                    console.log(
                        `Received data connection from agent ${remoteAgentId}`,
                    );

                    agentConnections[remoteAgentId].data.connection = conn;

                    setupDataConnectionAfterEstablishment({
                        agentId: remoteAgentId,
                    });

                    agentConnections[conn.peer].data.isOpening = false;
                }
            });

            peer.on('call', async (call: MediaConnection) => {
                console.log(
                    `${AGENT_LOG_PREFIX} Incoming media connection from ${call.peer}`,
                );
                const existingConnection =
                    agentConnections[call.peer]?.media.connection;

                if (existingConnection) {
                    // If a connection exists, it is either loading or open, we ASSUME that closed connections were removed from the other listeners.
                    console.info(
                        `${AGENT_LOG_PREFIX} Media connection already exists with agent ${call.peer}. Ignoring.`,
                    );
                    // Exit if connection is already open
                } else {
                    if (!agentConnections[call.peer]) {
                        createAgent(call.peer);
                    }

                    const remoteAgentId = call.peer;

                    agentConnections[remoteAgentId].media.isOpening = true;

                    console.log(
                        `${AGENT_LOG_PREFIX} Received a media call from:`,
                        remoteAgentId,
                    );

                    const acceptedCall = await acceptMediaCall(call);

                    if (acceptedCall) {
                        // Recheck if the agent still exists and no new connection has been established
                        if (
                            agentConnections[remoteAgentId] &&
                            !agentConnections[remoteAgentId].media.connection
                        ) {
                            agentConnections[remoteAgentId].media.connection =
                                call;

                            setupMediaConnectionAfterEstablishment({
                                agentId: remoteAgentId,
                            });
                        } else {
                            console.warn(
                                `Connection state changed before assignment for agent ${remoteAgentId}`,
                            );
                        }
                    }

                    agentConnections[remoteAgentId].media.isOpening = false;
                }
            });

            socket?.on(EPacketType.WORLD_AgentList, handleAgentListUpdate);
        };

        const removeDataConnection = (agentId: string) => {
            const agentConnection = agentConnections[agentId];
            if (agentConnection?.data.connection) {
                if (agentConnection?.data.connection?.open) {
                    agentConnection.data.connection.close();
                }
                agentConnection.data.connection = null;
            }
        };

        const removeMediaConnection = (agentId: string) => {
            console.info(
                `${AGENT_LOG_PREFIX} Removing media connection with agent ${agentId}`,
            );
            const agentConnection = agentConnections[agentId];
            if (agentConnection?.media?.connection) {
                if (agentConnection.media.connection.open) {
                    agentConnection.media.connection.close();
                }
                agentConnection.media.connection = null;
            }
        };

        const handleAgentListUpdate = (message: C_WORLD_AgentList_Packet) => {
            // console.log('Received agent list update');
            const { agentList } = message;
            // console.log('Updated agent list:', agentList);

            // Remove connections for agents no longer present
            Object.keys(agentConnections).forEach((agentId) => {
                if (!agentList.includes(agentId)) {
                    void removeAgent(agentId);
                }
            });

            // Establish new connections for new agents
            agentList.forEach((agentId) => {
                if (agentId !== peer?.id) {
                    const agentConnection = agentConnections[agentId];

                    if (!agentConnection) {
                        createAgent(agentId);
                    }

                    if (!agentConnection.data.connection) {
                        createDataConnection(agentId);
                    }

                    if (!agentConnection.media.connection) {
                        createMediaConnection(agentId);
                    }
                }
            });
        };

        const createAgent = (agentId: string) => {
            agentConnections[agentId] = {
                data: {
                    isOpening: false,
                    connection: null,
                },
                media: {
                    isOpening: false,
                    connection: null,
                    metadata: null,
                    currentStreamSymbol: null,
                },
            };
            console.info(
                `${AGENT_LOG_PREFIX} Created agent ${agentId} in agent connections`,
            );
        };

        const removeAgent = async (agentId: string) => {
            if (agentConnections[agentId]) {
                removeDataConnection(agentId);
                removeMediaConnection(agentId);
                delete agentConnections[agentId];
                console.info(
                    `${AGENT_LOG_PREFIX} Removed agent ${agentId} from agent connections`,
                );
            }
        };

        const acceptMediaCall = async (
            mediaCall: MediaConnection,
        ): Promise<boolean> => {
            const localStream = Media.getLocalStream({ kind: 'audio' });

            if (!localStream) {
                console.error(
                    'No local audio stream available to answer the call.',
                );
                return false;
            }

            if (localStream.getAudioTracks().length === 0) {
                console.error('Local audio stream has no audio tracks.');
                return false;
            }

            mediaCall.answer(localStream);

            const agentConnection = agentConnections[mediaCall.peer];
            if (!agentConnection) {
                createAgent(mediaCall.peer);
            }

            if (agentConnection?.media.connection) {
                removeMediaConnection(mediaCall.peer);
            }

            agentConnections[mediaCall.peer].media.connection = mediaCall;

            return true;
        };

        const createDataConnection = (agentId: string) => {
            const agentConnection = agentConnections[agentId];

            if (peer && agentConnection) {
                const dataConn = peer.connect(agentId);
                if (!dataConn) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Failed to establish data connection with agent ${agentId}`,
                    );
                    return;
                }

                agentConnection.data.connection = dataConn;

                console.info(
                    `${AGENT_LOG_PREFIX} Created and established data connection with agent ${agentId}`,
                );

                setupDataConnectionAfterEstablishment({
                    agentId,
                });
            }
        };

        const createMediaConnection = (agentId: string) => {
            const agentConnection = agentConnections[agentId];
            const localStream = Media.getLocalStream({ kind: 'audio' });

            if (!localStream) {
                console.error(
                    'No local audio stream available to initiate the call.',
                );
                return;
            }

            if (localStream.getAudioTracks().length === 0) {
                console.error('Local audio stream has no audio tracks.');
                return;
            }

            if (peer && agentConnection) {
                const mediaConn = peer.call(agentId, localStream);
                if (!mediaConn) {
                    console.error(
                        `${AGENT_LOG_PREFIX} Failed to establish media connection with agent ${agentId}`,
                    );
                    return;
                }

                agentConnection.media.connection = mediaConn;

                console.info(
                    `${AGENT_LOG_PREFIX} Created and established media connection with agent ${agentId}`,
                );

                setupMediaConnectionAfterEstablishment({
                    agentId,
                });
            } else {
                console.error(
                    `${AGENT_LOG_PREFIX} Failed to establish media connection with agent ${agentId}`,
                );
            }
        };

        const setupDataConnectionAfterEstablishment = (data: {
            agentId: string;
        }) => {
            const dataConnection =
                agentConnections[data.agentId].data.connection;
            dataConnection?.on('data', (dataReceived) => {
                console.info(
                    `Received data from agent ${data.agentId}:`,
                    dataReceived,
                    'is audio packet:',
                    'audioPosition' in dataReceived &&
                    'audioOrientation' in dataReceived, // Assuming these properties are unique to C_AUDIO_Metadata_Packet
                );
                if (
                    'audioPosition' in dataReceived &&
                    'audioOrientation' in dataReceived
                ) {
                    agentConnections[data.agentId].media.metadata =
                        dataReceived as C_AUDIO_Metadata_Packet;
                }
            });

            dataConnection?.on('close', () => {
                agentConnections[data.agentId].data.connection = null;
                console.log(
                    `Data connection closed with agent ${data.agentId}`,
                );
            });

            dataConnection?.on('open', () => {
                console.log(
                    `${AGENT_LOG_PREFIX} Finished establishing data connection with agent ${data.agentId}`,
                );
            });
        };

        const setupMediaConnectionAfterEstablishment = (data: {
            agentId: string;
        }) => {
            const mediaConnection =
                agentConnections[data.agentId].media.connection;
            mediaConnection?.on('stream', (remoteStream) => {
                console.log(
                    `Received remote stream from agent ${data.agentId}`,
                );
                void Media.handleIncomingStream({
                    stream: remoteStream,
                    agentId: data.agentId,
                });

                // Send a test audio message after a short delay
                setTimeout(() => {
                    void Media.testAudioConnection(data.agentId);
                }, 2500);
            });

            mediaConnection?.on('close', () => {
                agentConnections[data.agentId].media.connection = null;
                console.log(
                    `Media connection closed with agent ${data.agentId}`,
                );
            });

            mediaConnection?.on('error', (error) => {
                console.error(
                    `Media connection error with agent ${data.agentId}:`,
                    error,
                );
            });

            console.log(
                `${AGENT_LOG_PREFIX} Finished establishing media connection with agent ${data.agentId}`,
            );
        };

        export const sendHeartbeatToAgents = () => {
            Object.entries(agentConnections).forEach(
                ([agentId, connection]) => {
                    if (
                        connection.data.connection &&
                        connection.data.connection.open &&
                        TEMP_position &&
                        TEMP_orientation
                    ) {
                        const packet = new C_AUDIO_Metadata_Packet({
                            senderId: TEMP_agentId,
                            audioPosition: TEMP_position,
                            audioOrientation: TEMP_orientation,
                        });
                        void connection.data.connection.send(packet);
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

        export namespace Media {
            const MEDIA_LOG_PREFIX = '[MEDIA]';

            let audioContext: AudioContext | null = null;
            // eslint-disable-next-line prefer-const
            let localAudioStream: MediaStream | null = null;
            const localVideoStream: MediaStream | null = null;

            export const InitializeMediaModule = () => {
                audioContext = new AudioContext();
            };

            export const testAudioConnection = (
                agentId: string,
            ): Promise<void> => {
                // return new Promise((resolve, reject) => {
                //     const connection =
                //         agentConnections[agentId]?.media.connection;
                //     const connectionStatus = connection?.open;
                //     const audioContextStatus = audioContext?.state;
                //     if (
                //         connectionStatus &&
                //         audioContext &&
                //         audioContextStatus === 'running'
                //     ) {
                //         const oscillator = audioContext.createOscillator();
                //         oscillator.type = 'sine';
                //         oscillator.frequency.setValueAtTime(
                //             440,
                //             audioContext.currentTime,
                //         );
                //         const destination =
                //             audioContext.createMediaStreamDestination();
                //         oscillator.connect(destination);
                //         oscillator.start();
                //         const testStream = destination.stream;
                //         const senders = connection.peerConnection.getSenders();
                //         if (senders.length === 0) {
                //             console.error(
                //                 `${MEDIA_LOG_PREFIX} No senders available in peer connection.`,
                //             );
                //             reject('No senders available in peer connection.');
                //             return;
                //         }
                //         Promise.all(
                //             senders.map((sender) => {
                //                 if (
                //                     sender.track &&
                //                     sender.track.kind === 'audio'
                //                 ) {
                //                     return sender.replaceTrack(
                //                         testStream.getAudioTracks()[0],
                //                     );
                //                 }
                //                 return Promise.resolve();
                //             }),
                //         )
                //             .then(() => {
                //                 setTimeout(() => {
                //                     oscillator.stop();
                //                     oscillator.disconnect();
                //                     console.log(
                //                         `${MEDIA_LOG_PREFIX} Sent test audio to agent ${agentId}`,
                //                     );
                //                     resolve();
                //                 }, 1000);
                //             })
                //             .catch((error) => {
                //                 console.error(
                //                     `${MEDIA_LOG_PREFIX} Error replacing track:`,
                //                     error,
                //                 );
                //                 reject(error);
                //             });
                //     } else {
                //         console.warn(
                //             `${MEDIA_LOG_PREFIX} Failed to send test audio packet ${agentId}`,
                //             connection,
                //             audioContext,
                //         );
                //         reject('Connection or audio context not ready.');
                //     }
                // });
            };

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
                                agentConnection.data.connection,
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
