import { log } from '../../../client/deno/modules/vircadia-world-meta/general/modules/log.ts';

interface ProxyConfig {
  from: string;
  to: string;
}

export class CaddyManager {
  private static instance: CaddyManager;
  private caddyProcess: Deno.ChildProcess | null = null;
  private caddyfilePath = 'Caddyfile';

  private constructor() {}

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
  log {
    output file /var/log/caddy/access.log
    format json
  }
}
`;
    }

    await Deno.writeTextFile(this.caddyfilePath, caddyfileContent);
    log({
      message: 'Caddyfile created',
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
    this.caddyProcess.stdout.pipeTo(
      new WritableStream({
        write(chunk) {
          console.log(new TextDecoder().decode(chunk));
        },
      }),
    );
    this.caddyProcess.stderr.pipeTo(
      new WritableStream({
        write(chunk) {
          console.error(new TextDecoder().decode(chunk));
        },
      }),
    );
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
