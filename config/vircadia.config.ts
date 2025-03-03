import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const VircadiaConfig_GlobalConsts = {
    DB_SUPER_USER: "vircadia",
    DB_AGENT_PROXY_USER: "vircadia_agent_proxy",
};

// Server environment schema
const serverEnvSchema = z.object({
    VRCA_SERVER_CONTAINER_NAME: z.string().default("vircadia_world"),
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

    VRCA_SERVER_SERVICE_API_HOST_INTERNAL: z.string().default("0.0.0.0"),
    VRCA_SERVER_SERVICE_API_PORT_INTERNAL: z.coerce.number().default(3020),
    VRCA_SERVER_SERVICE_API_HOST_CLUSTER: z.string().default("api"),
    VRCA_SERVER_SERVICE_API_PORT_CLUSTER: z.coerce.number().default(3020),
    VRCA_SERVER_SERVICE_API_HOST_PUBLIC: z.string().default("localhost"),
    VRCA_SERVER_SERVICE_API_PORT_PUBLIC: z.coerce.number().default(3020),

    VRCA_SERVER_SERVICE_POSTGRES_HOST_INTERNAL: z.string().default("localhost"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_INTERNAL: z.coerce.number().default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_HOST_CLUSTER: z.string().default("postgres"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_CLUSTER: z.coerce.number().default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_HOST_PUBLIC: z.string().default("localhost"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_PUBLIC: z.coerce.number().default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_DATABASE: z
        .string()
        .default("vircadia_world_db"),
    VRCA_SERVER_SERVICE_POSTGRES_PASSWORD: z.string().default("CHANGE_ME!"),
    VRCA_SERVER_SERVICE_POSTGRES_SQL_ENV_PREFIX: z
        .string()
        .default("VRCA_SERVER"),
    VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_PASSWORD: z
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
    VRCA_SERVER_SERVICE_POSTGRES_SEEDS_PATH: z.string().optional(),

    VRCA_SERVER_SERVICE_PGWEB_PORT: z
        .string()
        .transform((val) => Number(val))
        .default("5437"),
});
const serverEnv = serverEnvSchema.parse(import.meta.env);

// Server config
const VircadiaConfig_Server = {
    DEBUG: serverEnv.VRCA_SERVER_DEBUG,
    SUPPRESS: serverEnv.VRCA_SERVER_SUPPRESS,
    CONTAINER_NAME: serverEnv.VRCA_SERVER_CONTAINER_NAME,
    SERVICE: {
        API: {
            HOST_INTERNAL: serverEnv.VRCA_SERVER_SERVICE_API_HOST_INTERNAL,
            PORT_INTERNAL: serverEnv.VRCA_SERVER_SERVICE_API_PORT_INTERNAL,
            HOST_CLUSTER: serverEnv.VRCA_SERVER_SERVICE_API_HOST_CLUSTER,
            PORT_CLUSTER: serverEnv.VRCA_SERVER_SERVICE_API_PORT_CLUSTER,
            HOST_PUBLIC: serverEnv.VRCA_SERVER_SERVICE_API_HOST_PUBLIC,
            PORT_PUBLIC: serverEnv.VRCA_SERVER_SERVICE_API_PORT_PUBLIC,
        },
        SCRIPT_WEB: {},
        TICK: {},
        POSTGRES: {
            HOST_INTERNAL: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_HOST_INTERNAL,
            PORT_INTERNAL: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_PORT_INTERNAL,
            HOST_CLUSTER: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_HOST_CLUSTER,
            PORT_CLUSTER: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_PORT_CLUSTER,
            HOST_PUBLIC: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_HOST_PUBLIC,
            PORT_PUBLIC: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_PORT_PUBLIC,
            DATABASE: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_DATABASE,
            PASSWORD: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_PASSWORD,
            EXTENSIONS: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_EXTENSIONS,
            SEED_PATH: serverEnv.VRCA_SERVER_SERVICE_POSTGRES_SEEDS_PATH,
            SQL_ENV_PREFIX:
                serverEnv.VRCA_SERVER_SERVICE_POSTGRES_SQL_ENV_PREFIX,
            SQL_ENV: {},
            AGENT_PROXY_PASSWORD:
                serverEnv.VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_PASSWORD,
        },
        PGWEB: {
            PORT: serverEnv.VRCA_SERVER_SERVICE_PGWEB_PORT,
        },
    },
};

// Client environment schema
const clientEnvSchema = z.object({
    VRCA_CLIENT_DEBUG: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
    VRCA_CLIENT_DEFAULT_TITLE: z
        .string()
        .default("Vircadia World Web Interface"),
    VRCA_CLIENT_DEFAULT_DESCRIPTION: z.string().default("..."),
    VRCA_CLIENT_DEFAULT_URL: z
        .string()
        .url()
        .default("https://app.vircadia.com"),
    VRCA_CLIENT_DEFAULT_OG_IMAGE: z.string().default("/brand/logo_icon.webp"),
    VRCA_CLIENT_DEFAULT_OG_TYPE: z.string().default("website"),
    VRCA_CLIENT_DEFAULT_FAVICON: z.string().default("/brand/favicon.svg"),
    VRCA_CLIENT_BASE_APP_URL: z
        .string()
        .url()
        .default("https://app.vircadia.com"),
    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI: z.string().default("localhost:3020"),
    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI_USING_SSL: z.boolean().default(false),
});

// Parse environments
const clientEnv = clientEnvSchema.parse(import.meta.env);

// Client config
const VircadiaConfig_Client = {
    debug: clientEnv.VRCA_CLIENT_DEBUG,
    defaultTitle: clientEnv.VRCA_CLIENT_DEFAULT_TITLE,
    defaultDescription: clientEnv.VRCA_CLIENT_DEFAULT_DESCRIPTION,
    defaultUrl: clientEnv.VRCA_CLIENT_DEFAULT_URL,
    defaultFavicon: clientEnv.VRCA_CLIENT_DEFAULT_FAVICON,
    defaultOgImage: clientEnv.VRCA_CLIENT_DEFAULT_OG_IMAGE,
    defaultOgType: clientEnv.VRCA_CLIENT_DEFAULT_OG_TYPE,
    baseAppUrl: clientEnv.VRCA_CLIENT_BASE_APP_URL,
    defaultWorldServerUri: clientEnv.VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI,
    defaultWorldServerUriUsingSsl:
        clientEnv.VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI_USING_SSL,
};

// CLI environment schema
const cliEnvSchema = z.object({
    VRCA_CLI_DEBUG: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
    VRCA_CLI_SUPPRESS: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
    VRCA_CLI_POSTGRES_MIGRATION_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../database/migration",
            ),
        ),
    VRCA_CLI_POSTGRES_SEED_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../database/seed",
            ),
        ),
    VRCA_CLI_POSTGRES_RESET_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../database/reset",
            ),
        ),
    // TODO: Need to add DB connection info, need to add access to containers info (remote/local)
});
const cliEnv = cliEnvSchema.parse(import.meta.env);

// CLI Config
const VircadiaConfig_CLI = {
    DEBUG: cliEnv.VRCA_CLI_DEBUG,
    SUPPRESS: cliEnv.VRCA_CLI_SUPPRESS,
    POSTGRES: {
        MIGRATION_DIR: cliEnv.VRCA_CLI_POSTGRES_MIGRATION_DIR,
        SEED_DIR: cliEnv.VRCA_CLI_POSTGRES_SEED_DIR,
        RESET_DIR: cliEnv.VRCA_CLI_POSTGRES_RESET_DIR,
    },
};

// Combined config object
export const VircadiaConfig = {
    CLIENT: VircadiaConfig_Client,
    CLIENT_ENV: clientEnv,
    SERVER: VircadiaConfig_Server,
    SERVER_ENV: serverEnv,
    CLI: VircadiaConfig_CLI,
    CLI_ENV: cliEnv,
    GLOBAL_CONSTS: VircadiaConfig_GlobalConsts,
};
