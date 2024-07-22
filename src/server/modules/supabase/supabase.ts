import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as execa from 'execa';

export class SupabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseError';
    }
}

export class Supabase {
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private supabaseServiceRoleKey: string;
    private projectDir: string;
    private configDir: string;
    private debug: boolean;

    constructor(debug: boolean = false) {
        this.projectDir = path.resolve('./modules/supabase/app');
        this.configDir = path.resolve('./modules/supabase/config');
        this.supabaseUrl = '';
        this.supabaseAnonKey = '';
        this.supabaseServiceRoleKey = '';
        this.debug = debug;
    }
    
    private loadEnvironmentVariables(): void {
        const envPath = path.join(this.configDir, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            this.supabaseUrl = process.env.SUPABASE_URL || '';
            this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
            this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        } else {
            console.warn('Environment file not found. Supabase credentials not loaded.');
        }
    }

    private async updateConfigAndWriteEnv(): Promise<void> {
        console.log('Fetching Supabase configuration...');
        const config = await this.runCommand('supabase status');
        const envContent = `SUPABASE_URL=${config.match(/API URL:\s*(\S+)/)?.[1] || ''}\nSUPABASE_ANON_KEY=${config.match(/anon key:\s*(\S+)/)?.[1] || ''}\nSUPABASE_SERVICE_ROLE_KEY=${config.match(/service_role key:\s*(\S+)/)?.[1] || ''}\n`;
        fs.writeFileSync(path.join(this.configDir, '.env'), envContent);
        console.info('Credentials have been saved to .env file.');
        this.loadEnvironmentVariables();
    }

    async initializeAndStart(): Promise<void> {
        console.log('Initializing and starting Supabase...');
    
        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            throw new SupabaseError('Supabase CLI is not installed. Please install it first.');
        }
    
        const configPath = path.join(this.projectDir, 'supabase', 'config.toml');
        if (!fs.existsSync(configPath)) {
            console.log('Supabase project not initialized. Initializing now...');
            await this.runCommand('supabase init');
            console.log('Supabase project initialized.');
        } else {
            console.log('Supabase project already initialized.');
        }
    
        console.log('Starting Supabase services...');
        try {
            await this.runCommand('supabase start');
            console.log('Supabase services started successfully.');
            return;
        } catch (error) {
            console.error(`Attempt to start Supabase failed:`, error);
            console.log('Attempting to stop and restart Supabase...');
            await this.runCommand('supabase stop').catch(() => {}).then(async () => {
                console.log('Supabase stopped.');
                await this.runCommand('supabase start');
                console.log('Supabase services started successfully.');
            });
        }
    
        await this.updateConfigAndWriteEnv();
    
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new SupabaseError('Supabase environment variables are not set correctly after initialization');
        }

        console.log('Supabase initialization and startup complete.');
    }

    async stop(): Promise<void> {
        console.log('Stopping Supabase services...');
        await this.runCommand('supabase stop');
    }

    async restart(): Promise<void> {
        await this.stop();
        await this.initializeAndStart();
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
                cwd: this.projectDir, 
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

    getSupabaseUrl(): string {
        return this.supabaseUrl;
    }

    getSupabaseAnonKey(): string {
        return this.supabaseAnonKey;
    }

    getSupabaseServiceRoleKey(): string {
        return this.supabaseServiceRoleKey;
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