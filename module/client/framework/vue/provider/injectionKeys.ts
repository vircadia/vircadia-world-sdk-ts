// filepath: /Users/aurora/Documents/Projects/Vircadia/vircadia-world/sdk/vircadia-world-sdk-ts/module/client/framework/vue/provider/injectionKeys.ts
import type { InjectionKey, Ref, DeepReadonly } from "vue";
import type {
    VircadiaClientCore,
    ConnectionInfo,
} from "../../../core/vircadia.client.core";

export const VIRCADIA_CLIENT_KEY: InjectionKey<VircadiaClientCore> =
    Symbol("vircadiaClient");
export const VIRCADIA_CONNECTION_INFO_KEY: InjectionKey<
    DeepReadonly<Ref<ConnectionInfo>>
> = Symbol("vircadiaConnectionInfo");
