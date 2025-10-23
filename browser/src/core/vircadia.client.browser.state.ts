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
        return { sceneReady: false };
    }
    return window.__VircadiaClientBrowserState__ ?? { sceneReady: false };
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
    window.__VircadiaClientBrowserState__ = { sceneReady: false };
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
