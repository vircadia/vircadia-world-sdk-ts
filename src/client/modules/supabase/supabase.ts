import {
    createClient,
    SupabaseClient,
    RealtimeChannel,
} from '@supabase/supabase-js';

export enum SupabaseChannels {
    EXAMPLE_CHANNEL = 'example_channel',
    // Add more channels as needed
}

export namespace Supabase {
    let supabaseClient: SupabaseClient | null = null;
    const activeSubscriptions: Map<SupabaseChannels, RealtimeChannel> =
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
            await supabaseClient.realtime.connect();
            console.log('Connected to Supabase Realtime');
        } catch (error) {
            console.error('Failed to connect to Supabase Realtime:', error);
            throw error;
        }
    }

    export function subscribe(
        channel: SupabaseChannels,
        callback: (payload: any) => void,
    ): void {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        const subscription = supabaseClient
            .channel(channel)
            .on('broadcast', { event: 'update' }, callback)
            .subscribe();

        activeSubscriptions.set(channel, subscription);
    }

    export function unsubscribe(channel: SupabaseChannels): void {
        const subscription = activeSubscriptions.get(channel);
        if (subscription) {
            subscription.unsubscribe();
            activeSubscriptions.delete(channel);
        }
    }

    export function disconnectRealtime(): void {
        if (supabaseClient) {
            supabaseClient.realtime.disconnect();
            console.log('Disconnected from Supabase Realtime');
        }
    }
}
