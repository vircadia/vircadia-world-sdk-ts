import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as execa from 'execa';

const CONFIG_PATH = path.resolve('./modules/supabase/config');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class Supabase {
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private supabaseServiceRoleKey: string;

    constructor() {
        this.loadEnvironmentVariables();
    }
    
    private loadEnvironmentVariables(): void {
        dotenv.config({ path: path.join(CONFIG_PATH, '.env') });
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }

    async setup(): Promise<void> {
        console.log('Setting up Supabase...');
    
        // Check if Supabase CLI is installed
        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            console.error('Supabase CLI is not installed. Please install the project first with npm or variants');
            throw error;
        }
    
        // Initialize Supabase project if it doesn't exist
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log('Initializing Supabase project...');
            await this.runCommand('supabase init', process.cwd());
        } else {
            console.log('Supabase project already initialized. Skipping init step.');
        }

        // Start Supabase services
        console.log('Starting Supabase services...');
        await this.runCommand('supabase start');
    
        // Get Supabase credentials
        const config = await this.runCommand('supabase status');
        const url = config.match(/API URL:\s*(\S+)/)?.[1] || '';
        const anonKey = config.match(/anon key:\s*(\S+)/)?.[1] || '';
        const serviceRoleKey = config.match(/service_role key:\s*(\S+)/)?.[1] || '';
    
        // Update .env file with new credentials
        const envContent = `SUPABASE_URL=${url}\nSUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`;
        fs.writeFileSync(path.join(CONFIG_PATH, '.env'), envContent);
    
        console.log('Supabase setup complete. Credentials have been saved to .env file.');
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

    async status(): Promise<{ status: 'running' | 'failed' | 'not_configured', failedServices?: string[] }> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            return { status: 'not_configured' };
        }

        try {
            const output = await this.runCommand('supabase status');
            if (output.includes('All services are running')) {
                console.log('All Supabase services are running.');
                return { status: 'running' };
            } else {
                const failedServices = output.split('\n')
                    .filter(line => line.includes('not running'))
                    .map(line => line.trim());
                console.error('The following services have failed:', failedServices);
                return { status: 'failed', failedServices };
            }
        } catch (error) {
            console.error('Error checking Supabase status:', error);
            return { status: 'not_configured' };
        }
    }

    async resyncConfiguration(): Promise<void> {
        console.log('Resyncing Supabase configuration...');

        // Stop and restart Supabase to apply any configuration changes
        await this.stop();
        await this.start();

        // Get the new credentials
        const config = await this.runCommand('supabase status');
        const newUrl = config.match(/API URL:\s*(\S+)/)?.[1] || '';
        const newAnonKey = config.match(/anon key:\s*(\S+)/)?.[1] || '';
        const newServiceRoleKey = config.match(/service_role key:\s*(\S+)/)?.[1] || '';

        // Update .env file with new credentials
        const envContent = `SUPABASE_URL=${newUrl}\nSUPABASE_ANON_KEY=${newAnonKey}\nSUPABASE_SERVICE_ROLE_KEY=${newServiceRoleKey}`;
        fs.writeFileSync(path.join(CONFIG_PATH, '.env'), envContent);

        this.loadEnvironmentVariables(); // Reload environment variables after resync
        console.log('Supabase configuration resynced successfully. New credentials have been saved to .env file.');
    }

    private startPeriodicCheck(): void {
        setInterval(() => this.status(), CHECK_INTERVAL);
    }

    private async runCommand(command: string, cwd?: string): Promise<string> {
        try {
            const { stdout } = await execa.execaCommand(command, { cwd: cwd ?? CONFIG_PATH, shell: true });
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