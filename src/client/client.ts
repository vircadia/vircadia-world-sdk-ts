import { io } from 'socket.io-client';
import { WebTransport } from '../routes/webtransport/general-router';

const socket = io('http://localhost:3000');

// Function to send a signal
function sendSignal(data: WebTransport.ISignalData) {
    socket.emit('signal', data);
}

// Function to join a room
function joinRoom(data: WebTransport.IRoomData) {
    socket.emit('join-room', data);
}

// Function to leave a room
function leaveRoom(data: WebTransport.IRoomData) {
    socket.emit('leave-room', data);
}

// Listening to events
socket.on('connect', () => {
    console.log('Connected to server');
});

// Export the functions for use elsewhere in your client application
export { sendSignal, joinRoom, leaveRoom };
