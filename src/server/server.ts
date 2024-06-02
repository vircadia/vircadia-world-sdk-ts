import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { Request } from '../routes/request/general-router';
import { WebTransport } from '../routes/webtransport/general-router';

async function main() {
    const expressApp = express();
    const server = createServer(expressApp);

    // Requests via Express
    expressApp.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
        );
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization',
        );
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        } else {
            next();
        }
    });

    expressApp.use('/', Request);

    // Webtransport via Socket.io
    const socketIO = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    WebTransport.Router(socketIO);

    server.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

void main();
