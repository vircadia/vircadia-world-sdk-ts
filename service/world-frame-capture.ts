import { createClient } from "@supabase/supabase-js";

export class WorldFrameCaptureService {
    private supabase;
    private intervalId: Timer | null = null;
    private targetIntervalMs: number = 16.67;
    private lastServerTime: Date | null = null;
    private frameCount: number = 0;

    constructor(
        private readonly supabaseUrl: string,
        private readonly supabaseKey: string,
    ) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async initialize() {
        try {
            // Fetch the frame duration from world_config
            const { data, error } = await this.supabase
                .from("world_config")
                .select("value")
                .eq("key", "tick_rate_ms")
                .single();

            if (error) throw error;

            // Get current server time
            const { data: timeData, error: timeError } =
                await this.supabase.rpc("get_server_time");

            if (timeError) throw timeError;

            this.lastServerTime = new Date(timeData);
            this.targetIntervalMs = Number.parseFloat(data.value as string);

            console.log(
                `Initialized with frame duration: ${this.targetIntervalMs}ms, server time: ${this.lastServerTime}`,
            );
        } catch (error) {
            console.error("Failed to initialize frame capture service:", error);
            throw error;
        }
    }

    async captureFrame() {
        try {
            const startTime = performance.now();

            // Get current server time before capture
            const { data: timeData, error: timeError } =
                await this.supabase.rpc("get_server_time");

            if (timeError) {
                console.error("Failed to get server time:", timeError);
                return;
            }

            const currentServerTime = new Date(timeData);
            const { error } = await this.supabase.rpc("capture_entity_state");

            if (error) {
                console.error("Frame capture failed:", error);
            } else {
                this.lastServerTime = currentServerTime;
                this.frameCount++;

                // Log performance metrics
                const elapsed = performance.now() - startTime;
                if (elapsed > this.targetIntervalMs) {
                    console.warn(
                        `Frame took ${elapsed.toFixed(2)}ms (target: ${this.targetIntervalMs}ms)`,
                    );
                }
            }
        } catch (error) {
            console.error("Error during frame capture:", error);
        }
    }

    start() {
        if (this.intervalId) {
            console.warn("Frame capture service is already running");
            return;
        }

        console.log(
            `Starting frame capture service with ${this.targetIntervalMs}ms interval`,
        );

        let lastTickTime = performance.now();
        let drift = 0;

        // Use a more precise timing mechanism
        const tick = async () => {
            const now = performance.now();
            const delta = now - lastTickTime;

            await this.captureFrame();

            // Calculate next tick time accounting for drift
            lastTickTime = now;
            drift += delta - this.targetIntervalMs;

            // Adjust next interval to account for drift
            const nextDelay = Math.max(0, this.targetIntervalMs - drift);

            // Reset drift if it gets too large
            if (Math.abs(drift) > this.targetIntervalMs * 2) {
                drift = 0;
            }

            // Schedule next frame
            this.intervalId = setTimeout(tick, nextDelay);
        };

        // Start the first tick
        tick();
    }

    stop() {
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
            console.log("Frame capture service stopped");
        }
    }

    getStats() {
        return {
            frameCount: this.frameCount,
            lastServerTime: this.lastServerTime,
            targetInterval: this.targetIntervalMs,
        };
    }
}
