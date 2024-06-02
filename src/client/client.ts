import { io, Socket } from 'socket.io-client';
import { WorldTransport } from '../routes';

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
    export const EstablishConnection = (data: {
        host: string;
        port: number;
    }) => {
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

    export function sendAudioPacket(audioData: WorldTransport.IAudioPacket) {
        socket?.emit(WorldTransport.PacketType.Audio, audioData);
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
    socket?.on(
        WorldTransport.PacketType.Audio,
        (audioData: WorldTransport.IAudioPacket) => {
            console.log('Received audio stream');
            if (!audioData.audioData) {
                console.log('No audio data, not playing audio.');
                return;
            }
            const audio = new Audio(audioData.audioData as string);
            audio
                .play()
                .catch((error) => console.error('Error playing audio:', error));
        },
    );
}
