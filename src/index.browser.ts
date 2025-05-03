import { version } from "../package.json";

// Version information
export const VERSION = version;

// Client exports
export * from "./client/core/vircadia.client.browser.config";
export * from "./client/core/vircadia.client.common.core";

// Framework exports
export * from "./client/vue/composable/useVircadiaAsset";
export * from "./client/vue/composable/useVircadiaEntity";
export * from "./client/vue/provider/useVircadia";

// Schema exports
export * from "./schema/vircadia.schema.general";
