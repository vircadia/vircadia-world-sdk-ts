import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const VircadiaConfig_GlobalConsts = {
    DB_SUPER_USER_USERNAME: "vircadia",
    DB_AGENT_PROXY_USER_USERNAME: "vircadia_agent_proxy",
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

    VRCA_SERVER_SERVICE_API_HOST_CONTAINER_CLUSTER: z.string().default("api"),
    VRCA_SERVER_SERVICE_API_PORT_CONTAINER_CLUSTER: z.coerce
        .number()
        .default(3020),
    VRCA_SERVER_SERVICE_API_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_SERVER_SERVICE_API_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(3020),
    VRCA_SERVER_SERVICE_API_HOST_PUBLIC: z.string().default("127.0.0.1"),
    VRCA_SERVER_SERVICE_API_PORT_PUBLIC: z.coerce.number().default(3020),

    VRCA_SERVER_SERVICE_SCRIPT_WEB_HOST_CONTAINER_CLUSTER: z
        .string()
        .default("script"),
    VRCA_SERVER_SERVICE_SCRIPT_WEB_PORT_CONTAINER_CLUSTER: z.coerce
        .number()
        .default(3021),
    VRCA_SERVER_SERVICE_SCRIPT_WEB_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_SCRIPT_WEB_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(3021),

    VRCA_SERVER_SERVICE_TICK_HOST_CONTAINER_CLUSTER: z.string().default("tick"),
    VRCA_SERVER_SERVICE_TICK_PORT_CONTAINER_CLUSTER: z.coerce
        .number()
        .default(3022),
    VRCA_SERVER_SERVICE_TICK_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_TICK_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(3022),

    VRCA_SERVER_SERVICE_POSTGRES_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_HOST_CONTAINER_CLUSTER: z
        .string()
        .default("postgres"),
    VRCA_SERVER_SERVICE_POSTGRES_PORT_CONTAINER_CLUSTER: z.coerce
        .number()
        .default(5432),
    VRCA_SERVER_SERVICE_POSTGRES_DATABASE: z
        .string()
        .default("vircadia_world_db"),
    VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_PASSWORD: z
        .string()
        .default("CHANGE_ME!"),
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

    VRCA_SERVER_SERVICE_PGWEB_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_PGWEB_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(5437),
});
const serverEnv = serverEnvSchema.parse(import.meta.env);

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
    VRCA_CLIENT_SUPPRESS: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),

    VRCA_CLIENT_META_TITLE_BASE: z.string().default("Vircadia"),
    VRCA_CLIENT_META_DESCRIPTION: z.string().default("..."),
    VRCA_CLIENT_META_OG_IMAGE: z.string().default("/brand/logo_icon.webp"),
    VRCA_CLIENT_META_OG_TYPE: z.string().default("website"),
    VRCA_CLIENT_META_FAVICON: z.string().default("/brand/favicon.svg"),

    VRCA_CLIENT_APP_URL: z.string().url().default("https://app.vircadia.com"),

    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI: z.string().default("localhost:3020"),
    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URI_USING_SSL: z.boolean().default(false),
});
// Parse client environment variables
const clientEnv = clientEnvSchema.parse(import.meta.env);

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
    VRCA_CLI_SERVICE_POSTGRES_HOST: z
        .string()
        .default(
            serverEnv.VRCA_SERVER_SERVICE_POSTGRES_HOST_CONTAINER_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_POSTGRES_PORT: z
        .number()
        .default(
            serverEnv.VRCA_SERVER_SERVICE_POSTGRES_PORT_CONTAINER_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_POSTGRES_DATABASE: z
        .string()
        .default(serverEnv.VRCA_SERVER_SERVICE_POSTGRES_DATABASE),
    VRCA_CLI_SERVICE_POSTGRES_SUPER_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GlobalConsts.DB_SUPER_USER_USERNAME),
    VRCA_CLI_SERVICE_POSTGRES_SUPER_USER_PASSWORD: z
        .string()
        .default(serverEnv.VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_PASSWORD),

    VRCA_CLI_SERVICE_POSTGRES_AGENT_PROXY_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GlobalConsts.DB_AGENT_PROXY_USER_USERNAME),
    VRCA_CLI_SERVICE_POSTGRES_AGENT_PROXY_USER_PASSWORD: z
        .string()
        .default(serverEnv.VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_PASSWORD),

    VRCA_CLI_SERVICE_POSTGRES_MIGRATION_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../server/cli/database/migration",
            ),
        ),
    VRCA_CLI_SERVICE_POSTGRES_SEED_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../server/cli/database/seed",
            ),
        ),
    VRCA_CLI_SERVICE_POSTGRES_RESET_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../server/cli/database/reset",
            ),
        ),

    VRCA_CLI_SERVICE_PGWEB_HOST: z
        .string()
        .default(serverEnv.VRCA_SERVER_SERVICE_PGWEB_HOST_CONTAINER_EXTERNAL),
    VRCA_CLI_SERVICE_PGWEB_PORT: z
        .number()
        .default(serverEnv.VRCA_SERVER_SERVICE_PGWEB_PORT_CONTAINER_EXTERNAL),
});
const cliEnv = cliEnvSchema.parse(import.meta.env);

// Combined config object
export const VircadiaConfig = {
    CLIENT: clientEnv,
    SERVER: serverEnv,
    CLI: cliEnv,
    GLOBAL_CONSTS: VircadiaConfig_GlobalConsts,
};
