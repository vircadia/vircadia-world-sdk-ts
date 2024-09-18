import { Application, Router } from 'jsr:@oak/oak';
import { parseArgs } from 'jsr:@std/cli';
import { load } from 'jsr:@std/dotenv';
import { log } from '../shared/modules/vircadia-world-meta/general/modules/log.ts';
import {
    Environment,
    Server,
} from '../shared/modules/vircadia-world-meta/meta.ts';
import { CaddyManager } from './modules/caddy/caddy_manager.ts';
import { Supabase } from './modules/supabase/supabase_manager.ts';

const config = loadConfig();

async function init() {
    const debugMode = config[Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG];

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
            config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_ORIGINS],
        );
        ctx.response.headers.set(
            'Access-Control-Allow-Methods',
            config[
                Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_METHODS_REQ
            ],
        );
        ctx.response.headers.set(
            'Access-Control-Allow-Headers',
            config[
                Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_HEADERS_REQ
            ],
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
        message: 'Oak HTTP routes are set up correctly.',
        type: 'info',
    });

    // Use the router
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Setup Caddy
    log({
        message: 'Setting up Caddy',
        type: 'info',
    });
    const caddyManager = CaddyManager.getInstance();
    const supabaseStatus = await supabase.getStatus();

    const caddyRoutes = [
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT]}`,
            to: `${config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]}:${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]
            }`,
            name: 'Oak Server',
        },
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            }${Server.E_ProxyEndpoint.SUPABASE_API}`,
            to: `${supabaseStatus.api.host}:${supabaseStatus.api.port}${supabaseStatus.api.path}`,
            name: 'Supabase API',
        },
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            }${Server.E_ProxyEndpoint.SUPABASE_GRAPHQL}`,
            to: `${supabaseStatus.graphql.host}:${supabaseStatus.graphql.port}${supabaseStatus.graphql.path}`,
            name: 'Supabase GraphQL',
        },
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            }${Server.E_ProxyEndpoint.SUPABASE_STORAGE}`,
            to: `${supabaseStatus.s3Storage.host}:${supabaseStatus.s3Storage.port}${supabaseStatus.s3Storage.path}`,
            name: 'Supabase Storage',
        },
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            }${Server.E_ProxyEndpoint.SUPABASE_STUDIO}`,
            to: `${supabaseStatus.studio.host}:${supabaseStatus.studio.port}${supabaseStatus.studio.path}`,
            name: 'Supabase Studio',
        },
        {
            from: `${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            }${Server.E_ProxyEndpoint.SUPABASE_INBUCKET}`,
            to: `${supabaseStatus.inbucket.host}:${supabaseStatus.inbucket.port}${supabaseStatus.inbucket.path}`,
            name: 'Supabase Inbucket',
        },
    ];

    try {
        // Launch Oak server
        launchOakServer({ app });
        log({
            message: `Oak server is running on ${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]
            }:${config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]}`,
            type: 'info',
        });
    } catch (error) {
        log({
            message: `Failed to start Oak server: ${error}`,
            type: 'error',
        });
        await caddyManager.stop();
    }

    try {
        // Setup Caddy routes
        await caddyManager.setupAndStart(caddyRoutes);
        log({
            message: 'Caddy routes are setup and running correctly.',
            type: 'info',
        });
    } catch (error) {
        log({
            message: `Failed to setup and start Caddy: ${error}`,
            type: 'error',
        });
    }

    // Log the final endpoints
    log({
        message: 'Caddy routes and their endpoints:',
        type: 'success',
    });

    for (const route of caddyRoutes) {
        log({
            message: `${route.name}: ${route.from} -> ${route.to}`,
            type: 'success',
        });
    }
}

async function launchOakServer(data: {
    app: Application;
}) {
    const app = data.app;

    app.listen({
        port: config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT],
        hostname: config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST],
    });
}

await init();

interface ServerConfig {
    [Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG]: boolean;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]: string;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]: number;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_ORIGINS]: string;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_METHODS_REQ]: string;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_HEADERS_REQ]: string;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]: string;
    [Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT]: number;
}

export function loadConfig(): ServerConfig {
    // Load .env file
    load({ export: true });

    // Parse command-line arguments
    const args = parseArgs(Deno.args);

    return {
        [Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG]:
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG) ===
                'true' || args.debug || false,
        [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]:
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST) ||
            args.host || '0.0.0.0',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]: parseInt(
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT) ||
                args.port || '3000',
        ),
        [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_ORIGINS]:
            Deno.env.get(
                Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_ORIGINS,
            ) || args.allowedOrigins || '*',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_METHODS_REQ]:
            Deno.env.get(
                Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_METHODS_REQ,
            ) || args.allowedMethodsReq || 'GET, POST, PUT, DELETE, OPTIONS',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_HEADERS_REQ]:
            Deno.env.get(
                Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_ALLOWED_HEADERS_REQ,
            ) || args.allowedHeadersReq || 'Content-Type, Authorization',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]:
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST) ||
            args.caddyHost || '0.0.0.0',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT]: parseInt(
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT) ||
                args.caddyPort || '3010',
        ),
    };
}
