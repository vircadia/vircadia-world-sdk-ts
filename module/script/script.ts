import { log } from "../general/log";
import type { Script as ScriptSchema } from "../../schema/schema.general";

export namespace Script {
    export const scriptLogPrefix = "[SCRIPT]";

    async function execute(
        script: string,
        context: ScriptSchema.Babylon.I_Context | ScriptSchema.Base.I_Context,
    ): Promise<ScriptSchema.Base.I_Return> {
        const wrappedScript = `
        return function(context) {
            with (context) {
                ${script}
            }
        };`;

        try {
            const scriptFunction = new Function(wrappedScript)();
            if (typeof scriptFunction !== "function") {
                throw new Error(
                    "Failed to create a valid function from the script",
                );
            }

            // Execute script once just to register hooks
            scriptFunction(context);

            // Capture hooks without executing them
            const hooks = {
                onScriptBeforeUnmount:
                    context.Vircadia?.Hook?.onScriptBeforeUnmount,
                onEntityBeforeUnmount:
                    context.Vircadia?.Hook?.onEntityBeforeUnmount,
                onEngineUpdate: context.Vircadia?.Hook?.onEngineUpdate,
                onEngineFixedUpdate:
                    context.Vircadia?.Hook?.onEngineFixedUpdate,
                onScriptMount: context.Vircadia?.Hook?.onScriptMount,
                onEntityUpdate: context.Vircadia?.Hook?.onEntityUpdate,
                onEntityKeyframeUpdate:
                    context.Vircadia?.Hook?.onEntityKeyframeUpdate,
            };

            return {
                scriptFunction,
                hooks,
            };
        } catch (error) {
            log({
                message: `${Script.scriptLogPrefix} Error executing script: ${error}`,
                type: "error",
            });
            throw error;
        }
    }

    export async function executeBabylonScript(
        script: string,
        context: ScriptSchema.Babylon.I_Context,
    ): Promise<ScriptSchema.Babylon.I_Return> {
        const { scriptFunction, hooks } = await execute(script, context);

        return {
            scriptFunction,
            hooks,
        };
    }
}

export default Script;
