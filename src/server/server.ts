import { Application, Router } from 'jsr:@oak/oak';
import { log } from '../shared/modules/vircadia-world-meta/general/modules/log.ts';
import { Supabase } from './modules/supabase/supabase_manager.ts';
import { Environment, Server } from './modules/vircadia-world-meta/meta.ts';

const TEMP_PORT = 3000;
const TEMP_HOST = '0.0.0.0';
const TEMP_ALLOWED_ORIGINS = '*';
const TEMP_ALLOWED_METHODS_REQ = 'GET, POST, PUT, DELETE, OPTIONS';
const TEMP_ALLOWED_HEADERS_REQ = 'Content-Type, Authorization';

async function init() {
    const debugMode =
        Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG) === 'true';
    if (debugMode) {
        log({
            message: 'Server debug mode enabled',
            type: 'info',
        });
    }

    log({
        message: 'Starting Vircadia World Server',
        type: 'info',
    });
    const app = new Application();
    const router = new Router();

    // CORS middleware
    app.use(async (ctx, next) => {
        ctx.response.headers.set(
            'Access-Control-Allow-Origin',
            TEMP_ALLOWED_ORIGINS,
        );
        ctx.response.headers.set(
            'Access-Control-Allow-Methods',
            TEMP_ALLOWED_METHODS_REQ,
        );
        ctx.response.headers.set(
            'Access-Control-Allow-Headers',
            TEMP_ALLOWED_HEADERS_REQ,
        );
        if (ctx.request.method === 'OPTIONS') {
            ctx.response.status = 200;
            return;
        }
        await next();
    });

    log({
        message: 'Starting Supabase',
        type: 'info',
    });

    const forceRestartSupabase = Deno.args.includes('--force-restart-supabase');

    const supabase = Supabase.getInstance(debugMode);
    if (!(await supabase.isRunning()) || forceRestartSupabase) {
        try {
            await supabase.initializeAndStart({
                forceRestart: forceRestartSupabase,
            });
        } catch (error) {
            log({
                message: `Failed to initialize and start Supabase: ${error}`,
                type: 'error',
            });
            await supabase.debugStatus();
        }

        if (!(await supabase.isRunning())) {
            log({
                message:
                    'Supabase services are not running after initialization. Exiting.',
                type: 'error',
            });
            Deno.exit(1);
        }
    }

    log({
        message: 'Supabase services are running correctly.',
        type: 'info',
    });

    log({
        message: 'Setting up HTTP routes',
        type: 'info',
    });

    // Add the route from httpRouter.ts
    router.get(Server.E_HTTPRequestPath.CONFIG_AND_STATUS, async (ctx) => {
        log({
            message:
                `${Server.E_HTTPRequestPath.CONFIG_AND_STATUS} route called`,
            type: 'debug',
            debug: debugMode,
        });

        const statusUrls = await supabase.getStatus();
        const response: Server.I_REQUEST_ConfigAndStatusResponse = {
            API_URL: statusUrls.api.host + ':' + statusUrls.api.port +
                statusUrls.api.path,
            STORAGE_URL: statusUrls.s3Storage.host + ':' +
                statusUrls.s3Storage.port + statusUrls.s3Storage.path,
        };

        ctx.response.body = response;
    });

    log({
        message: 'HTTP routes are set up correctly.',
        type: 'info',
    });

    // Use the router
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Launch
    log({
        message: `Server is running on ${TEMP_HOST}:${TEMP_PORT}`,
        type: 'success',
    });

    try {
        await app.listen({
            port: TEMP_PORT,
            hostname: TEMP_HOST,
        });
    } catch (error) {
        log({
            message: `Failed to start server: ${error}`,
            type: 'error',
        });
    }
}

await init();
