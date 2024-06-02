import { EPacketType, IAudioPacket } from './meta';

export interface IRouter {
    [EPacketType.Audio]: (socket: Socket, data: IAudioPacket) => void;
}

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

            socket.on(EPacketType.Audio, (audioData: IAudioPacket) => {
                // Broadcast audio data to all clients including the sender
                console.log('audioStream received:', audioData);
                io.emit(EPacketType.Audio, audioData); // Changed from socket.broadcast.emit to io.emit
            });
        });
    }
}
