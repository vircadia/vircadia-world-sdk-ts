import { ClientCore } from "./client/core/vircadia.client.common.core";
import { BunLogModule } from "./client/module/bun/vircadia.client.bun.log";
import { PostgresClientModule } from "./client/module/bun/vircadia.client.bun.postgres";

// Config exports
// Nothing yet.

// Client exports
export const clientCore = ClientCore;

// Module exports
export const logModule = BunLogModule;
export const postgresClientModule = PostgresClientModule;

// Schema exports
export * from "./schema/vircadia.schema.general";
