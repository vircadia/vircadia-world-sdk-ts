import {
    createClient,
    SupabaseClient,
    RealtimeChannel,
    RealtimePostgresChangesPayload,
    REALTIME_LISTEN_TYPES,
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
} from '@supabase/supabase-js';
import { E_WorldTransportChannels } from '../../../routes/meta.js';

export namespace Supabase {
    let supabaseClient: SupabaseClient | null = null;
    const activeSubscriptions: Map<E_WorldTransportChannels, RealtimeChannel> =
        new Map();

    export function initializeSupabaseClient(
        url: string,
        key: string,
    ): SupabaseClient {
        supabaseClient = createClient(url, key);
        return supabaseClient;
    }

    export function getSupabaseClient(): SupabaseClient | null {
        return supabaseClient;
    }

    export async function connectRealtime(): Promise<void> {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        try {
            supabaseClient.realtime.connect();
            console.log('Connected to Supabase Realtime');
        } catch (error) {
            console.error('Failed to connect to Supabase Realtime:', error);
            throw error;
        }
    }

    export function subscribeToTable(
        channel: E_WorldTransportChannels,
        callback: (payload: RealtimePostgresChangesPayload<any>) => void,
        event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
    ): void {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        const subscription = supabaseClient
            .channel(`${channel}`)
            .on(
                REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
                {
                    event: event,
                    schema: 'public',
                    table: channel,
                },
                callback,
            )
            .subscribe();
        activeSubscriptions.set(channel, subscription);
    }

    export function unsubscribeFromTable(
        channel: E_WorldTransportChannels,
    ): void {
        const subscription = activeSubscriptions.get(channel);
        if (subscription) {
            subscription.unsubscribe();
            activeSubscriptions.delete(channel);
        }
    }

    export function subscribeToAllTables(
        callback: (payload: any) => void,
        event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
    ): void {
        Object.values(E_WorldTransportChannels).forEach((channel) =>
            subscribeToTable(channel, callback, event),
        );
    }

    export function unsubscribeFromAllTables(): void {
        Object.values(E_WorldTransportChannels).forEach(unsubscribeFromTable);
    }

    export function disconnectRealtime(): void {
        if (supabaseClient) {
            supabaseClient.realtime.disconnect();
            console.log('Disconnected from Supabase Realtime');
        }
    }

    export function getActiveSubscriptions(): Map<
        E_WorldTransportChannels,
        RealtimeChannel
    > {
        return activeSubscriptions;
    }
}
