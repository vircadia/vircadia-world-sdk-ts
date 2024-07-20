import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

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
        if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceRoleKey) {
            throw new Error('Supabase environment variables are not set correctly');
        }
    }
    async start(): Promise<void> {
        console.log('Starting Supabase services...');
        await this.runCommand('docker compose up -d');
        this.startPeriodicCheck();
    }
    async stop(): Promise<void> {
        console.log('Stopping Supabase services...');
        await this.runCommand('docker compose down');
    }
    async restart(): Promise<void> {
        console.log('Restarting Supabase services...');
        await this.runCommand('docker compose down');
        await this.runCommand('docker compose up -d');
    }
    async checkStatus(): Promise<void> {
        const output = await this.runCommand('docker compose ps --format json');
        const services = JSON.parse(output);
        const failedServices = services.filter((service: any) => service.State !== 'running');
        if (failedServices.length > 0) {
            console.error('The following services have failed:');
            failedServices.forEach((service: any) => {
                console.error(`${ service.Service }: ${ service.State }`);
            });
            // You could implement additional error handling or notifications here
        } else {
            console.log('All Supabase services are running.');
        }
    }
    async resyncConfiguration(): Promise<void> {
        console.log('Resyncing Supabase configuration...');
        await this.runCommand('npm run resync-supabase');
        this.loadEnvironmentVariables(); // Reload environment variables after resync
        console.log('Supabase configuration resynced successfully.');
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