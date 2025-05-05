import { version } from "../package.json";

// Version information
export const VERSION = version;

// Client exports
export * from "./client/core/vircadia.client.browser.config";
export * from "./client/core/vircadia.client.common.core";

// Framework exports
export * from "./client/vue/composable/useVircadiaAsset_Vue";
export * from "./client/vue/composable/useVircadiaEntity_Vue";
export * from "./client/vue/provider/useVircadia_Vue";

// Schema exports
export * from "./schema/vircadia.schema.general";
