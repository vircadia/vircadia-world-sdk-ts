//
//
// Meta Requests (internals, like status, config, etc.)
//
//

import { Router } from 'express';

// Create a router instance
const router = Router();

// Define an example route
router.get('/status', (req, res) => {
    res.json({
        message:
            'We should return the config and the status of the server, mainly to assist in initiating connections with the WS and other services provided.',
    });
});

export { router as MetaRequest };

//
//
// World Transport (all else, audio, avatars, world, etc.)
//
//

import { Server, Socket } from 'socket.io';

export namespace WorldTransport {
    export enum PacketType {
        Audio = 'AudioPacket',
    }

    export interface IAudioPacket {
        audioData: string | ArrayBuffer | null;
        audioPosition: {
            x: number | null;
            y: number | null;
            z: number | null;
        };
        audioOrientation: {
            x: number | null;
            y: number | null;
            z: number | null;
        };
        TEMP_senderId: string | null;
    }

    // Define the structure of the Router with detailed event handlers
    export interface IRouter {
        [PacketType.Audio]: (socket: Socket, data: IAudioPacket) => void;
    }

    export function Router(io: Server): void {
        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });

            // socket.on('audioStream', (audioData) => {
            //     // Broadcast audio data to all clients except the sender
            //     console.log('audioStream received:', audioData);
            //     socket.broadcast.emit('audioStream', audioData);
            // });

            socket.on(PacketType.Audio, (audioData: IAudioPacket) => {
                // Broadcast audio data to all clients including the sender
                console.log('audioStream received:', audioData);
                io.emit(PacketType.Audio, audioData); // Changed from socket.broadcast.emit to io.emit
            });
        });
    }
}
