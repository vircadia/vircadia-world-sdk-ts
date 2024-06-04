import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { MetaRequest, WorldTransport } from '../routes/router';

const TEMP_PORT = 3000;
const TEMP_ALLOWED_ORIGINS = '*';
const TEMP_ALLOWED_METHODS_REQ = 'GET, POST, PUT, DELETE, OPTIONS';
const TEMP_ALLOWED_HEADERS_REQ = 'Content-Type, Authorization';
const TEMP_ALLOWED_METHODS_WT = 'GET, POST';

function init() {
    const expressApp = express();
    const server = createServer(expressApp);

    // Requests via Express
    expressApp.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', TEMP_ALLOWED_ORIGINS);
        res.setHeader('Access-Control-Allow-Methods', TEMP_ALLOWED_METHODS_REQ);
        res.setHeader('Access-Control-Allow-Headers', TEMP_ALLOWED_HEADERS_REQ);
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        return next();
    });

    expressApp.use('/', MetaRequest);

    // Webtransport via Socket.io
    const socketIO = new Server(server, {
        cors: {
            origin: TEMP_ALLOWED_ORIGINS,
            methods: TEMP_ALLOWED_METHODS_WT,
        },
    });
    WorldTransport.Router(socketIO);

    server.listen(TEMP_PORT, () => {
        console.log('Server is running on port 3000');
    });
}

void init();
