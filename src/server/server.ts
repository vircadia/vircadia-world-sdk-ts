import { Application, Router } from "oak";
import { Supabase } from "./modules/supabase/supabase_manager.ts";
import { log } from "../client/deno/modules/vircadia-world-meta/general/modules/log.ts";
import { Server } from "./modules/vircadia-world-meta/meta.ts";

const TEMP_PORT = 3000;
const TEMP_ALLOWED_ORIGINS = '*';
const TEMP_ALLOWED_METHODS_REQ = 'GET, POST, PUT, DELETE, OPTIONS';
const TEMP_ALLOWED_HEADERS_REQ = 'Content-Type, Authorization';

async function init() {
    log({
        message: 'Starting Vircadia World Server',
        type: 'info',
    });
    const app = new Application();
    const router = new Router();

    // CORS middleware
    app.use(async (ctx, next) => {
        ctx.response.headers.set('Access-Control-Allow-Origin', TEMP_ALLOWED_ORIGINS);
        ctx.response.headers.set('Access-Control-Allow-Methods', TEMP_ALLOWED_METHODS_REQ);
        ctx.response.headers.set('Access-Control-Allow-Headers', TEMP_ALLOWED_HEADERS_REQ);
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

    const supabase = Supabase.getInstance(false);
    if (!(await supabase.isRunning()) || forceRestartSupabase) {
        try {
            await supabase.initializeAndStart({
                forceRestart: forceRestartSupabase,
            });
        } catch (error) {
            log(`Failed to initialize and start Supabase: ${error}`, 'error');
            await supabase.debugStatus();
        }

        if (!(await supabase.isRunning())) {
            log({
                message: 'Supabase services are not running after initialization. Exiting.',
                type: 'error',
            });
            Deno.exit(1);
        }
    }

    log({
        message: 'Setting up reverse proxies for Supabase services',
        type: 'info',
    });

    // Set up reverse proxies for Supabase services
    await supabase.setupReverseProxies(router);

    log({
        message: 'Supabase services are running correctly.',
        type: 'info',
    });

    log({
        message: 'Setting up HTTP routes',
        type: 'info',
    });

    // Add the route from httpRouter.ts
    router.get(Server.E_HTTPRequestPath.CONFIG_AND_STATUS, (ctx) => {
        const response: Server.I_REQUEST_ConfigAndStatusResponse = {
            API_URL: Server.E_HTTPRoute.API,
            S3_STORAGE_URL: Server.E_HTTPRoute.STORAGE,
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
        message: `Server is running on port ${TEMP_PORT}`,
        type: 'success',
    });
    await app.listen({ port: TEMP_PORT });
}

await init();