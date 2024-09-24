import { Agent as AgentMeta } from '../../../meta.ts';
import { Helpers } from './helpers/index.ts';
import { Agent_World } from './world.ts';
import { Agent_Store } from './store.ts';

export class Agent {
    static readonly AGENT_LOG_PREFIX = '[AGENT]';

    static World = Agent_World;
    static Store = Agent_Store;
    static Helpers = Helpers;
}
