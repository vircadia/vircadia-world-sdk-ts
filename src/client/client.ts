import { io, Socket } from 'socket.io-client';
import { EPacketType, IAudioPacket } from '../routes/meta';

let audioContext: AudioContext | null = null;
let socket: Socket | null = null;
let TEMP_userId: string | null = null;
// FIXME: This is temp, avatars shouldn't exist, all avatars should simply be entities.
let TEMP_position: { x: number | null; y: number | null; z: number | null } = {
    x: null,
    y: null,
    z: null,
};
let TEMP_orientation: { x: number | null; y: number | null; z: number | null } =
    {
        x: null,
        y: null,
        z: null,
    };

export namespace Client {
    export const isConnected = () => socket?.connected;

    export const establishConnection = (data: {
        host: string;
        port: number;
    }) => {
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        if (socket) {
            socket.removeAllListeners();
            socket.close();
            console.log('Closed existing socket.');
        }

        socket = io(`${data.host}:${data.port}`);

        // Listening to events
        socket.on('connect', () => {
            console.log('Connected to server at ${data.host}:${data.port}');
        });
    };

    export function streamAudio(stream: MediaStream) {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            const audioBlob = event.data;
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64data = reader.result;
                sendAudioPacket({
                    audioData: base64data,
                    audioPosition: TEMP_position,
                    audioOrientation: TEMP_orientation,
                    TEMP_senderId: TEMP_userId,
                });
            };
        };
        mediaRecorder.start(250); // Emit data every 250 milliseconds (0.25 seconds)
    }

    export function sendAudioPacket(audioData: IAudioPacket) {
        socket?.emit(EPacketType.Audio, audioData);
    }

    export function TEMP_updateMetadata(metadata: {
        userId: string;
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number };
    }) {
        TEMP_userId = metadata.userId;
        TEMP_position = metadata.position;
        TEMP_orientation = metadata.orientation;
    }

    // Function to play incoming audio
    socket?.on(EPacketType.Audio, (audioData: IAudioPacket) => {
        console.log('Received audio stream');
        if (!audioData.audioData) {
            console.log('No audio data, not playing audio.');
            return;
        }

        if (!audioContext) {
            console.log('No audio context, not playing audio.');
            return;
        }

        // Decode the audio data from base64 to ArrayBuffer
        const audioBuffer = atob(audioData.audioData as string);
        const arrayBuffer = new Uint8Array(audioBuffer.length);
        for (let i = 0; i < audioBuffer.length; i++) {
            arrayBuffer[i] = audioBuffer.charCodeAt(i);
        }

        audioContext.decodeAudioData(
            arrayBuffer.buffer,
            (buffer) => {
                if (!audioContext) {
                    console.log('No audio context, not playing audio.');
                    return;
                }

                console.info('#### Playing audio ####');

                const source = audioContext.createBufferSource();
                source.buffer = buffer;

                const panner = audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 0;
                panner.coneOuterGain = 0;

                if (
                    TEMP_position.x !== null &&
                    TEMP_position.y !== null &&
                    TEMP_position.z !== null
                ) {
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

                if (
                    TEMP_orientation.x !== null &&
                    TEMP_orientation.y !== null &&
                    TEMP_orientation.z !== null
                ) {
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

                source.connect(panner);
                panner.connect(audioContext.destination);
                source.start();
            },
            (error) => console.error('Error decoding audio data:', error),
        );
    });
}
