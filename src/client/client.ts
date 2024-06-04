import { io, Socket } from 'socket.io-client';
import {
    EPacketType,
    C_AUDIO_Packet,
    C_AGENT_Heartbeat_Packet,
    C_AGENT_Candidate_Packet,
    C_AGENT_Offer_Packet,
    C_AGENT_Answer_Packet,
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
    let TEMP_userId: string | null = null;
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

    export const isConnected = () => socket?.connected ?? false;

    export namespace Setup {
        let maintainInterval: ReturnType<typeof setInterval> | null = null;

        export const initializeAndConnectTo = (data: {
            // TODO: defaults should be in config
            host: string;
            port: number;
        }) => {
            if (socket) {
                socket.removeAllListeners();
                socket.close();
                console.log('Closed existing socket.');
            }

            socket = io(`${data.host}:${data.port}`, {});

            Audio.init();
            Agent.init();

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

            // Set up listeners.
        };

        const sendMaintainPacket = () => {
            socket?.emit(
                EPacketType.AGENT_Heartbeat,
                new C_AGENT_Heartbeat_Packet({
                    senderId: TEMP_userId,
                }),
            );
        };
    }

    export namespace Agent {
        const agentConnections: { [key: string]: RTCPeerConnection } = {};

        export const init = () => {
            socket?.on(
                EPacketType.AGENT_Offer,
                async (message: C_AGENT_Offer_Packet) => {
                    const { senderId } = message;
                    if (!senderId) {
                        console.error(
                            'Invalid senderId received in AGENT_Offer',
                        );
                        return;
                    }
                    if (!agentConnections[senderId]) {
                        createConnection(senderId);
                    }
                    await agentConnections[senderId].setRemoteDescription(
                        new RTCSessionDescription({
                            type: 'offer',
                            sdp: message.sdp,
                        }),
                    );
                    const answer =
                        await agentConnections[senderId].createAnswer();
                    await agentConnections[senderId].setLocalDescription(
                        answer,
                    );

                    if (answer.sdp) {
                        socket?.emit(
                            EPacketType.AGENT_Answer,
                            new C_AGENT_Answer_Packet({
                                senderId,
                                sdp: answer.sdp,
                            }),
                        );
                    }
                },
            );

            socket?.on(
                EPacketType.AGENT_Answer,
                async (message: C_AGENT_Answer_Packet) => {
                    const { senderId } = message;
                    if (!senderId) {
                        console.error(
                            'Invalid senderId received in AGENT_Answer',
                        );
                        return;
                    }
                    if (!agentConnections[senderId]) {
                        createConnection(senderId);
                    }
                    await agentConnections[senderId].setRemoteDescription(
                        new RTCSessionDescription({
                            type: 'answer',
                            sdp: message.sdp,
                        }),
                    );
                },
            );

            socket?.on(
                EPacketType.AGENT_Candidate,
                async (message: C_AGENT_Candidate_Packet) => {
                    const { senderId, candidate } = message;
                    if (!senderId) {
                        console.error(
                            'Invalid senderId received in AGENT_Candidate',
                        );
                        return;
                    }
                    if (!agentConnections[senderId]) {
                        createConnection(senderId);
                    }
                    await agentConnections[senderId].addIceCandidate(
                        new RTCIceCandidate(candidate),
                    );
                },
            );

            socket?.on(
                EPacketType.WORLD_AgentList,
                (message: C_WORLD_AgentList_Packet) => {
                    const { agentList } = message;
                    console.log('Received agent list:', agentList);

                    // Remove connections for agents no longer present
                    Object.keys(agentConnections).forEach((agentId) => {
                        if (!agentList.includes(agentId)) {
                            closeAndRemoveConnection(agentId);
                        }
                    });

                    // Establish new connections for new agents
                    agentList.forEach((agentId) => {
                        if (!agentConnections[agentId]) {
                            Agent.createConnection(agentId);
                        }
                    });
                },
            );
        };

        export const createConnection = (userId: string) => {
            if (agentConnections[userId]) {
                console.log(`Connection already exists for user ${userId}`);
                return; // Exit if a connection already exists
            }

            const newPeerConnection = new RTCPeerConnection({
                iceServers: TEMP_ICE_SERVERS, // Ensure to use ICE servers configuration
            });
            agentConnections[userId] = newPeerConnection;

            newPeerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit(
                        EPacketType.AGENT_Candidate,
                        new C_AGENT_Candidate_Packet({
                            senderId: userId,
                            candidate: event.candidate,
                        }),
                    );
                }
            };

            newPeerConnection.ontrack = (event) => {
                const remoteStream = event.streams[0];
                // Handle the remote stream (e.g., play audio)
                // ...
            };
        };

        export const closeAndRemoveConnection = (agentId: string) => {
            if (agentConnections[agentId]) {
                // Close the connection if needed, e.g., close any data channels or streams
                agentConnections[agentId].close();
                // Remove from the agentConnections object
                delete agentConnections[agentId];
                console.log(
                    `Connection closed and removed for agent ${agentId}`,
                );
            }
        };

        export const addLocalStream = async (userId: string) => {
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            localStream.getTracks().forEach((track) => {
                agentConnections[userId].addTrack(track, localStream);
            });
        };

        export const createOffer = async (userId: string) => {
            if (!agentConnections[userId]) {
                console.error(
                    'Agent connection not initialized for user:',
                    userId,
                );
                return;
            }

            const offer = await agentConnections[userId].createOffer();
            await agentConnections[userId].setLocalDescription(offer);

            if (offer.sdp === undefined) {
                console.error('Offer SDP is undefined for user:', userId);
                return;
            }

            socket?.emit(
                EPacketType.AGENT_Offer,
                new C_AGENT_Offer_Packet({
                    senderId: userId,
                    sdp: offer.sdp,
                }),
            );
        };
    }

    export const TEMP_updateMetadataLocally = (metadata: {
        userId: string;
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number };
    }) => {
        TEMP_userId = metadata.userId;
        TEMP_position = metadata.position;
        TEMP_orientation = metadata.orientation;
    };

    export namespace Audio {
        let audioContext: AudioContext | null = null;

        export const init = () => {
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

        export function TEMP_streamAudio(stream: MediaStream) {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm; codecs=opus',
            });
            // const reader = new FileReader();

            mediaRecorder.ondataavailable = async (event) => {
                const audioBlob = event.data;
                if (audioBlob.size === 0) {
                    // Skip processing and sending empty audio data
                    return;
                }

                // reader.onloadend = () => {
                //     const base64String = reader.result as string;
                //     const base64Data = base64String.split(',')[1]; // Remove the data URL header
                //     sendAudioPacket({
                //         audioData: base64Data,
                //         audioPosition: TEMP_position,
                //         audioOrientation: TEMP_orientation,
                //         TEMP_senderId: TEMP_userId,
                //     });
                // };
                // reader.readAsDataURL(audioBlob);

                const arrayBuffer = await audioBlob.arrayBuffer();

                TEMP_sendAudioPacket(
                    new C_AUDIO_Packet({
                        audioData: arrayBuffer,
                        audioPosition: TEMP_position,
                        audioOrientation: TEMP_orientation,
                        senderId: TEMP_userId,
                    }),
                );
            };
            mediaRecorder.start(750); // Emit data every 750 milliseconds (0.75 seconds)
        }

        const TEMP_sendAudioPacket = (audioData: C_AUDIO_Packet) => {
            console.info('#### PRE-SEND Audio data size', audioData.audioData);
            socket?.emit(EPacketType.AUDIO, audioData);
        };
    }
}
