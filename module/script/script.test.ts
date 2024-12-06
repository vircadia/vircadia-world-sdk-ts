import { expect, test, describe } from "bun:test";
import { Script } from "./script";
import type postgres from "postgres";
import { Scene, Engine, NullEngine } from "@babylonjs/core";

describe("Script Module", () => {
    test("executeBabylonScript should execute valid script", async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        // Updated mock context with correct hook names
        const mockContext = {
            Vircadia: {
                Hook: {
                    onScriptBeforeUnmount: undefined,
                    onEntityBeforeUnmount: undefined,
                    onEngineUpdate: undefined,
                    onEngineFixedUpdate: undefined,
                    onScriptMount: undefined,
                    onEntityUpdate: undefined,
                    onEntityKeyframeUpdate: undefined,
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

        // Updated test script with correct hook names
        const testScript = `
            Vircadia.Hook.onScriptBeforeUnmount = () => console.log('script unmounting');
            Vircadia.Hook.onEntityBeforeUnmount = () => console.log('entity unmounting');
            Vircadia.Hook.onEngineUpdate = () => console.log('updating');
            Vircadia.Hook.onEngineFixedUpdate = () => console.log('fixed updating');
            Vircadia.Hook.onScriptMount = () => console.log('mounting');
            Vircadia.Hook.onEntityUpdate = (entity) => console.log('entity update sync');
            Vircadia.Hook.onEntityKeyframeUpdate = (entity) => console.log('entity keyframe sync');
        `;

        const result = await Script.executeBabylonScript(
            testScript,
            mockContext,
        );

        // Updated expect statements with correct hook names
        expect(result).toHaveProperty("scriptFunction");
        expect(result).toHaveProperty("hooks");
        expect(typeof result.scriptFunction).toBe("function");
        expect(result.hooks).toHaveProperty("onScriptBeforeUnmount");
        expect(result.hooks).toHaveProperty("onEntityBeforeUnmount");
        expect(result.hooks).toHaveProperty("onEngineUpdate");
        expect(result.hooks).toHaveProperty("onEngineFixedUpdate");
        expect(result.hooks).toHaveProperty("onScriptMount");
        expect(result.hooks).toHaveProperty("onEntityUpdate");
        expect(result.hooks).toHaveProperty("onEntityKeyframeUpdate");
    });

    test("executeBabylonScript should throw on invalid script", async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const mockContext = {
            Vircadia: {
                Hook: {
                    onScriptBeforeUnmount: undefined,
                    onEntityBeforeUnmount: undefined,
                    onEngineUpdate: undefined,
                    onEngineFixedUpdate: undefined,
                    onScriptMount: undefined,
                    onEntityUpdate: undefined,
                    onEntityKeyframeUpdate: undefined,
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
                    onScriptBeforeUnmount: undefined,
                    onEntityBeforeUnmount: undefined,
                    onEngineUpdate: undefined,
                    onEngineFixedUpdate: undefined,
                    onScriptMount: undefined,
                    onEntityUpdate: undefined,
                    onEntityKeyframeUpdate: undefined,
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
