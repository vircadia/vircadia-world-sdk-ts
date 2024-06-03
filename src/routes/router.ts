import {
    EPacketType,
    C_AUDIO_Packet,
    C_PEER_Offer_Packet,
    C_PEER_Answer_Packet,
    C_PEER_Candidate_Packet,
} from './meta';

export interface IRouter {
    [EPacketType.AUDIO]: (socket: Socket, data: C_AUDIO_Packet) => void;
}

//
//
// Meta Requests (internals, like status, config, etc.)
//
//

import { Router as ExpressRouter } from 'express';

// Create a router instance
const router = ExpressRouter();

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

            socket.on(EPacketType.AUDIO, (audioData: C_AUDIO_Packet) => {
                // Broadcast audio data to all clients including the sender
                console.log(
                    'Sending audio packet to all clients. Total connections:',
                    io.engine.clientsCount,
                );
                io.emit(EPacketType.AUDIO, audioData); // Changed from socket.broadcast.emit to io.emit
            });

            socket.on(
                EPacketType.PEER_Offer,
                (offerData: C_PEER_Offer_Packet) => {
                    if (offerData.senderId) {
                        // Ensure senderId is not null
                        console.log(
                            'Received PEER_Offer from:',
                            offerData.senderId,
                            'to:',
                            offerData.receiverId
                                ? offerData.receiverId
                                : offerData.senderId,
                        );

                        if (offerData.receiverId) {
                            socket
                                .to(offerData.receiverId)
                                .emit(EPacketType.PEER_Offer, offerData);
                        } else {
                            socket
                                .to(offerData.senderId)
                                .emit(EPacketType.PEER_Offer, offerData);
                        }
                    } else {
                        console.log('Invalid senderId received in PEER_Offer');
                    }
                },
            );

            socket.on(
                EPacketType.PEER_Answer,
                (answerData: C_PEER_Answer_Packet) => {
                    if (answerData.senderId) {
                        // Ensure senderId is not null
                        console.log(
                            'Received PEER_Answer from:',
                            answerData.senderId,
                            'to:',
                            answerData.receiverId
                                ? answerData.receiverId
                                : answerData.senderId,
                        );
                        if (answerData.receiverId) {
                            socket
                                .to(answerData.receiverId)
                                .emit(EPacketType.PEER_Answer, answerData);
                        } else {
                            socket
                                .to(answerData.senderId)
                                .emit(EPacketType.PEER_Answer, answerData);
                        }
                    } else {
                        console.log('Invalid senderId received in PEER_Answer');
                    }
                },
            );

            socket.on(
                EPacketType.PEER_Candidate,
                (candidateData: C_PEER_Candidate_Packet) => {
                    if (candidateData.senderId) {
                        // Ensure senderId is not null
                        console.log(
                            'Received PEER_Candidate from:',
                            candidateData.senderId,
                            'to:',
                            candidateData.receiverId
                                ? candidateData.receiverId
                                : candidateData.senderId,
                        );
                        // Emit the ICE candidate to the specific user
                        if (candidateData.receiverId) {
                            socket
                                .to(candidateData.receiverId)
                                .emit(
                                    EPacketType.PEER_Candidate,
                                    candidateData,
                                );
                        } else {
                            socket
                                .to(candidateData.senderId)
                                .emit(
                                    EPacketType.PEER_Candidate,
                                    candidateData,
                                );
                        }
                    } else {
                        console.log(
                            'Invalid senderId received in PEER_Candidate',
                        );
                    }
                },
            );
        });
    }
}
