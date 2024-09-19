import { Application, Router } from 'jsr:@oak/oak';
import { parseArgs } from 'jsr:@std/cli';
import { load } from 'jsr:@std/dotenv';
import { log } from '../shared/modules/vircadia-world-meta/general/modules/log.ts';
import {
    Environment,
    Server,
} from '../shared/modules/vircadia-world-meta/meta.ts';
import { CaddyManager, ProxyConfig } from './modules/caddy/caddy_manager.ts';
import { Supabase } from './modules/supabase/supabase_manager.ts';

// TODO:(@digisomni)
/*
 * we need to make Caddy issue certs for us automatically, OR allow for a custom CA to be used.
 */

const config = loadConfig();

async function init() {
    const debugMode = config[Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG];

    if (debugMode) {
        log({ message: 'Server debug mode enabled', type: 'info' });
    }

    log({ message: 'Starting Vircadia World Server', type: 'info' });

    const app = new Application();
    const router = new Router();

    setupCORS(app);
    await startSupabase(debugMode);
    const caddyRoutes = await setupCaddyRoutes(debugMode);
    setupGeneralRoutes(router, caddyRoutes);
    startOakServer(app);
    await startCaddyServer(caddyRoutes, debugMode);
}

function setupCORS(app: Application) {
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
}

async function startSupabase(debugMode: boolean) {
    log({ message: 'Starting Supabase', type: 'info' });

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

    log({ message: 'Supabase services are running correctly.', type: 'info' });
}

async function setupCaddyRoutes(
    debugMode: boolean,
): Promise<Record<Server.E_ProxySubdomain, ProxyConfig>> {
    log({ message: 'Creating Caddy routes', type: 'info' });

    const supabaseStatus = await Supabase.getInstance(debugMode).getStatus();

    return {
        [Server.E_ProxySubdomain.GENERAL]: {
            subdomain: `${Server.E_ProxySubdomain.GENERAL}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `${config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]}:${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]
            }`,
            name: 'Oak Server (General API)',
        },
        [Server.E_ProxySubdomain.SUPABASE_API]: {
            subdomain: `${Server.E_ProxySubdomain.SUPABASE_API}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `localhost:${supabaseStatus.api.port}${supabaseStatus.api.path}`,
            name: 'Supabase API',
        },
        [Server.E_ProxySubdomain.SUPABASE_GRAPHQL]: {
            subdomain: `${Server.E_ProxySubdomain.SUPABASE_GRAPHQL}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `localhost:${supabaseStatus.graphql.port}${supabaseStatus.graphql.path}`,
            name: 'Supabase GraphQL',
        },
        [Server.E_ProxySubdomain.SUPABASE_STORAGE]: {
            subdomain: `${Server.E_ProxySubdomain.SUPABASE_STORAGE}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `localhost:${supabaseStatus.s3Storage.port}${supabaseStatus.s3Storage.path}`,
            name: 'Supabase Storage',
        },
        [Server.E_ProxySubdomain.SUPABASE_STUDIO]: {
            subdomain: `${Server.E_ProxySubdomain.SUPABASE_STUDIO}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `localhost:${supabaseStatus.studio.port}${supabaseStatus.studio.path}`,
            name: 'Supabase Studio',
        },
        [Server.E_ProxySubdomain.SUPABASE_INBUCKET]: {
            subdomain: `${Server.E_ProxySubdomain.SUPABASE_INBUCKET}.${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }`,
            to: `localhost:${supabaseStatus.inbucket.port}${supabaseStatus.inbucket.path}`,
            name: 'Supabase Inbucket',
        },
    };
}

function setupGeneralRoutes(
    router: Router,
    caddyRoutes: Record<Server.E_ProxySubdomain, ProxyConfig>,
) {
    log({ message: 'Setting up HTTP routes', type: 'info' });

    router.get(Server.E_GeneralEndpoint.CONFIG_AND_STATUS, (ctx) => {
        log({
            message:
                `${Server.E_GeneralEndpoint.CONFIG_AND_STATUS} route called`,
            type: 'debug',
            debug: config[Environment.ENVIRONMENT_VARIABLE.SERVER_DEBUG],
        });

        const response: Server.I_REQUEST_ConfigAndStatusResponse = {
            API_URL:
                caddyRoutes[Server.E_ProxySubdomain.SUPABASE_API].subdomain,
            STORAGE_URL:
                caddyRoutes[Server.E_ProxySubdomain.SUPABASE_STORAGE].subdomain,
        };

        ctx.response.body = response;
    });

    log({ message: 'Oak HTTP routes are set up correctly.', type: 'info' });
}

function startOakServer(app: Application) {
    try {
        app.listen({
            port: config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT],
            hostname: config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST],
        });
        log({
            message: `Oak server is running on ${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_HOST]
            }:${config[Environment.ENVIRONMENT_VARIABLE.SERVER_OAK_PORT]}`,
            type: 'info',
        });
    } catch (error) {
        log({ message: `Failed to start Oak server: ${error}`, type: 'error' });
        Deno.exit(1);
    }
}

async function startCaddyServer(
    caddyRoutes: Record<Server.E_ProxySubdomain, ProxyConfig>,
    debugMode: boolean,
) {
    const caddyManager = CaddyManager.getInstance();

    try {
        await caddyManager.setupAndStart({
            proxyConfigs: caddyRoutes,
            debug: debugMode,
        });
        log({
            message: 'Caddy routes are setup and running correctly.',
            type: 'info',
        });
    } catch (error) {
        log({
            message: `Failed to setup and start Caddy: ${error}`,
            type: 'error',
        });
        Deno.exit(1);
    }

    log({ message: 'Caddy routes and their endpoints:', type: 'success' });

    for (const route of Object.values(caddyRoutes)) {
        log({
            message: `${route.name}: ${
                config[Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_HOST]
            }:${
                config[
                    Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT
                ]
            } -> ${route.subdomain} -> ${route.to}`,
            type: 'success',
        });
    }
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
            args.caddyHost || 'localhost',
        [Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT]: parseInt(
            Deno.env.get(Environment.ENVIRONMENT_VARIABLE.SERVER_CADDY_PORT) ||
                args.caddyPort || '3010',
        ),
    };
}
