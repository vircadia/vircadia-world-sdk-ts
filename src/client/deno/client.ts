/// <reference lib="deno.ns" />

import { Agent as Agent_Module } from './modules/vircadia-world-meta/client/modules/agent/agent.ts';
import { log } from "./modules/vircadia-world-meta/general/modules/log.ts";

export namespace Deno_Client {
    export const DENO_CLIENT_LOG_PREFIX = '[DENO_CLIENT]';

    export namespace Setup {
        export const initialize = (data: {
            iceServers?: RTCIceServer[];
        }) => {
            log({ message: `${DENO_CLIENT_LOG_PREFIX} Initializing Vircadia World`, type: 'info' });
            Agent_Module.initialize({ iceServers: data.iceServers });
            log({ message: `${DENO_CLIENT_LOG_PREFIX} Initialized Agent module`, type: 'info' });
            log({ message: `${DENO_CLIENT_LOG_PREFIX} Vircadia World initialized`, type: 'success' });
        };
    }

    export const Agent = Agent_Module;
}
