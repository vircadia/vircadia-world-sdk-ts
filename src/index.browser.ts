import { version } from "../package.json";

// Version information
export const VERSION = version;

// Browser-specific exports
export * from "./client/config/browser/vircadia.browser.client.config";
export * from "./client/core/browser/vircadia.browser.client.core";
export * from "./client/framework/vue/composable/useVircadiaAsset";
export * from "./client/framework/vue/composable/useVircadiaEntity";
export * from "./client/framework/vue/provider/useVircadia";

// Schema exports
export * from "./schema/schema.general";

// Theme exports
export * from "./theme/config/vircadia.theme.config";
