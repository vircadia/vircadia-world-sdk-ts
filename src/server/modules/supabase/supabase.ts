import * as fs from 'fs';
import * as path from 'path';
import * as toml from 'toml';
import * as dotenv from 'dotenv';
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
    private siteUrl: string;
    private projectDir: string;
    private configDir: string;
    private debug: boolean;

    constructor(debug: boolean = false) {
        this.projectDir = path.resolve('./modules/supabase/app');
        this.configDir = path.join(this.projectDir, 'supabase');
        this.supabaseUrl = '';
        this.supabaseAnonKey = '';
        this.supabaseServiceRoleKey = '';
        this.siteUrl = '';
        this.debug = debug;
        this.loadConfig();
    }
    
    private async loadConfig(): Promise<void> {
        // Load config.toml
        const configPath = path.join(this.configDir, 'config.toml');
        if (fs.existsSync(configPath)) {
            const config = toml.parse(fs.readFileSync(configPath, 'utf-8'));
            this.siteUrl = config.auth.site_url;
            // Use other config values as needed
        } else {
            console.warn('Config file not found. Some Supabase configurations may be missing.');
        }

        // Load or create .env file
        const envPath = path.join(this.projectDir, '.env');
        if (!fs.existsSync(envPath)) {
            console.log('.env file not found. Creating and syncing with Supabase...');
            await this.createAndSyncEnv();
        } else {
            dotenv.config({ path: envPath });
            this.supabaseUrl = process.env.SUPABASE_URL || '';
            this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
            this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

            // If any of the required variables are missing, re-sync with Supabase
            if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
                console.log('Some Supabase environment variables are missing. Re-syncing with Supabase...');
                await this.createAndSyncEnv();
            }
        }

        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new SupabaseError('Failed to load Supabase configuration');
        }
    }

    private async createAndSyncEnv(): Promise<void> {
        try {
            const output = await this.runCommand('supabase status --output json');
            
            // Extract JSON part from the output
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to extract JSON from Supabase status output');
            }
            
            const status = JSON.parse(jsonMatch[0]);
    
            let envContent: string = '';
            if (status && status.API_URL && status.ANON_KEY && status.SERVICE_ROLE_KEY) {
                envContent = `
    SUPABASE_URL=${status.API_URL}
    SUPABASE_ANON_KEY=${status.ANON_KEY}
    SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}
                `.trim();
            } else {
                throw new Error('Failed to get required Supabase status information');
            }
    
            fs.writeFileSync(path.join(this.projectDir, '.env'), envContent);
            console.log('.env file created and synced with Supabase.');
    
            // Reload environment variables
            dotenv.config({ path: path.join(this.projectDir, '.env') });
            this.supabaseUrl = process.env.SUPABASE_URL || '';
            this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
            this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        } catch (error) {
            console.error('Failed to create and sync .env file:', error);
            throw new SupabaseError('Failed to create and sync .env file');
        }
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
        } catch (error) {
            console.error(`Attempt to start Supabase failed:`, error);
            console.log('Attempting to stop and restart Supabase...');
            await this.runCommand('supabase stop').catch(() => {}).then(async () => {
                console.log('Supabase stopped.');
                await this.runCommand('supabase start');
                console.log('Supabase services started successfully.');
            });
        }
    
        // Re-sync .env after starting Supabase
        await this.loadConfig();

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

    getSiteUrl(): string {
        return this.siteUrl;
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