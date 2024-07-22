import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as execa from 'execa';

const SUPABASE_DIR = path.resolve('./modules/supabase');
const APP_PATH = path.resolve(SUPABASE_DIR, 'app');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class Supabase {
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private supabaseServiceRoleKey: string;
    private projectDir: string;
    private configDir: string;

    constructor() {
        this.projectDir = APP_PATH;
        this.configDir = path.resolve(SUPABASE_DIR, 'config');
        this.loadEnvironmentVariables();
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
    }

    async setup(): Promise<void> {
        console.log('Setting up Supabase...');
    
        // Check if Supabase CLI is installed
        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            console.error('Supabase CLI is not installed. Please install it first.');
            throw error;
        }
    
        // Check if Supabase project already exists
        const configPath = path.join(this.projectDir, 'supabase', 'config.toml');
        if (fs.existsSync(configPath)) {
            console.log('Supabase project already initialized. Skipping init step.');
        } else {
            console.log('Initializing Supabase project...');
            await this.runCommand('supabase init');
        }
    
        // Start Supabase services
        console.log('Starting Supabase services...');
        await this.runCommand('supabase start');
    
        // Update config
        await this.updateConfigAndWriteEnv();
    
        console.log('Supabase setup complete.');
        this.loadEnvironmentVariables(); // Reload environment variables after setup
    }

    async start(): Promise<void> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }

        console.log('Starting Supabase services...');
        await this.runCommand('supabase start');
        this.startPeriodicCheck();
    }

    async stop(): Promise<void> {
        console.log('Stopping Supabase services...');
        await this.runCommand('supabase stop');
    }

    async restart(): Promise<void> {
        console.log('Restarting Supabase services...');
        await this.stop();
        await this.start();
    }

    async status(): Promise<{ status: 'running' | 'failed' | 'not_setup', failedServices?: string[] }> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            return { status: 'not_setup' };
        }

        try {
            const output = await this.runCommand('supabase status');

            if (output.includes('not running') || output.includes('exited')) {
                console.error('Supabase services are not running.');
                return { status: 'failed' };
            } else {
                console.log('All Supabase services are running.');
                return { status: 'running' };
            }
        } catch (error) {
            console.error('Error checking status', error);
            return { status: 'not_setup' };
        }
    }

    async resyncConfiguration(): Promise<void> {
        console.log('Resyncing Supabase configuration...');

        // Stop and restart Supabase to apply any configuration changes
        await this.stop();
        await this.start();

        // Get the new credentials
        await this.updateConfigAndWriteEnv();

        this.loadEnvironmentVariables(); // Reload environment variables after resync
        console.log('Supabase configuration resynced successfully. New credentials have been saved to .env file.');
    }

    private startPeriodicCheck(): void {
        setInterval(() => this.status(), CHECK_INTERVAL);
    }

    private async runCommand(command: string): Promise<string> {
        try {
            const { stdout } = await execa.execaCommand(command, { cwd: this.projectDir, shell: true });
            return stdout.trim();
        } catch (error) {
            console.error(`Error executing command: ${command}`, error);
            throw error;
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