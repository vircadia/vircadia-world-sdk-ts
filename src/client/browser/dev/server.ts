import { serveDir } from 'https://deno.land/std@0.208.0/http/file_server.ts';
import { transpile } from 'jsr:@deno/emit';

const handler = async (req: Request): Promise<Response> => {
    const pathname = new URL(req.url).pathname;

    if (pathname.endsWith('.ts')) {
        try {
            const result = await transpile(`.${pathname}`, {
                compilerOptions: {
                    lib: ['deno.window', 'dom'],
                    allowJs: true,
                    strict: true,
                },
            });

            const transpiledCode = result.get(`.${pathname}`);

            if (!transpiledCode) {
                console.error('Transpilation failed');
                return new Response('Transpilation failed', {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain' },
                });
            }

            return new Response(transpiledCode, {
                headers: { 'Content-Type': 'application/javascript' },
            });
        } catch (error) {
            console.error('Error compiling TypeScript:', error);
            return new Response(`Compilation error: ${error.message}`, {
                status: 500,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
    }

    return serveDir(req, {
        fsRoot: '.',
        urlRoot: '',
        showDirListing: true,
        enableCors: true,
    });
};

Deno.serve({ port: 8000 }, handler);

console.log('Development server running on http://localhost:8000');
