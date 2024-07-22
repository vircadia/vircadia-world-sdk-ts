import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Supabase from "./modules/supabase/supabase";

import { MetaRequest, WorldTransport } from "../routes/router";

const TEMP_PORT = 3000;
const TEMP_ALLOWED_ORIGINS = "*";
const TEMP_ALLOWED_METHODS_REQ = "GET, POST, PUT, DELETE, OPTIONS";
const TEMP_ALLOWED_HEADERS_REQ = "Content-Type, Authorization";
const TEMP_ALLOWED_METHODS_WT = "GET, POST";

async function init() {
    const supabase = new Supabase();

    // Check Supabase status
    const status = await supabase.status();

    if (status.status === 'not_setup') {
        await supabase.setup();

        const newStatus = await supabase.status();
        if (newStatus.status === 'not_setup') {
            console.error('Failed to setup Supabase. Exiting.');
            process.exit(1);
        }
    }

    if (status.status === 'failed') {
        console.log('Supabase services are not running. Attempting to start...');
        await supabase.start();
        
        // Check status again after starting
        const newStatus = await supabase.status();
        if (newStatus.status !== 'running') {
            console.error('Failed to start Supabase services. Attempting to resync and restart...');
            await supabase.resyncConfiguration();
            
            // Final check after resync
            const finalStatus = await supabase.status();
            if (finalStatus.status !== 'running') {
                console.error('Failed to start Supabase services after resync. Exiting.');
                process.exit(1);
            }
        }
    }

    console.log('Supabase services are running correctly.');

    const expressApp = express();

    // Requests via Express
    expressApp.use(function (req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", TEMP_ALLOWED_ORIGINS);
        res.setHeader("Access-Control-Allow-Methods", TEMP_ALLOWED_METHODS_REQ);
        res.setHeader("Access-Control-Allow-Headers", TEMP_ALLOWED_HEADERS_REQ);
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        return next();
    });

    expressApp.use("/", MetaRequest);

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