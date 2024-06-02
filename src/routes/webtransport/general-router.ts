import { Server, Socket } from 'socket.io';

export namespace WebTransport {
    // Define interfaces for the data types used in various socket events
    export interface ISignalData {
        message: string;
        // Add other properties as needed
    }

    export interface IRoomData {
        roomId: string;
        // Add other properties as needed
    }

    // Define the structure of the Router with detailed event handlers
    export interface IRouter {
        signal: (socket: Socket, data: ISignalData) => void;
        joinRoom: (socket: Socket, data: IRoomData) => void;
        leaveRoom: (socket: Socket, data: IRoomData) => void;
    }

    export function Router(io: Server): void {
        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });

            socket.on('signal', (data: ISignalData) => {
                console.log('Signal received:', data);
                handleSignal(socket, data);
            });

            socket.on('join-room', (data: IRoomData) => {
                console.log('Joining room:', data.roomId);
                handleJoinRoom(socket, data);
            });

            socket.on('leave-room', (data: IRoomData) => {
                console.log('Leaving room:', data.roomId);
                handleLeaveRoom(socket, data);
            });
        });
    }

    // Implementations of the event handlers
    const handleSignal: IRouter['signal'] = (socket, data) => {
        // Implement your signaling logic here
        console.log(`Handled signal for ${socket.id} with data:`, data);
    };

    const handleJoinRoom: IRouter['joinRoom'] = (socket, data) => {
        socket.join(data.roomId);
        console.log(`${socket.id} joined room ${data.roomId}`);
    };

    const handleLeaveRoom: IRouter['leaveRoom'] = (socket, data) => {
        socket.leave(data.roomId);
        console.log(`${socket.id} left room ${data.roomId}`);
    };
}
