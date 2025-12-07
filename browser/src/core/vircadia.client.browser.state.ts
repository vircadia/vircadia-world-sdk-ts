/**
 * Browser State
 *
 * Manages shared browser state that can be imported by Vue components and
 * accessed by Puppeteer scripts via page.waitForFunction().
 *
 * This object does NOT depend on the browser core, so it can be safely imported
 * in contexts where the core is not yet initialized.
 *
 * State is managed via window properties for easy access from browser context.
 * Puppeteer scripts can access this state via window.__VircadiaClientBrowserState__.
 */

import { z } from "zod";

/**
 * Browser state schema
 */
export const ClientBrowserStateSchema = z.object({
    sceneReady: z.boolean(),
    isAutonomousAgent: z.boolean(),
    autonomousAgent: z
        .object({
            tts: z.object({
                loading: z.boolean(),
                step: z.string(),
                progressPct: z.number(),
                generating: z.boolean(),
                ready: z.boolean(),
            }),
            llm: z.object({
                loading: z.boolean(),
                step: z.string(),
                progressPct: z.number(),
                generating: z.boolean(),
                ready: z.boolean(),
            }),
            stt: z.object({
                loading: z.boolean(),
                step: z.string(),
                processing: z.boolean(),
                ready: z.boolean(),
                active: z.boolean(),
                attachedIds: z.array(z.string()),
            }),
            vad: z.object({
                recording: z.boolean(),
                segmentsCount: z.number(),
                lastSegmentAt: z.number().nullable(),
            }),
            webrtc: z.object({
                connected: z.boolean(),
                peersCount: z.number(),
                localStream: z.boolean(),
            }),
            audio: z.object({
                rmsLevel: z.number(),
                rmsPct: z.number(),
            }),
            speaking: z.boolean(),
            transcriptsCount: z.number(),
            llmOutputsCount: z.number(),
            conversationItemsCount: z.number(),
        })
        .optional(),
});

/**
 * Inferred type from the schema
 */
export type ClientBrowserState = z.infer<typeof ClientBrowserStateSchema>;

/**
 * Window interface extension for the browser state
 */
declare global {
    interface Window {
        __VircadiaClientBrowserState__?: ClientBrowserState;
    }
}

/**
 * Get the current state from window, or return defaults
 */
function getState(): ClientBrowserState {
    if (typeof window === "undefined") {
        return { sceneReady: false, isAutonomousAgent: false };
    }
    return (
        window.__VircadiaClientBrowserState__ ?? {
            sceneReady: false,
            isAutonomousAgent: false,
        }
    );
}

/**
 * Set state on window with schema validation
 */
function setState(newState: Partial<ClientBrowserState>): void {
    if (typeof window === "undefined") {
        return;
    }
    const currentState = getState();
    const mergedState = { ...currentState, ...newState };
    const validatedState = ClientBrowserStateSchema.parse(mergedState);
    window.__VircadiaClientBrowserState__ = validatedState;
}

/**
 * Reset state to defaults
 */
function resetState(): void {
    if (typeof window === "undefined") {
        return;
    }
    window.__VircadiaClientBrowserState__ = {
        sceneReady: false,
        isAutonomousAgent: false,
    };
}

/**
 * Browser state manager
 */
export const clientBrowserState = {
    /**
     * Check if the Babylon.js scene is ready
     */
    isSceneReady(): boolean {
        return getState().sceneReady;
    },

    /**
     * Set the Babylon.js scene ready state
     */
    setSceneReady(ready: boolean): void {
        setState({ sceneReady: ready });
    },

    /**
     * Check if running as autonomous agent
     */
    isAutonomousAgent(): boolean {
        return getState().isAutonomousAgent;
    },

    /**
     * Set the autonomous agent flag
     */
    setIsAutonomousAgent(isAgent: boolean): void {
        setState({ isAutonomousAgent: isAgent });
    },

    /**
     * Set the autonomous agent state
     */
    setAutonomousAgentState(state: unknown): void {
        setState({
            autonomousAgent: state as NonNullable<
                ClientBrowserState["autonomousAgent"]
            >,
        });
    },

    /**
     * Reset all state
     */
    reset(): void {
        resetState();
    },

    /**
     * Get the full state (for debugging)
     */
    getState(): ClientBrowserState {
        return getState();
    },
};
