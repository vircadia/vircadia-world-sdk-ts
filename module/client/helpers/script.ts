import * as ts from 'typescript';
import { log } from '../../general/log';
import type { World } from '../../vircadia-world-meta/typescript/meta';

export class Script {
    static readonly scriptLogPrefix = '[SCRIPT]';

    private static transpile(script: string): string {
        log({
            message: `${Script.scriptLogPrefix} Transpiling script: ${script}`,
            type: 'info',
        });

        const result = ts.transpileModule(script, {
            compilerOptions: {
                module: ts.ModuleKind.None,
                target: ts.ScriptTarget.ES2015,
                strict: false,
            },
        });

        log({
            message: `${Script.scriptLogPrefix} Transpiled script: ${result.outputText}`,
            type: 'info',
        });

        return result.outputText;
    }

    private static wrapScript(script: string): string {
        return `
            return function(context) {
                with (context) {
                    ${script}
                }
            };
        `;
    }

    static async execute(script: string, context: Record<string, any>): Promise<any> {
        const transpiledScript = this.transpile(script);
        const wrappedScript = this.wrapScript(transpiledScript);

        try {
            const scriptFunction = new Function(wrappedScript)();
            if (typeof scriptFunction !== 'function') {
                throw new Error('Failed to create a valid function from the script');
            }
            return scriptFunction(context);
        } catch (error) {
            log({
                message: `${Script.scriptLogPrefix} Error executing script: ${error}`,
                type: 'error',
            });
            throw error;
        }
    }

    static async executeBabylonScript(script: string, context: World.Babylon.Script.I_Context): Promise<any> {
        return this.execute(script, { ...context, console });
    }
}

export default Script;
