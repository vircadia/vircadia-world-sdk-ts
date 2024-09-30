import { Helpers } from './helpers/index';
import { Agent_World } from './world';
import { Agent_Store } from './store';

export class Agent {
    static readonly AGENT_LOG_PREFIX = '[AGENT]';

    static World = Agent_World;
    static Store = Agent_Store;
    static Helpers = Helpers;
}
