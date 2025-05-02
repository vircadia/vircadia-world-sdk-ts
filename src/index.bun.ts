import { version } from "../package.json";

// Version information
export const VERSION = version;

// Server exports (Bun-specific)
export * from "./server/config/vircadia.server.config";
export * from "./server/module/server.log.client";
export * from "./server/module/server.postgres.client";

// Schema exports
export * from "./schema/schema.general";

// CLI exports
export * from "./cli/config/vircadia.cli.config";

// Theme exports
export * from "./theme/config/vircadia.theme.config";
