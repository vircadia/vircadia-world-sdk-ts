import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as execa from 'execa';

const SUPABASE_DIR = path.resolve('./modules/supabase');
const APP_PATH = path.resolve(SUPABASE_DIR, 'app');

export class SupabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseError';
    }
}

class Supabase {
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private supabaseServiceRoleKey: string;
    private projectDir: string;
    private configDir: string;

    constructor() {
        this.projectDir = APP_PATH;
        this.configDir = path.resolve(SUPABASE_DIR, 'config');
        this.supabaseUrl = '';
        this.supabaseAnonKey = '';
        this.supabaseServiceRoleKey = '';
    }
    
    private loadEnvironmentVariables(): void {
        const envPath = path.join(this.configDir, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        } else {
            console.warn(`Warning: .env file not found at ${envPath}`);
        }
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }

    private async updateConfigAndWriteEnv(): Promise<void> {
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
        await this.startSupabaseWithRetry();
    
        await this.updateConfigAndWriteEnv();
    
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new SupabaseError('Supabase environment variables are not set correctly after initialization');
        }

        console.log('Supabase initialization and startup complete.');
    }

    private async startSupabaseWithRetry(retries = 3): Promise<void> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.runCommand('supabase start');
                console.log('Supabase services started successfully.');
                return;
            } catch (error) {
                console.error(`Attempt ${attempt} to start Supabase failed:`, error);
                if (attempt < retries) {
                    console.log('Attempting to stop and restart Supabase...');
                    await this.runCommand('supabase stop').catch(() => {});
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
                } else {
                    throw new SupabaseError('Failed to start Supabase services after multiple attempts');
                }
            }
        }
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
            console.error('Error checking Supabase status', error);
            return false;
        }
    }

    async resyncConfiguration(): Promise<void> {
        console.log('Resyncing Supabase configuration...');
        await this.stop();
        await this.initializeAndStart();
        console.log('Supabase configuration resynced successfully.');
    }

    private async runCommand(command: string): Promise<string> {
        try {
            const { stdout } = await execa.execaCommand(command, { cwd: this.projectDir, shell: true });
            return stdout.trim();
        } catch (error) {
            console.error(`Error executing command: ${command}`, error);
            throw new SupabaseError(`Command failed: ${command}`);
        }
    }

    // Getter methods for Supabase credentials
    getSupabaseUrl(): string {
        return this.supabaseUrl;
    }

    getSupabaseAnonKey(): string {
        return this.supabaseAnonKey;
    }

    getSupabaseServiceRoleKey(): string {
        return this.supabaseServiceRoleKey;
    }
}

export default Supabase;