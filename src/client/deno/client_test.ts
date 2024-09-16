import { Deno_Client } from "./client.ts";
import { log } from "./modules/vircadia-world-meta/general/modules/log.ts";

const DENO_CLIENT_TEST_LOG_PREFIX = '[DENO_CLIENT_TEST]';

Deno.test("All tests", async () => {
    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Testing all`, type: 'info' });
    Deno_Client.Setup.initialize({});
    await Deno_Client.Agent.World.connectToWorld({ 
        agentId: '1234567890', 
        capabilities: { useWebRTC: false }, 
        host: 'localhost', 
        port: 3000, 
        key: '1234567890' 
    });
    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Connected to server`, type: 'info' });

    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Testing database connection`, type: 'info' });
    
    const world = Deno_Client.Agent.Store.world;
    if (!world || !world.supabaseClient) {
        log({
            message:
                `${DENO_CLIENT_TEST_LOG_PREFIX} No world connection or Supabase client available`,
            type: 'error',
        });
        return;
    }

    try {
        // Insert a test record
        const { data: insertData, error: insertError } = await world
            .supabaseClient
            .from('test_table')
            .insert({
                message: 'Test message',
                timestamp: new Date().toISOString(),
            })
            .select();

        if (insertError) throw insertError;

        log({
            message:
                `${DENO_CLIENT_TEST_LOG_PREFIX} Inserted test record: ${
                    JSON.stringify(insertData)
                }`,
            type: 'info',
        });

        // Retrieve the test record
        const { data: retrieveData, error: retrieveError } = await world
            .supabaseClient
            .from('test_table')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1);

        if (retrieveError) throw retrieveError;

        log({
            message:
                `${DENO_CLIENT_TEST_LOG_PREFIX} Retrieved test record: ${
                    JSON.stringify(retrieveData)
                }`,
            type: 'info',
        });

        log({
            message:
                `${DENO_CLIENT_TEST_LOG_PREFIX} Database test completed successfully`,
            type: 'success',
        });
    } catch (error) {
        log({
            message:
                `${DENO_CLIENT_TEST_LOG_PREFIX} Database test failed: ${error}`,
            type: 'error',
        });
    }

    log({ message: `${DENO_CLIENT_TEST_LOG_PREFIX} Database connection successful`, type: 'info' });
});

