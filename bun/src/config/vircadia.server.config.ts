import { z } from "zod";

// Server environment schema
const serverEnvSchema = z.object({
    VRCA_SERVER_CONTAINER_NAME: z.string().default("vircadia_world_server"),
    VRCA_SERVER_DEBUG: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
    VRCA_SERVER_SUPPRESS: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),

    // API manager
    VRCA_SERVER_SERVICE_WORLD_API_MANAGER_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_api_manager"),
    VRCA_SERVER_SERVICE_WORLD_API_MANAGER_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_SERVER_SERVICE_WORLD_API_MANAGER_PORT_CONTAINER_BIND_EXTERNAL: z.coerce
        .number()
        .default(3020),
    VRCA_SERVER_SERVICE_WORLD_API_MANAGER_HOST_PUBLIC_AVAILABLE_AT: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_WORLD_API_MANAGER_PORT_PUBLIC_AVAILABLE_AT: z.coerce
        .number()
        .default(3020),

    // State manager
    VRCA_SERVER_SERVICE_WORLD_STATE_MANAGER_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_state_manager"),
    VRCA_SERVER_SERVICE_WORLD_STATE_MANAGER_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_SERVER_SERVICE_WORLD_STATE_MANAGER_PORT_CONTAINER_BIND_EXTERNAL:
        z.coerce.number().default(3021),

    // Web Babylon JS Client service
    VRCA_SERVER_SERVICE_CLIENT_WEB_BABYLON_JS_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_client_web_babylon_js"),
    VRCA_SERVER_SERVICE_CLIENT_WEB_BABYLON_JS_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_SERVER_SERVICE_CLIENT_WEB_BABYLON_JS_PORT_CONTAINER_BIND_EXTERNAL:
        z.coerce.number().default(8080),

    // Postgres
    VRCA_SERVER_SERVICE_POSTGRES_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_postgres"),
    VRCA_SERVER_SERVICE_POSTGRES_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_CONTAINER_BIND_EXTERNAL: z.coerce
        .number()
        .default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_DATABASE: z
        .string()
        .default("vircadia_world_db"),
    VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_USERNAME: z
        .string()
        .default("vircadia"),
    VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_PASSWORD: z
        .string()
        .default("CHANGE_ME!"),
    VRCA_SERVER_SERVICE_POSTGRES_SQL_ENV_PREFIX: z
        .string()
        .default("VRCA_SERVER"),
    VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_USER_USERNAME: z
        .string()
        .default("vircadia_agent_proxy"),
    VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_USER_PASSWORD: z
        .string()
        .default("CHANGE_ME!"),
    VRCA_SERVER_SERVICE_POSTGRES_EXTENSIONS: z
        .string()
        .transform((val) =>
            val
                .split(",")
                .map((ext) => ext.trim())
                .filter((ext) => ext.length > 0),
        )
        .default("uuid-ossp,hstore,pgcrypto"),

    // PGWEB
    VRCA_SERVER_SERVICE_PGWEB_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_pgweb"),
    VRCA_SERVER_SERVICE_PGWEB_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_PGWEB_PORT_CONTAINER_BIND_EXTERNAL: z.coerce
        .number()
        .default(5437),

    // Caddy reverse proxy
    VRCA_SERVER_SERVICE_CADDY_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_caddy"),
    VRCA_SERVER_SERVICE_CADDY_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_SERVER_SERVICE_CADDY_PORT_CONTAINER_BIND_EXTERNAL_HTTP: z.coerce
        .number()
        .default(80),
    VRCA_SERVER_SERVICE_CADDY_PORT_CONTAINER_BIND_EXTERNAL_HTTPS: z.coerce
        .number()
        .default(443),
    VRCA_SERVER_SERVICE_CADDY_DOMAIN_API: z
        .string()
        .default("world.vircadia.com"),
    VRCA_SERVER_SERVICE_CADDY_DOMAIN_APP: z
        .string()
        .default("app-next.vircadia.com"),
    VRCA_SERVER_SERVICE_CADDY_EMAIL: z.string().default("hello@vircadia.com"),
    VRCA_SERVER_SERVICE_CADDY_TLS_API: z.string().optional(),
    VRCA_SERVER_SERVICE_CADDY_TLS_APP: z.string().optional(),

    // Asset cache maintenance
    VRCA_SERVER_ASSET_CACHE_MAINTENANCE_INTERVAL_MS: z.coerce
        .number()
        .default(1000),
});

// Parse server environment variables
export const serverConfiguration = serverEnvSchema.parse(process.env);
