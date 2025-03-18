import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { VircadiaConfig_GLOBAL_CONSTS } from "./vircadia.consts.config";
import { VircadiaConfig_SERVER } from "./vircadia.server.config";

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
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_POSTGRES_HOST_CONTAINER_BIND_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_POSTGRES_PORT: z.coerce
        .number()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_POSTGRES_PORT_CONTAINER_BIND_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_POSTGRES_DATABASE: z
        .string()
        .default(VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_POSTGRES_DATABASE),
    VRCA_CLI_SERVICE_POSTGRES_SUPER_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GLOBAL_CONSTS.DB_SUPER_USER_USERNAME),
    VRCA_CLI_SERVICE_POSTGRES_SUPER_USER_PASSWORD: z
        .string()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_POSTGRES_SUPER_USER_PASSWORD,
        ),

    VRCA_CLI_SERVICE_POSTGRES_AGENT_PROXY_USER_USERNAME: z
        .string()
        .default(VircadiaConfig_GLOBAL_CONSTS.DB_AGENT_PROXY_USER_USERNAME),
    VRCA_CLI_SERVICE_POSTGRES_AGENT_PROXY_USER_PASSWORD: z
        .string()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_POSTGRES_AGENT_PROXY_USER_PASSWORD,
        ),

    VRCA_CLI_SERVICE_POSTGRES_MIGRATION_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../cli/database/migration",
            ),
        ),
    VRCA_CLI_SERVICE_POSTGRES_SEED_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../cli/database/seed",
            ),
        ),
    VRCA_CLI_SERVICE_POSTGRES_RESET_DIR: z
        .string()
        .default(
            path.join(
                dirname(fileURLToPath(import.meta.url)),
                "../../../cli/database/reset",
            ),
        ),

    VRCA_CLI_SERVICE_PGWEB_HOST: z
        .string()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_PGWEB_HOST_CONTAINER_BIND_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_PGWEB_PORT: z.coerce
        .number()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_PGWEB_PORT_CONTAINER_BIND_EXTERNAL,
        ),

    VRCA_CLI_SERVICE_WORLD_API_MANAGER_HOST: z
        .string()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_WORLD_API_MANAGER_HOST_PUBLIC_AVAILABLE_AT,
        ),
    VRCA_CLI_SERVICE_WORLD_API_MANAGER_PORT: z.coerce
        .number()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_WORLD_API_MANAGER_PORT_PUBLIC_AVAILABLE_AT,
        ),

    VRCA_CLI_SERVICE_WORLD_TICK_MANAGER_HOST: z
        .string()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_WORLD_TICK_MANAGER_HOST_CONTAINER_BIND_EXTERNAL,
        ),
    VRCA_CLI_SERVICE_WORLD_TICK_MANAGER_PORT: z.coerce
        .number()
        .default(
            VircadiaConfig_SERVER.VRCA_SERVER_SERVICE_WORLD_TICK_MANAGER_PORT_CONTAINER_BIND_EXTERNAL,
        ),
});
export const VircadiaConfig_CLI = cliEnvSchema.parse(process.env);
