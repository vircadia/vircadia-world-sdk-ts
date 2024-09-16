import { Agent } from './modules/vircadia-world-meta/client/modules/agent/agent.ts';
import { Agent_Store } from './modules/vircadia-world-meta/client/modules/agent/agent_store.ts';
import { Agent_World } from "./modules/vircadia-world-meta/client/modules/agent/agent_world.ts";
import { log } from "./modules/vircadia-world-meta/general/modules/log.ts";

export namespace Browser_Client {
    export const worldConnected = () => Agent_Store.world !== null;

    export namespace Setup {
        export const InitializeVircadiaWorld = (data: {
            agentId: string;
            iceServers?: RTCIceServer[];
        }) => {
            log({ message: `Initializing Vircadia World for agent ${data.agentId}`, type: 'info' });
            Agent.initialize({ iceServers: data.iceServers });
            log({ message: 'Initialized Agent module', type: 'info' });
            log({ message: 'Vircadia World initialized', type: 'success' });
        };

        export const ConnectToVircadiaWorld = (data: {
            agentId: string;
            capabilities: { useWebRTC: boolean };
            host: string;
            port: number;
            key: string;
        }) => {
            Agent_World.connectToWorld(data);
        };
    }
}


    // await Client.Setup.InitializeVircadiaWorld({
    //     host: "http://localhost",
    //     port: 3000,
    //     agentId: "1234567890",
    // });