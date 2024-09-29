import { SupabaseClient } from "@supabase/supabase-js";
import { log } from "../../general/log.ts";

export class World_Client {
    private supabaseClient: SupabaseClient | null = null;
    private url: string;
    private key: string;

    constructor({
        url,
        key,
    }: {
        url: string;
        key: string;
    }) {
        this.url = url;
        this.key = key;
        this.initializeClient();
    }

    private initializeClient(): void {
        log({
            message: `Initializing Supabase client at [${this.url}], with key [${this.key}], key length: [${this.key.length}]`,
            type: "info",
        });
        this.supabaseClient = new SupabaseClient(this.url, this.key);
        this.supabaseClient.realtime.connect();
        log({
            message: `Supabase client initialized`,
            type: "info",
        });
    }

    public getClient(): World_Client {
        return this;
    }

    public getSupabaseClient(): SupabaseClient | null {
        return this.supabaseClient;
    }

    public async destroyClient(): Promise<null> {
        if (this.supabaseClient) {
            log({
                message: `Deinitializing Supabase client`,
                type: "info",
            });
            this.supabaseClient.realtime.disconnect();
            await this.supabaseClient.removeAllChannels();
            log({
                message: `Supabase client deinitialized`,
                type: "info",
            });
            this.supabaseClient = null;
        }
        return null;
    }
}
