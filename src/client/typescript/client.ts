import { log } from '../server/modules/general/log.js';
import { Agent } from './modules/agent/agent.js';
import { WebRTC_Media } from './modules/agent/agent_webRTC_media.js';

export namespace Client {
    export const worldConnected = () => Agent.isConnectedToAnyWorld();

    export namespace Setup {
        export const InitializeVircadiaWorld = (data: {
            agentId: string;
        }) => {
            // log(`Initializing Vircadia World for agent ${data.agentId}`, 'info');
            // // Initialize Agent and Media modules
            // Agent.initialize(data.agentId);
            // log('Initialized Agent module', 'info');
            // WebRTC_Media.InitializeMediaModule();
            // log('Initialized Media module', 'info');
            // log('Vircadia World initialized', 'success');
        };
    }
}
