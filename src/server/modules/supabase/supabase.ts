import * as fs from 'fs';
import * as path from 'path';
import * as execa from 'execa';

export class SupabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseError';
    }
}

const CONFIG_TOML_FILE = 'config.toml';

export class Supabase {
    private appDir: string;
    private configDir: string;
    private debug: boolean;

    constructor(debug: boolean = false) {
        this.appDir = path.resolve('./modules/supabase/app');
        this.configDir = path.join(this.appDir, 'supabase');
        this.debug = debug;

        this.loadConfig();
    }
    
    private loadConfig(): void {
    }

    async initializeAndStart(data: {
        forceRestart: boolean
    }): Promise<void> {
        console.log('Initializing and starting Supabase...');
    
        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            throw new SupabaseError('Supabase CLI is not installed. Please install it first.');
        }
    
        const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
        if (!fs.existsSync(configPath)) {
            console.log('Supabase project not initialized. Initializing now...');
            await this.runCommand('supabase init');
            console.log('Supabase project initialized.');
        } else {
            console.log('Supabase project already initialized.');
        }
    
        console.log('Starting Supabase services...');

        if (!await this.isRunning()) {
            data.forceRestart = true;
        }

        try {
            if (data.forceRestart) {
                await this.runCommand('supabase stop').catch(() => {
                    if (data.forceRestart) {
                        throw new SupabaseError('Failed to stop Supabase services during restart.');
                    }
                }).then(async () => {
                    console.log('Supabase stopped.');
                    await this.runCommand('supabase start');
                    console.log('Supabase services started successfully.');
                });
            } else {
                await this.runCommand('supabase start');
                console.log('Supabase services started successfully.');
            }
        } catch (error) {
            console.error(`Attempt to start Supabase failed:`, error);
            console.log('Attempting to stop and restart Supabase...');
            await this.runCommand('supabase stop').catch(() => {
                if (data.forceRestart) {
                    throw new SupabaseError('Failed to stop Supabase services during restart.');
                }
            }).then(async () => {
                console.log('Supabase stopped.');
                await this.runCommand('supabase start');
                console.log('Supabase services started successfully.');
            });
        }
    
        console.log('Supabase initialization and startup complete.');
    }

    async stop(): Promise<void> {
        console.log('Stopping Supabase services...');
        await this.runCommand('supabase stop');
    }

    async isRunning(): Promise<boolean> {
        try {
            const output = await this.runCommand('supabase status');
            return !output.includes('not running') && !output.includes('exited');
        } catch (error) {
            return false;
        }
    }

    private async runCommand(command: string): Promise<string> {
        try {
            const { stdout } = await execa.execaCommand(command, { 
                cwd: this.appDir, 
                shell: true,
                env: { ...process.env, SUPABASE_DEBUG: this.debug ? '1' : '0' }
            });
            return stdout.trim();
        } catch (error) {
            console.error(`Error executing command: ${command}`, error);
            if (this.debug) {
                console.error('Full error details:', JSON.stringify(error, null, 2));
            }
            throw new SupabaseError(`Command failed: ${command}`);
        }
    }

    async debugSupabaseStatus(): Promise<void> {
        console.log('Running Supabase debug commands...');
        try {
            const status = await this.runCommand('supabase status --debug');
            console.log('Supabase Status (Debug):', status);

            const dockerPs = await this.runCommand('docker ps -a');
            console.log('Docker Containers:', dockerPs);

            const dockerLogs = await this.runCommand('docker logs supabase_db_app');
            console.log('Supabase DB App Logs:', dockerLogs);

            const dockerInspect = await this.runCommand('docker inspect supabase_db_app');
            console.log('Supabase DB App Inspect:', dockerInspect);
        } catch (error) {
            console.error('Error running debug commands:', error);
        }
    }
}