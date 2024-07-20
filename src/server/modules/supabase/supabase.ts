import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

const SUPABASE_PATH = path.resolve('./supabase-core');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class Supabase {
    private supabaseUrl: string;
    private supabaseAnonKey: string;
    private supabaseServiceRoleKey: string;

    constructor() {
        this.loadEnvironmentVariables();
    }
    
    private loadEnvironmentVariables(): void {
        dotenv.config({ path: path.join(SUPABASE_PATH, '.env') });
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
        this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }

    async setupSupabase(): Promise<void> {
        console.log('Setting up Supabase...');
    
        // Check if Git is installed
        try {
            await this.runCommand('git --version');
        } catch (error) {
            console.error('Git is not installed. Please install Git and try again.');
            throw error;
        }

        // Check if Docker Compose is installed
        try {
            await this.runCommand('docker compose --version');
        } catch (error) {
            console.error('Docker Compose is not installed. Please install Docker Compose and try again.');
            throw error;
        }
    
        // Clone Supabase repository with sparse checkout into the existing supabase-core directory
        await this.runCommand('git init');
        await this.runCommand('git remote add origin https://github.com/supabase/supabase');
        await this.runCommand('git config core.sparseCheckout true');
        await this.runCommand('echo "docker" >> .git/info/sparse-checkout');
        await this.runCommand('git pull --depth=1 origin master');
    
        // Go to the docker folder
        process.chdir(path.join(SUPABASE_PATH, 'docker'));
    
        // Copy the example env file
        await this.runCommand('cp .env.example .env');
    
        // Pull the latest images
        await this.runCommand('docker compose pull');
    
        // Start the services in detached mode
        await this.runCommand('docker compose up -d');
    
        // Check status
        const status = await this.runCommand('docker compose ps');
        console.log('Supabase services status:', status);
    
        // Generate .env file with secrets
        const config = await this.runCommand('docker compose config');
        const url = config.match(/SUPABASE_PUBLIC_URL:\s*(\S+)/)?.[1] || 'http://localhost:8000';
        const anonKey = config.match(/ANON_KEY:\s*(\S+)/)?.[1] || '';
        const serviceRoleKey = config.match(/SERVICE_ROLE_KEY:\s*(\S+)/)?.[1] || '';
        const envContent = `SUPABASE_URL=${url}\nSUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`;
        fs.writeFileSync(path.join(SUPABASE_PATH, '.env'), envContent);
    
        console.log('Supabase setup complete. Secrets have been saved to .env file.');
        this.loadEnvironmentVariables(); // Reload environment variables after setup
    
        // Return to the original directory
        process.chdir(SUPABASE_PATH);
    }

    async start(): Promise<void> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }

        console.log('Starting Supabase services...');
        await this.runCommand('docker compose up -d');
        this.startPeriodicCheck();
    }

    async stop(): Promise<void> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }

        console.log('Stopping Supabase services...');
        await this.runCommand('docker compose down');
    }

    async restart(): Promise<void> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }

        console.log('Restarting Supabase services...');
        await this.runCommand('docker compose down');
        await this.runCommand('docker compose up -d');
    }

    async checkStatus(): Promise<{ status: 'running' | 'failed' | 'not_configured', failedServices?: string[] }> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            return { status: 'not_configured' };
        }

        try {
            const output = await this.runCommand('docker compose ps --format json');
            const services = JSON.parse(output);
            const failedServices = services.filter((service: any) => service.State !== 'running');
            
            if (failedServices.length > 0) {
                console.error('The following services have failed:');
                failedServices.forEach((service: any) => {
                    console.error(`${service.Service}: ${service.State}`);
                });
                return {
                    status: 'failed',
                    failedServices: failedServices.map((service: any) => `${service.Service}: ${service.State}`)
                };
            } else {
                console.log('All Supabase services are running.');
                return { status: 'running' };
            }
        } catch (error) {
            console.error('Error checking Supabase status:', error);
            return { status: 'not_configured' };
        }
    }

    async resyncConfiguration(): Promise<void> {
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }

        console.log('Resyncing Supabase configuration...');

        // Check if Supabase CLI is installed
        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            console.error('Supabase CLI not found. Please run setupSupabase first.');
            return;
        }

        // Generate new secrets
        const newAnonKey = this.generateRandomString();
        const newServiceRoleKey = this.generateRandomString();

        // Update Supabase configuration
        await this.runCommand(`supabase secrets set ANON_KEY=${newAnonKey}`);
        await this.runCommand(`supabase secrets set SERVICE_ROLE_KEY=${newServiceRoleKey}`);

        // Restart Supabase to apply new configuration
        await this.runCommand('supabase stop');
        await this.runCommand('supabase start');

        // Get the new URL
        const status = await this.runCommand('supabase status');
        const newUrl = status.match(/URL:\s+(\S+)/)?.[1] || '';

        // Update .env file with new secrets
        const envContent = `SUPABASE_URL=${newUrl}\nSUPABASE_ANON_KEY=${newAnonKey}\nSUPABASE_SERVICE_ROLE_KEY=${newServiceRoleKey}`;
        fs.writeFileSync(path.join(SUPABASE_PATH, '.env'), envContent);

        this.loadEnvironmentVariables(); // Reload environment variables after resync
        console.log('Supabase configuration resynced successfully. New secrets have been saved to .env file.');
    }

    private startPeriodicCheck(): void {
        setInterval(() => this.checkStatus(), CHECK_INTERVAL);
    }

    private async runCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, { cwd: SUPABASE_PATH }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    private generateRandomString(): string {
        return crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 32);
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