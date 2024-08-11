import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { Supabase } from './modules/supabase/supabase';

import { WorldTransport } from '../routes/worldTransportRouter';
import { HTTPTransport } from '../routes/httpRouter';

const TEMP_PORT = 3000;
const TEMP_ALLOWED_ORIGINS = '*';
const TEMP_ALLOWED_METHODS_REQ = 'GET, POST, PUT, DELETE, OPTIONS';
const TEMP_ALLOWED_HEADERS_REQ = 'Content-Type, Authorization';
const TEMP_ALLOWED_METHODS_WT = 'GET, POST';

async function init() {
    const expressApp = express();

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

    const forceRestartSupabase = process.argv.includes(
        '--force-restart-supabase',
    );

    const supabase = Supabase.getInstance(false);
    if (!(await supabase.isRunning()) || forceRestartSupabase) {
        try {
            await supabase.initializeAndStart({
                forceRestart: forceRestartSupabase,
            });
        } catch (error) {
            console.error('Failed to initialize and start Supabase:', error);
            await supabase.debugStatus();
        }

        // Set up reverse proxies for Supabase services
        await supabase.setupReverseProxies(expressApp);

        if (!(await supabase.isRunning())) {
            console.error(
                'Supabase services are not running after initialization. Exiting.',
            );
            process.exit(1);
        }
    }

    console.log('Supabase services are running correctly.');

    expressApp.use('/', HTTPTransport.Routes);

    // Create HTTP server
    const expressServer = createServer(expressApp);

    // Webtransport via Socket.io
    const socketIO = new Server(expressServer, {
        cors: {
            origin: TEMP_ALLOWED_ORIGINS,
            methods: TEMP_ALLOWED_METHODS_WT,
        },
    });
    WorldTransport.Router(socketIO);

    // Launch
    expressServer.listen(TEMP_PORT, () => {
        console.log(`Server is running on port ${TEMP_PORT}`);
    });
}

void init();
