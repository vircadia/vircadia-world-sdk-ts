import { z } from "zod";
import { parseArgs } from "node:util";

// Add CLI argument parsing
const { positionals: serverPositionals, values: serverArgs } = parseArgs({
    args: process.argv.slice(2),
    options: {
        debug: { type: "boolean" },
        port: { type: "string" },
        host: { type: "string" },
        "force-restart": { type: "boolean" },
        "dev-mode": { type: "boolean" },
        "container-name": { type: "string" },
        "postgres-host": { type: "string" },
        "postgres-port": { type: "string" },
        "postgres-db": { type: "string" },
        "postgres-user": { type: "string" },
        "postgres-password": { type: "string" },
        "postgres-extensions": { type: "string" },
        "auth-providers": { type: "string" },
        "pgweb-port": { type: "string" },
    },
    allowPositionals: true,
});

// Client environment schema
const clientEnvSchema = z.object({
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
    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URL: z
        .string()
        .url()
        .default("localhost:8000"),
    VRCA_CLIENT_DEFAULT_WORLD_DATABASE_URL: z
        .string()
        .default("localhost:5432"),
    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME: z
        .string()
        .nullable()
        .default(null),
    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD: z
        .string()
        .nullable()
        .default(null),
});

// Server environment schema
const serverEnvSchema = z.object({
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
    VRCA_SERVER_INTERNAL_SERVER_PORT: z.string().default("3020"),
    VRCA_SERVER_INTERNAL_SERVER_HOST: z.string().default("0.0.0.0"),
    VRCA_SERVER_DEV_MODE: z.boolean().default(false),
    VRCA_SERVER_CONTAINER_NAME: z.string().default("vircadia_world"),
    VRCA_SERVER_POSTGRES_HOST: z.string().default("localhost"),
    VRCA_SERVER_POSTGRES_PORT: z.coerce.number().default(5432),
    VRCA_SERVER_POSTGRES_DB: z.string().default("vircadia_world_db"),
    VRCA_SERVER_POSTGRES_USER: z.string().default("vircadia"),
    VRCA_SERVER_POSTGRES_PASSWORD: z.string().default("CHANGE_ME!"),
    VRCA_SERVER_POSTGRES_EXTENSIONS: z
        .string()
        .default("uuid-ossp,hstore,pgcrypto"),
    VRCA_SERVER_PGWEB_PORT: z.string().default("5437"),
    VRCA_SERVER_AUTH_PROVIDERS: z.string().default(JSON.stringify({})),
});

// Parse both environments
const clientEnv = clientEnvSchema.parse(import.meta.env);
const serverEnv = serverEnvSchema.parse(import.meta.env);

// Client config
export const VircadiaConfig_Client = {
    defaultTitle: clientEnv.VRCA_CLIENT_DEFAULT_TITLE,
    defaultDescription: clientEnv.VRCA_CLIENT_DEFAULT_DESCRIPTION,
    defaultUrl: clientEnv.VRCA_CLIENT_DEFAULT_URL,
    defaultFavicon: clientEnv.VRCA_CLIENT_DEFAULT_FAVICON,
    defaultOgImage: clientEnv.VRCA_CLIENT_DEFAULT_OG_IMAGE,
    defaultOgType: clientEnv.VRCA_CLIENT_DEFAULT_OG_TYPE,
    baseAppUrl: clientEnv.VRCA_CLIENT_BASE_APP_URL,
    defaultWorldServerUrl: clientEnv.VRCA_CLIENT_DEFAULT_WORLD_SERVER_URL,
    defaultWorldDatabaseUrl: clientEnv.VRCA_CLIENT_DEFAULT_WORLD_DATABASE_URL,
    defaultWorldAccountUsername:
        clientEnv.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME,
    defaultWorldAccountPassword:
        clientEnv.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD,
};

// Server config
export const VircadiaConfig_Server = {
    debug: serverArgs.debug ?? serverEnv.VRCA_SERVER_DEBUG,
    serverPort: Number.parseInt(
        serverArgs.port ?? serverEnv.VRCA_SERVER_INTERNAL_SERVER_PORT,
    ),
    serverHost: serverArgs.host ?? serverEnv.VRCA_SERVER_INTERNAL_SERVER_HOST,
    devMode: serverArgs["dev-mode"] ?? serverEnv.VRCA_SERVER_DEV_MODE,
    containerName:
        serverArgs["container-name"] ?? serverEnv.VRCA_SERVER_CONTAINER_NAME,
    postgres: {
        host:
            serverArgs["postgres-host"] ?? serverEnv.VRCA_SERVER_POSTGRES_HOST,
        port: Number(
            serverArgs["postgres-port"] ?? serverEnv.VRCA_SERVER_POSTGRES_PORT,
        ),
        database:
            serverArgs["postgres-db"] ?? serverEnv.VRCA_SERVER_POSTGRES_DB,
        user:
            serverArgs["postgres-user"] ?? serverEnv.VRCA_SERVER_POSTGRES_USER,
        password:
            serverArgs["postgres-password"] ??
            serverEnv.VRCA_SERVER_POSTGRES_PASSWORD,
        extensions: (
            serverArgs["postgres-extensions"] ??
            serverEnv.VRCA_SERVER_POSTGRES_EXTENSIONS
        )
            .split(",")
            .map((ext) => ext.trim())
            .filter((ext) => ext.length > 0),
    },
    pgweb: {
        port: Number(
            serverArgs["pgweb-port"] ?? serverEnv.VRCA_SERVER_PGWEB_PORT,
        ),
    },
    auth: {
        providers: JSON.parse(serverEnv.VRCA_SERVER_AUTH_PROVIDERS),
    },
};

// Combined config object
export const VircadiaConfig = {
    client: VircadiaConfig_Client,
    server: VircadiaConfig_Server,
};
