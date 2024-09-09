import {
    createClient,
    SupabaseClient,
    RealtimeChannel,
    RealtimePostgresChangesPayload,
    REALTIME_LISTEN_TYPES,
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
} from '@supabase/supabase-js';
import { Agent } from '../../../meta.js';

export namespace Supabase {
    let supabaseClient: SupabaseClient | null = null;
    const activeSubscriptions: Map<Agent.E_WorldTransportChannel, RealtimeChannel[]> =
        new Map();

    let supabaseUrl: string | null = null;
    let supabaseKey: string | null = null;

    export function initializeSupabaseClient(
        url: string,
        key: string,
    ): SupabaseClient {
        supabaseUrl = url;
        supabaseKey = key;
        log(`Initializing Supabase client at ${url}`, 'info');
        supabaseClient = createClient(url, key);
        return supabaseClient;
    }

    export function getSupabaseClient(): SupabaseClient | null {
        return supabaseClient;
    }

    export function connectRealtime(): void {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        try {
            supabaseClient.realtime.connect();
            log(`Connected to Supabase Realtime at ${supabaseUrl}`, 'info');
        } catch (error) {
            log(`Failed to connect to Supabase Realtime: ${error}`, 'error');
            throw error;
        }
    }

    export function subscribeToTable(
        channel: Agent.E_WorldTransportChannel,
        callback: (payload: RealtimePostgresChangesPayload<any>) => void,
        event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
    ): void {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        const subscription = supabaseClient
            .channel(`${channel}`)
            .on(
                `${REALTIME_LISTEN_TYPES.POSTGRES_CHANGES}`,
                {
                    event,
                    schema: 'public',
                    table: channel,
                },
                callback,
            )
            .subscribe();

        if (!activeSubscriptions.has(channel)) {
            activeSubscriptions.set(channel, []);
        }
        activeSubscriptions.get(channel)!.push(subscription);
    }

    export function unsubscribeFromTable(
        channel: Agent.E_WorldTransportChannel,
    ): void {
        const subscriptions = activeSubscriptions.get(channel);
        if (subscriptions) {
            subscriptions.forEach((subscription) => {
                subscription.unsubscribe().catch((error) => {
                    log(`Failed to unsubscribe from table ${channel}: ${error}`, 'error');
                });
            });
            activeSubscriptions.delete(channel);
        }
    }

    export function subscribeToAllTables(
        callback: () => void,
        event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
    ): void {
        Object.values(Agent.E_WorldTransportChannel).forEach((channel) =>
            subscribeToTable(channel, callback, event),
        );
    }

    export function unsubscribeFromAllTables(): void {
        Object.values(Agent.E_WorldTransportChannel).forEach(unsubscribeFromTable);
    }

    export function disconnectRealtime(): void {
        if (supabaseClient) {
            supabaseClient.realtime.disconnect();
            log('Disconnected from Supabase Realtime', 'info');
        }
    }

    export function getActiveSubscriptions(): Map<
        Agent.E_WorldTransportChannel,
        RealtimeChannel[]
    > {
        return activeSubscriptions;
    }
}
