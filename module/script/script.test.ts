import { expect, test, describe } from "bun:test";
import { Script } from "./script";
import type postgres from "postgres";
import { Scene, Engine, NullEngine } from "@babylonjs/core";

describe("Script Module", () => {
    test("executeBabylonScript should execute valid script", async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        // Updated mock context with all hooks
        const mockContext = {
            Vircadia: {
                Hook: {
                    onBeforeScriptUnmount: undefined,
                    onBeforeEntityUnmount: undefined,
                    onUpdate: undefined,
                    onFixedUpdate: undefined,
                    onMount: undefined,
                    onEntityUpdateSync: undefined,
                    onEntityKeyframeSync: undefined,
                },
                Client: {} as typeof postgres,
                Meta: {
                    isRunningOnClient: false,
                    isRunningOnWorld: false,
                },
                Performance: {
                    clientUpdateSyncMs: 100,
                    clientKeyframeSyncMs: 100,
                },
                Babylon: {
                    Scene: scene,
                },
            },
        };

        // Updated test script that sets up multiple hooks
        const testScript = `
            Vircadia.Hook.onBeforeScriptUnmount = () => console.log('script unmounting');
            Vircadia.Hook.onBeforeEntityUnmount = () => console.log('entity unmounting');
            Vircadia.Hook.onUpdate = () => console.log('updating');
            Vircadia.Hook.onFixedUpdate = () => console.log('fixed updating');
            Vircadia.Hook.onMount = () => console.log('mounting');
            Vircadia.Hook.onEntityUpdateSync = (entity) => console.log('entity update sync');
            Vircadia.Hook.onEntityKeyframeSync = (entity) => console.log('entity keyframe sync');
        `;

        const result = await Script.executeBabylonScript(
            testScript,
            mockContext,
        );

        // Verify the result structure with all hooks
        expect(result).toHaveProperty("scriptFunction");
        expect(result).toHaveProperty("hooks");
        expect(typeof result.scriptFunction).toBe("function");
        expect(result.hooks).toHaveProperty("onBeforeScriptUnmount");
        expect(result.hooks).toHaveProperty("onBeforeEntityUnmount");
        expect(result.hooks).toHaveProperty("onUpdate");
        expect(result.hooks).toHaveProperty("onFixedUpdate");
        expect(result.hooks).toHaveProperty("onMount");
        expect(result.hooks).toHaveProperty("onEntityUpdateSync");
        expect(result.hooks).toHaveProperty("onEntityKeyframeSync");
    });

    test("executeBabylonScript should throw on invalid script", async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const mockContext = {
            Vircadia: {
                Hook: {
                    onBeforeScriptUnmount: undefined,
                    onBeforeEntityUnmount: undefined,
                    onUpdate: undefined,
                    onFixedUpdate: undefined,
                    onMount: undefined,
                    onEntityUpdateSync: undefined,
                    onEntityKeyframeSync: undefined,
                },
                Client: {} as typeof postgres,
                Meta: {
                    isRunningOnClient: false,
                    isRunningOnWorld: false,
                },
                Performance: {
                    clientUpdateSyncMs: 100,
                    clientKeyframeSyncMs: 100,
                },
                Babylon: {
                    Scene: scene,
                },
            },
        };

        const invalidScript = "this is not valid javascript;;;;;";

        await expect(async () => {
            await Script.executeBabylonScript(invalidScript, mockContext);
        }).toThrow();
    });

    test("executeBabylonScript should execute script in context", async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const mockContext = {
            testVariable: 42,
            Vircadia: {
                Hook: {
                    onBeforeScriptUnmount: undefined,
                    onBeforeEntityUnmount: undefined,
                    onUpdate: undefined,
                    onFixedUpdate: undefined,
                    onMount: undefined,
                    onEntityUpdateSync: undefined,
                    onEntityKeyframeSync: undefined,
                },
                Client: {} as typeof postgres,
                Meta: {
                    isRunningOnClient: false,
                    isRunningOnWorld: false,
                },
                Performance: {
                    clientUpdateSyncMs: 100,
                    clientKeyframeSyncMs: 100,
                },
                Babylon: {
                    Scene: scene,
                },
            },
        };

        const testScript = `
            if (testVariable !== 42) {
                throw new Error('Context not properly provided');
            }
        `;

        const result = await Script.executeBabylonScript(
            testScript,
            mockContext,
        );
        expect(result).toHaveProperty("scriptFunction");
    });
});
