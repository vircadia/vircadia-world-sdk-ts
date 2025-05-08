import { useAsset as useAssetVue } from "./client/vue/composable/useAsset";
import { useEntity as useEntityVue } from "./client/vue/composable/useEntity";
import { useVircadia as useVircadiaVue } from "./client/vue/provider/useVircadia";
import { ClientBrowserConfiguration } from "./client/config/vircadia.client.browser.config";

// Client exports
export const clientBrowserConfig = ClientBrowserConfiguration;

// Vue exports
export const useAsset = useAssetVue;
export const useEntity = useEntityVue;
export const useVircadia = useVircadiaVue;

// Schema exports
export * from "./schema/vircadia.schema.general";
