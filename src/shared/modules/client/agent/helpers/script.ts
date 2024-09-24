import { transpile } from 'typescript';
import { log } from '../../../vircadia-world-meta/general/modules/log.ts';

export class Script {
    static readonly scriptLogPrefix = '[SCRIPT]';

    private static async transpile(script: string): Promise<string> {
        log({
            message: `${Script.scriptLogPrefix} Transpiling script: ${script}`,
            type: 'info',
        });

        const transpiledScript: string = await (transpile as (input: string) => string)(script);

        log({
            message: `${Script.scriptLogPrefix} Transpiled script: ${transpiledScript}`,
            type: 'info',
        });

        return transpiledScript;
    }

    private static async wrapAndTranspile(script: string, contextKeys: string[]): Promise<string> {
        const contextParamsString = contextKeys.join(', ');
        const wrappedScript = `
            (function(${contextParamsString}) {
                ${script}
            });
        `;

        const transpiledScript = await this.transpile(wrappedScript);

        return transpiledScript;
    }

    static async execute(script: string, context: Record<string, any>): Promise<any> {
        const contextKeys = Object.keys(context);
        const wrappedAndTranspiledScript = await this.wrapAndTranspile(script, contextKeys);

        log({
            message: `${Script.scriptLogPrefix} Executing script with context: ${wrappedAndTranspiledScript}`,
            type: 'info',
        });

        // eslint-disable-next-line no-eval
        const scriptFunction = eval(wrappedAndTranspiledScript) as (...args: unknown[]) => unknown;
        return scriptFunction(...Object.values(context) as unknown[]);
    }
}

export default Script;
