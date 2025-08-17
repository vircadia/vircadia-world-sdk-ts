// Vue exports
export * from "./vue/composable/useAsset";
export * from "./vue/provider/useVircadia";

// Schema exports
export * from "../../schema/src/vircadia.schema.general";

// Core exports for direct client usage in Vue apps
export {
    ClientCore,
    type ClientCoreConnectionInfo,
} from "./core/vircadia.client.browser.core";
