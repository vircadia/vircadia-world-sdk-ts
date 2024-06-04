import {
    EPacketType,
    C_AUDIO_Packet,
    C_AGENT_Offer_Packet,
    C_AGENT_Answer_Packet,
    C_AGENT_Candidate_Packet,
    C_AGENT_Heartbeat_Packet,
    C_WORLD_AgentList_Packet,
} from './meta';

export interface IRouter {
    [EPacketType.AUDIO]: (socket: Socket, data: C_AUDIO_Packet) => void;
}

// TODO:
const TEMP_ROUTER_USER_ID = 'xxx';

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

let WorldTransportServer: Server | null = null;

export namespace WorldTransport {
    const agentSocketMap = new Map<string, string>(); // Maps agentId to socketId

    let signalActiveUsersInterval: NodeJS.Timeout | null = null;

    export function Router(io: Server): void {
        WorldTransportServer = io;

        signalActiveUsersInterval = setInterval(() => {
            const connectedPeers = Array.from(agentSocketMap.keys());
            WorldTransportServer?.emit(
                EPacketType.WORLD_AgentList,
                new C_WORLD_AgentList_Packet({
                    senderId: TEMP_ROUTER_USER_ID,
                    agentList: connectedPeers,
                }),
            );
            console.log(
                'Periodic broadcasting of connected peers:',
                connectedPeers,
            );
        }, 1000);

        WorldTransportServer?.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('disconnect', () => {
                socket.removeAllListeners();

                // Reverse lookup to find agentId by socket.id
                let agentId = null;
                for (const [key, value] of agentSocketMap.entries()) {
                    if (value === socket.id) {
                        agentId = key;
                        break;
                    }
                }

                if (agentId) {
                    agentSocketMap.delete(agentId);
                }
                WorldTransportServer?.emit(
                    EPacketType.WORLD_AgentList,
                    new C_WORLD_AgentList_Packet({
                        senderId: TEMP_ROUTER_USER_ID,
                        agentList: Array.from(agentSocketMap.keys()),
                    }),
                );

                console.log('User disconnected:', socket.id);
            });

            Agent.init(socket);
            Audio.init(socket);
        });
    }

    export namespace Agent {
        const LOG_PREFIX = '[AGENT]'; // Corrected typo from LOG_PREIX to LOG_PREFIX

        export function init(socket: Socket): void {
            socket.on(
                EPacketType.AGENT_Heartbeat,
                (data: C_AGENT_Heartbeat_Packet) => {
                    console.log(
                        `${LOG_PREFIX} Received WORLD_Maintain from:`,
                        data.senderId,
                    );
                    if (data.senderId) {
                        agentSocketMap.set(data.senderId, socket.id);
                        WorldTransportServer?.emit(
                            EPacketType.WORLD_AgentList,
                            new C_WORLD_AgentList_Packet({
                                senderId: TEMP_ROUTER_USER_ID,
                                agentList: Array.from(agentSocketMap.keys()),
                            }),
                        );
                        console.log(
                            `${LOG_PREFIX} Updated agent list after heartbeat.`,
                        );
                    }
                },
            );

            socket.on(
                EPacketType.AGENT_Offer,
                (offerData: C_AGENT_Offer_Packet) => {
                    if (offerData.senderId && offerData.receiverId) {
                        console.log(
                            `${LOG_PREFIX} Received AGENT_Offer from:`,
                            offerData.senderId,
                            'to:',
                            offerData.receiverId
                                ? offerData.receiverId
                                : offerData.senderId,
                        );

                        socket
                            .to(offerData.receiverId)
                            .emit(EPacketType.AGENT_Offer, offerData);
                        console.log(
                            `${LOG_PREFIX} Offer routed to receiverId: ${offerData.receiverId}`,
                        );
                    } else {
                        console.log(
                            `${LOG_PREFIX} Invalid senderId/receiverId received in AGENT_Offer`,
                        );
                    }
                },
            );

            socket.on(
                EPacketType.AGENT_Answer,
                (answerData: C_AGENT_Answer_Packet) => {
                    if (answerData.senderId && answerData.receiverId) {
                        console.log(
                            `${LOG_PREFIX} Received AGENT_Answer from:`,
                            answerData.senderId,
                            'to:',
                            answerData.receiverId
                                ? answerData.receiverId
                                : answerData.senderId,
                        );

                        socket
                            .to(answerData.receiverId)
                            .emit(EPacketType.AGENT_Answer, answerData);
                        console.log(
                            `${LOG_PREFIX} Answer routed to receiverId: ${answerData.receiverId}`,
                        );
                    } else {
                        console.log(
                            `${LOG_PREFIX} Invalid senderId/receiverId received in AGENT_Answer`,
                        );
                    }
                },
            );

            socket.on(
                EPacketType.AGENT_Candidate,
                (candidateData: C_AGENT_Candidate_Packet) => {
                    if (candidateData.senderId && candidateData.receiverId) {
                        console.log(
                            `${LOG_PREFIX} Received AGENT_Candidate from:`,
                            candidateData.senderId,
                            'to:',
                            candidateData.receiverId
                                ? candidateData.receiverId
                                : candidateData.senderId,
                        );
                        socket
                            .to(candidateData.receiverId)
                            .emit(EPacketType.AGENT_Candidate, candidateData);
                        console.log(
                            `${LOG_PREFIX} Candidate routed to receiverId: ${candidateData.receiverId}`,
                        );
                    } else {
                        console.log(
                            `${LOG_PREFIX} Invalid senderId/receiverId received in AGENT_Candidate`,
                        );
                    }
                },
            );
        }
    }

    export namespace Audio {
        export function init(socket: Socket): void {
            // socket.on('audioStream', (audioData) => {
            //     // Broadcast audio data to all clients except the sender
            //     console.log('audioStream received:', audioData);
            //     socket.broadcast.emit('audioStream', audioData);
            // });

            socket.on(EPacketType.AUDIO, (audioData: C_AUDIO_Packet) => {
                // Broadcast audio data to all clients including the sender
                console.log(
                    'Sending audio packet to all clients. Total connections:',
                    WorldTransportServer?.engine.clientsCount,
                );
                WorldTransportServer?.emit(EPacketType.AUDIO, audioData); // Changed from socket.broadcast.emit to WorldTransportServer?.emit
            });
        }
    }
}
