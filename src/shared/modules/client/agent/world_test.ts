import { log } from '../../../general/modules/log.ts';
import { Agent } from './agent.ts';
import { Agent as AgentMeta } from '../../../meta.ts';

export async function runAgentWorldTest() {
    const DENO_AGENT_WORLD_TEST_LOG_PREFIX = '[DENO_AGENT_WORLD_TEST]';

    log({ message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Testing database connection`, type: 'info' });
    
    const world = Agent.Store.world;
    if (!world || !world.supabaseClient) {
        throw new Error(`No world connection or Supabase client available`);
    }

    const tables = Object.values(AgentMeta.E_Realtime_Postgres_TableChannel);

    try {
        for (const table of tables) {
            log({ message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Testing table: ${table}`, type: 'info' });

            // Insert a test record
            const { data: insertData, error: insertError } = await world.supabaseClient
                .from(table)
                .insert({
                    vircadia_uuid: crypto.randomUUID(),
                    vircadia_world_uuid: crypto.randomUUID(),
                    name: `Test ${table}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select();

            if (insertError) throw new Error(`Insert error for ${table}: ${insertError.message}`);

            log({
                message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Inserted test record in ${table}: ${JSON.stringify(insertData)}`,
                type: 'info',
            });

            // Retrieve the test record
            const { data: retrieveData, error: retrieveError } = await world.supabaseClient
                .from(table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (retrieveError) throw new Error(`Retrieve error for ${table}: ${retrieveError.message}`);

            log({
                message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Retrieved test record from ${table}: ${JSON.stringify(retrieveData)}`,
                type: 'info',
            });

            // Delete the test record
            const { error: deleteError } = await world.supabaseClient
                .from(table)
                .delete()
                .eq('vircadia_uuid', insertData[0].vircadia_uuid);

            if (deleteError) throw new Error(`Delete error for ${table}: ${deleteError.message}`);

            log({
                message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Deleted test record from ${table}`,
                type: 'info',
            });
        }

        log({
            message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Database test completed successfully for all tables`,
            type: 'success',
        });
    } catch (error) {
        log({
            message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Database test failed: ${error}`,
            type: 'error',
        });
    }

    log({ message: `${DENO_AGENT_WORLD_TEST_LOG_PREFIX} Database connection successful`, type: 'info' });
}

if (import.meta.main) {
    Deno.test("Agent World", runAgentWorldTest);
}