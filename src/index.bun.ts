import { version } from "../package.json";

// Version information
export const VERSION = version;

// Client exports
export * from "./client/core/vircadia.client.common.core";

// Schema exports
export * from "./schema/vircadia.schema.general";

// Module exports
export * from "./client/module/bun/vircadia.client.bun.log";
