import { z } from "zod";

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
    VRCA_SERVER_PORT: z.string().default("3020"),
    VRCA_SERVER_HOST: z.string().default("0.0.0.0"),
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
    VRCA_SERVER_POSTGRES_SEEDS_PATH: z.string().optional(),
    VRCA_SERVER_PGWEB_PORT: z.string().default("5437"),
    VRCA_SERVER_AUTH_PROVIDERS: z.string().default(JSON.stringify({})),
});

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
});

// Parse environments
const clientEnv = clientEnvSchema.parse(import.meta.env);
const serverEnv = serverEnvSchema.parse(import.meta.env);

// Client config
export const VircadiaConfig_Client = {
    debug: clientEnv.VRCA_CLIENT_DEBUG,
    defaultTitle: clientEnv.VRCA_CLIENT_DEFAULT_TITLE,
    defaultDescription: clientEnv.VRCA_CLIENT_DEFAULT_DESCRIPTION,
    defaultUrl: clientEnv.VRCA_CLIENT_DEFAULT_URL,
    defaultFavicon: clientEnv.VRCA_CLIENT_DEFAULT_FAVICON,
    defaultOgImage: clientEnv.VRCA_CLIENT_DEFAULT_OG_IMAGE,
    defaultOgType: clientEnv.VRCA_CLIENT_DEFAULT_OG_TYPE,
    baseAppUrl: clientEnv.VRCA_CLIENT_BASE_APP_URL,
    defaultWorldServerUri: clientEnv.VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI,
};

// Server config
export const VircadiaConfig_Server = {
    debug: serverEnv.VRCA_SERVER_DEBUG,
    serverPort: Number.parseInt(serverEnv.VRCA_SERVER_PORT),
    serverHost: serverEnv.VRCA_SERVER_HOST,
    devMode: serverEnv.VRCA_SERVER_DEV_MODE,
    containerName: serverEnv.VRCA_SERVER_CONTAINER_NAME,
    postgres: {
        host: serverEnv.VRCA_SERVER_POSTGRES_HOST,
        port: serverEnv.VRCA_SERVER_POSTGRES_PORT,
        database: serverEnv.VRCA_SERVER_POSTGRES_DB,
        user: serverEnv.VRCA_SERVER_POSTGRES_USER,
        password: serverEnv.VRCA_SERVER_POSTGRES_PASSWORD,
        extensions: serverEnv.VRCA_SERVER_POSTGRES_EXTENSIONS.split(",")
            .map((ext) => ext.trim())
            .filter((ext) => ext.length > 0),
        seedsPath: serverEnv.VRCA_SERVER_POSTGRES_SEEDS_PATH,
    },
    pgweb: {
        port: Number(serverEnv.VRCA_SERVER_PGWEB_PORT),
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
