import { Application, Router } from "oak";
import { Supabase } from "./modules/supabase/supabase_manager.ts";
import { log } from "./modules/general/log.ts";
import { Server } from "../shared/meta.ts";

const TEMP_PORT = 3000;
const TEMP_ALLOWED_ORIGINS = '*';
const TEMP_ALLOWED_METHODS_REQ = 'GET, POST, PUT, DELETE, OPTIONS';
const TEMP_ALLOWED_HEADERS_REQ = 'Content-Type, Authorization';

async function init() {
    const app = new Application();

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
            log(
                'Supabase services are not running after initialization. Exiting.',
                'error',
            );
            Deno.exit(1);
        }
    }

    // Set up reverse proxies for Supabase services
    await supabase.setupReverseProxies(app);

    log('Supabase services are running correctly.', 'info');

    // Create a router instance
    const router = new Router();

    // Add the route from httpRouter.ts
    router.get(Server.E_HTTPRequestPath.CONFIG_AND_STATUS, (ctx) => {
        const response: Server.I_REQUEST_ConfigAndStatusResponse = {
            API_URL: Server.E_HTTPRoute.API,
            S3_STORAGE_URL: Server.E_HTTPRoute.STORAGE,
        };

        ctx.response.body = response;
    });

    // Use the router
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Launch
    log(`Server is running on port ${TEMP_PORT}`, 'info');
    await app.listen({ port: TEMP_PORT });
}

await init();