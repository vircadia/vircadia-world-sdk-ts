// filepath: /Users/aurora/Documents/Projects/Vircadia/vircadia-world/sdk/vircadia-world-sdk-ts/module/client/framework/vue/provider/injectionKeys.ts
import type { InjectionKey, Ref } from "vue";
import type {
    VircadiaClientCore,
    ConnectionStats,
} from "../../../core/vircadia.client.core";

export const VIRCADIA_CLIENT_KEY: InjectionKey<VircadiaClientCore> =
    Symbol("vircadiaClient");
export const VIRCADIA_CONNECTION_STATUS_KEY: InjectionKey<
    Ref<ConnectionStats>
> = Symbol("vircadiaConnectionStatus");
