import { z } from "zod";
import { VircadiaConfig_GLOBAL_CONSTS } from "./vircadia.consts.config";

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
    VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GLOBAL_CONSTS.DB_SUPER_USER_USERNAME),
    VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_PASSWORD: z
        .string()
        .default("CHANGE_ME!"),
    VRCA_SERVER_SERVICE_POSTGRES_SQL_ENV_PREFIX: z
        .string()
        .default("VRCA_SERVER"),
    VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GLOBAL_CONSTS.DB_AGENT_PROXY_USER_USERNAME),
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

    VRCA_SERVER_SERVICE_PGWEB_HOST_CONTAINER_EXTERNAL: z
        .string()
        .default("127.0.0.1"),
    VRCA_SERVER_SERVICE_PGWEB_PORT_CONTAINER_EXTERNAL: z.coerce
        .number()
        .default(5437),
});

export const VircadiaConfig_SERVER = serverEnvSchema.parse(process.env);
