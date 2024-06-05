import {
    EPacketType,
    C_AUDIO_Metadata_Packet,
    C_AGENT_Heartbeat_Packet,
    C_WORLD_AgentList_Packet,
} from './meta';

export interface IRouter {
    [EPacketType.AUDIO_Metadata]: (
        socket: Socket,
        data: C_AUDIO_Metadata_Packet,
    ) => void;
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

            Agent.InitializeAgentModule(socket);
        });
    }

    export namespace Agent {
        const LOG_PREFIX = '[AGENT]'; // Corrected typo from LOG_PREIX to LOG_PREFIX

        export function InitializeAgentModule(socket: Socket): void {
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
        }
    }
}
