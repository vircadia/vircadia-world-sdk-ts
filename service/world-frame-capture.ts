import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "../module/general/log";

export class WorldFrameCaptureService {
    private intervalId: Timer | null = null;
    private targetIntervalMs = 50;
    private lastServerTime: Date | null = null;
    private frameCount = 0;

    constructor(
        private readonly supabase: SupabaseClient,
        private readonly debugMode: boolean = false,
    ) {
        this.debugMode = debugMode;
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

            log({
                message: `Initialized with frame duration: ${this.targetIntervalMs}ms, server time: ${this.lastServerTime}`,
                debug: this.debugMode,
                type: "debug",
            });
        } catch (error) {
            log({
                message: `Failed to initialize frame capture service: ${error}`,
                debug: this.debugMode,
                type: "error",
            });
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
                log({
                    message: `Failed to get server time: ${timeError}`,
                    debug: this.debugMode,
                    type: "error",
                });
                return;
            }

            const currentServerTime = new Date(timeData);
            const { error } = await this.supabase.rpc("capture_entity_state");

            if (error) {
                log({
                    message: `Frame capture failed: ${error}`,
                    debug: this.debugMode,
                    type: "error",
                });
            } else {
                this.lastServerTime = currentServerTime;
                this.frameCount++;

                // Log performance metrics
                const elapsed = performance.now() - startTime;
                if (elapsed > this.targetIntervalMs) {
                    log({
                        message: `Frame took ${elapsed.toFixed(2)}ms (target: ${this.targetIntervalMs}ms)`,
                        debug: this.debugMode,
                        type: "warn",
                    });
                }
            }
        } catch (error) {
            log({
                message: `Error during frame capture: ${error}`,
                debug: this.debugMode,
                type: "error",
            });
        }
    }

    start() {
        if (this.intervalId) {
            log({
                message: "Frame capture service is already running",
                debug: this.debugMode,
                type: "warn",
            });
            return;
        }

        log({
            message: `Starting frame capture service with ${this.targetIntervalMs}ms interval`,
            debug: this.debugMode,
            type: "debug",
        });

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
            log({
                message: "Frame capture service stopped",
                debug: this.debugMode,
                type: "debug",
            });
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
