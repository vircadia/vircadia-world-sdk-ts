import { z } from "zod";

const VircadiaConfig_GlobalConsts = {
    DB_SUPER_USER: "vircadia",
    DB_AGENT_PROXY_USER: "vircadia_agent_proxy",
};

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
    VRCA_SERVER_PORT: z
        .string()
        .transform((val) => Number.parseInt(val))
        .default("3020"),
    VRCA_SERVER_HOST: z.string().default("0.0.0.0"),
    VRCA_SERVER_CONTAINER_NAME: z.string().default("vircadia_world"),
    VRCA_SERVER_POSTGRES_HOST: z.string().default("localhost"),
    VRCA_SERVER_POSTGRES_PORT: z.coerce.number().default(5432),
    VRCA_SERVER_POSTGRES_DB: z.string().default("vircadia_world_db"),
    VRCA_SERVER_POSTGRES_PASSWORD: z.string().default("CHANGE_ME!"),
    VRCA_SERVER_POSTGRES_SQL_ENV_PREFIX: z.string().default("VRCA_SERVER"),
    VRCA_SERVER_POSTGRES_AGENT_PROXY_PASSWORD: z.string().default("CHANGE_ME!"),
    VRCA_SERVER_POSTGRES_EXTENSIONS: z
        .string()
        .transform((val) =>
            val
                .split(",")
                .map((ext) => ext.trim())
                .filter((ext) => ext.length > 0),
        )
        .default("uuid-ossp,hstore,pgcrypto"),
    VRCA_SERVER_POSTGRES_SEEDS_PATH: z.string().optional(),
    VRCA_SERVER_PGWEB_PORT: z
        .string()
        .transform((val) => Number(val))
        .default("5437"),
    VRCA_SERVER_AUTH_PROVIDERS: z
        .string()
        .transform((val) => JSON.parse(val))
        .default(JSON.stringify({})),
});
const serverEnv = serverEnvSchema.parse(import.meta.env);

// Server config
const VircadiaConfig_Server = {
    DEBUG: serverEnv.VRCA_SERVER_DEBUG,
    SUPPRESS: serverEnv.VRCA_SERVER_SUPPRESS,
    SERVER_PORT: serverEnv.VRCA_SERVER_PORT,
    SERVER_HOST: serverEnv.VRCA_SERVER_HOST,
    CONTAINER_NAME: serverEnv.VRCA_SERVER_CONTAINER_NAME,
    POSTGRES: {
        HOST: serverEnv.VRCA_SERVER_POSTGRES_HOST,
        PORT: serverEnv.VRCA_SERVER_POSTGRES_PORT,
        DATABASE: serverEnv.VRCA_SERVER_POSTGRES_DB,
        PASSWORD: serverEnv.VRCA_SERVER_POSTGRES_PASSWORD,
        EXTENSIONS: serverEnv.VRCA_SERVER_POSTGRES_EXTENSIONS,
        SEED_PATH: serverEnv.VRCA_SERVER_POSTGRES_SEEDS_PATH,
        SQL_ENV_PREFIX: serverEnv.VRCA_SERVER_POSTGRES_SQL_ENV_PREFIX,
        SQL_ENV: {},
        AGENT_PROXY_PASSWORD:
            serverEnv.VRCA_SERVER_POSTGRES_AGENT_PROXY_PASSWORD,
    },
    PGWEB: {
        PORT: serverEnv.VRCA_SERVER_PGWEB_PORT,
    },
    AUTH: {
        PROVIDERS: serverEnv.VRCA_SERVER_AUTH_PROVIDERS,
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

// Combined config object
export const VircadiaConfig = {
    CLIENT: VircadiaConfig_Client,
    SERVER: VircadiaConfig_Server,
    GLOBAL_CONSTS: VircadiaConfig_GlobalConsts,
};
