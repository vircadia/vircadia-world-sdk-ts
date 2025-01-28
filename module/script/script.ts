import { log } from "../general/log";
import type {
    Script as ScriptSchema,
    Entity as EntitySchema,
} from "../../schema/schema.general";

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

    export function executeHooks(
        hooks: ScriptSchema.Base.I_Hook,
        hookName: keyof ScriptSchema.Base.I_Hook,
        ...args: any[]
    ): void {
        try {
            const hook = hooks[hookName];
            if (typeof hook === "function") {
                (hook as (...args: unknown[]) => void)(...args);
            }
        } catch (error) {
            log({
                message: `${scriptLogPrefix} Error executing hook ${String(hookName)}: ${error}`,
                type: "error",
            });
        }
    }

    // Convenience methods for specific hooks
    export function executeScriptBeforeUnmount(
        hooks: ScriptSchema.Base.I_Hook,
    ): void {
        executeHooks(hooks, "onScriptBeforeUnmount");
    }

    export function executeEntityBeforeUnmount(
        hooks: ScriptSchema.Base.I_Hook,
    ): void {
        executeHooks(hooks, "onEntityBeforeUnmount");
    }

    export function executeScriptMount(hooks: ScriptSchema.Base.I_Hook): void {
        executeHooks(hooks, "onScriptMount");
    }

    export function executeEntityUpdate(
        hooks: ScriptSchema.Base.I_Hook,
        entity: EntitySchema.I_EntityData,
    ): void {
        executeHooks(hooks, "onEntityUpdate", entity);
    }

    export function executeEntityKeyframeUpdate(
        hooks: ScriptSchema.Base.I_Hook,
        entity: EntitySchema.I_EntityData,
    ): void {
        executeHooks(hooks, "onEntityKeyframeUpdate", entity);
    }
}

export default Script;
