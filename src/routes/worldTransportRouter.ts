import {
    E_PacketType,
    C_AUDIO_Metadata_Packet,
    C_AGENT_WorldHeartbeat_Packet,
    C_WORLD_AgentList_Packet,
} from './meta.js';

export interface IRouter {
    [E_PacketType.AUDIO_Metadata]: (
        socket: Socket,
        data: C_AUDIO_Metadata_Packet,
    ) => void;
}

// TODO:
const TEMP_ROUTER_USER_ID = 'xxx';

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
            // Validate active connections
            connectedPeers.forEach((agentId) => {
                const socketId = agentSocketMap.get(agentId);
                if (!socketId) {
                    return;
                }
                const socket =
                    WorldTransportServer?.sockets.sockets.get(socketId);
                if (!socket) {
                    agentSocketMap.delete(agentId);
                    console.log('Removed inactive agent:', agentId);
                }
            });

            WorldTransportServer?.emit(
                E_PacketType.WORLD_AgentList,
                new C_WORLD_AgentList_Packet({
                    senderId: TEMP_ROUTER_USER_ID,
                    agentList: Array.from(agentSocketMap.keys()),
                }),
            );
            console.log(
                'Periodic broadcasting of connected peers:',
                Array.from(agentSocketMap.keys()),
            );
        }, 1000);

        WorldTransportServer?.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on(E_PacketType.AGENT_Join, async ({ agentId }) => {
                await socket.join(agentId);
                socket.broadcast.emit(E_PacketType.AGENT_Join, agentId);
            });

            socket.on(E_PacketType.AGENT_Offer, ({ offer, to }) => {
                socket.to(to).emit(E_PacketType.AGENT_Offer, {
                    offer,
                    from: socket.id,
                });
            });

            socket.on(E_PacketType.AGENT_Answer, ({ answer, to }) => {
                socket.to(to).emit(E_PacketType.AGENT_Answer, {
                    answer,
                    from: socket.id,
                });
            });

            socket.on(E_PacketType.AGENT_ICE_Candidate, ({ candidate, to }) => {
                socket.to(to).emit(E_PacketType.AGENT_ICE_Candidate, {
                    candidate,
                    from: socket.id,
                });
            });

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
                    console.log('User disconnected and removed:', agentId);
                }
                WorldTransportServer?.emit(
                    E_PacketType.WORLD_AgentList,
                    new C_WORLD_AgentList_Packet({
                        senderId: TEMP_ROUTER_USER_ID,
                        agentList: Array.from(agentSocketMap.keys()),
                    }),
                );
            });

            Agent.InitializeAgentModule(socket);
        });
    }

    export namespace Agent {
        const LOG_PREFIX = '[AGENT]'; // Corrected typo from LOG_PREIX to LOG_PREFIX

        export function InitializeAgentModule(socket: Socket): void {
            socket.on(
                E_PacketType.AGENT_Heartbeat,
                (data: C_AGENT_WorldHeartbeat_Packet) => {
                    console.log(
                        `${LOG_PREFIX} Received WORLD_Maintain from:`,
                        data.senderId,
                    );
                    if (data.senderId) {
                        agentSocketMap.set(data.senderId, socket.id);
                        WorldTransportServer?.emit(
                            E_PacketType.WORLD_AgentList,
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
