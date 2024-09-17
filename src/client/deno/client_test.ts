import { Deno_Client } from "./client.ts";
import { log } from "./modules/vircadia-world-meta/general/modules/log.ts";
import { runAgentWorldTest } from "./modules/vircadia-world-meta/client/modules/agent/agent_world_test.ts";
import { assert, assertEquals } from "https://deno.land/std/assert/mod.ts";

const DENO_CLIENT_TEST_LOG_PREFIX = '[DENO_CLIENT_TEST]';

Deno.test("Client initialization and connection", async () => {
    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Testing client initialization and connection`, type: 'info' });
    Deno_Client.Agent.initialize({
        debugMode: true
    });
    await Deno_Client.Agent.World.connectToWorld({ 
        agentId: '1234567890', 
        capabilities: { 
            useWebRTC: false,
            useWebAudio: false,
        }, 
        host: 'http://localhost', 
        port: 3000, 
        key: '1234567890' 
    });

    const connected = Deno_Client.Agent.World.connected();
    const databaseConnected = Deno_Client.Agent.World.databaseConnected();
    const realtimeConnected = Deno_Client.Agent.World.realtimeConnected();
    const host = Deno_Client.Agent.World.host();
    const port = Deno_Client.Agent.World.port();

    if (connected) {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Connected to server at ${host}:${port}`, type: 'info' });
    } else {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Not connected to server at ${host}:${port}`, type: 'info' });
    }

    if (databaseConnected) {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Database connected`, type: 'info' });
    } else {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Database not connected`, type: 'info' });
    }

    if (realtimeConnected) {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Realtime connected`, type: 'info' });
    } else {
        log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Realtime not connected`, type: 'info' });
    }

    assert(connected, "World should be connected");
    assert(databaseConnected, "Database should be connected");
    assert(realtimeConnected, "Realtime should be connected");
    assertEquals(host, 'http://localhost', "Host should be 'http://localhost'");
    assertEquals(port, 3000, "Port should be 3000");
});

Deno.test("Agent World test", async () => {
    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Running Agent World test`, type: 'info' });
    await runAgentWorldTest();
    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Agent World test completed`, type: 'info' });
    // Add assertions here based on what runAgentWorldTest does or returns
    assert(true, "This assertion should be replaced with meaningful checks");
});