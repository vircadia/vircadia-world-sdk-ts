/// <reference lib="deno.ns" />

import { Agent } from './modules/vircadia-world-meta/client/modules/agent/agent.ts';
import { Agent_Store } from './modules/vircadia-world-meta/client/modules/agent/agent_store.ts';
import { Agent_World } from "./modules/vircadia-world-meta/client/modules/agent/agent_world.ts";
import { log } from "./modules/vircadia-world-meta/general/modules/log.ts";

export namespace Deno_Client {
    export const worldConnected = () => Agent_Store.world !== null;

    export namespace Setup {
        export const initialize = (data: {
            iceServers?: RTCIceServer[];
        }) => {
            log({ message: `Initializing Vircadia World`, type: 'info' });
            Agent.initialize({ iceServers: data.iceServers });
            log({ message: 'Initialized Agent module', type: 'info' });
            log({ message: 'Vircadia World initialized', type: 'success' });
        };

        export const connect = (data: {
            agentId: string;
            capabilities: { useWebRTC: boolean };
            host: string;
            port: number;
            key: string;
        }) => {
            Agent_World.connectToWorld(data);
        };
    }

    export namespace Test {
        export const all = async () => {
            log({ message: 'Testing all', type: 'info' });
            Setup.initialize({});
            Setup.connect({ 
                agentId: '1234567890', 
                capabilities: { useWebRTC: false }, 
                host: 'localhost', 
                port: 3000, 
                key: '1234567890' 
            });
            
            // Add a delay to ensure connection is established
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Test database connection
            await Test.databaseConnection();
        }

        export const databaseConnection = async () => {
            log({ message: 'Testing database connection', type: 'info' });
            await Agent_World.Test.databaseConnection();
        }
    }
}

if (import.meta.main) {
    Deno.test("all", async () => {
        await Deno_Client.Test.all();
    });
}