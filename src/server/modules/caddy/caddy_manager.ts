import { log } from '../../../shared/modules/vircadia-world-meta/general/modules/log.ts';

interface ProxyConfig {
    from: string;
    to: string;
}

export class CaddyManager {
    private static instance: CaddyManager;
    private caddyProcess: Deno.ChildProcess | null = null;
    private caddyfilePath: string;

    private constructor() {
        this.caddyfilePath = './modules/caddy/tmp/Caddyfile';
    }

    public static getInstance(): CaddyManager {
        if (!CaddyManager.instance) {
            CaddyManager.instance = new CaddyManager();
        }
        return CaddyManager.instance;
    }

    public async setupAndStart(proxyConfigs: ProxyConfig[]): Promise<void> {
        await this.createCaddyfile(proxyConfigs);
        await this.startCaddy();
    }

    private async createCaddyfile(proxyConfigs: ProxyConfig[]): Promise<void> {
        let caddyfileContent = '';

        for (const config of proxyConfigs) {
            caddyfileContent += `
${config.from} {
  reverse_proxy ${config.to}
  encode gzip
}
`;
        }

        await Deno.writeTextFile(this.caddyfilePath, caddyfileContent);
        log({
            message: `Caddyfile created at ${this.caddyfilePath}`,
            type: 'info',
        });
    }

    private async startCaddy(): Promise<void> {
        const caddyCommand = new Deno.Command('caddy', {
            args: ['run', '--config', this.caddyfilePath],
            stdout: 'piped',
            stderr: 'piped',
        });

        this.caddyProcess = caddyCommand.spawn();

        log({
            message: 'Caddy server started',
            type: 'info',
        });

        // Handle Caddy output
        const logOutput = (stream: ReadableStream<Uint8Array>) => {
            stream.pipeTo(
                new WritableStream({
                    write(chunk) {
                        const message = new TextDecoder().decode(chunk).trim();
                        if (message) {
                            log({
                                message,
                                type: 'info',
                            });
                        }
                    },
                }),
            );
        };

        logOutput(this.caddyProcess.stdout);
        logOutput(this.caddyProcess.stderr);
    }

    public async stop(): Promise<void> {
        if (this.caddyProcess) {
            this.caddyProcess.kill('SIGTERM');
            this.caddyProcess = null;
            log({
                message: 'Caddy server stopped',
                type: 'info',
            });
        }
    }

    public isRunning(): boolean {
        return this.caddyProcess !== null;
    }
}
