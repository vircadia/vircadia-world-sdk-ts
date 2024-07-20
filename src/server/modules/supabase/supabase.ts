import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_PATH = path.resolve('./supabase-core');
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class Supabase {
    constructor() {
        // Constructor is now empty
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
                console.error(`- ${service.Service}: ${service.State}`);
            });
            // You could implement additional error handling or notifications here
        } else {
            console.log('All Supabase services are running.');
        }
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
}

export default Supabase;