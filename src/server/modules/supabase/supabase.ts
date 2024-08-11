import * as fs from 'fs';
import * as path from 'path';
import * as execa from 'execa';
import express from 'express';
import { log } from '../../../modules/log.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { E_HTTPRoutes } from '../../../routes/meta.js';

const CONFIG_TOML_FILE = 'config.toml';

export class SupabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupabaseError';
    }
}

export class Supabase {
    private static instance: Supabase | null = null;

    private appDir: string;
    private configDir: string;
    private debug: boolean;
    private routes: {
        [key in E_HTTPRoutes]: string | null;
    } = {
        [E_HTTPRoutes.API]: null,
        [E_HTTPRoutes.GRAPHQL]: null,
        [E_HTTPRoutes.STORAGE]: null,
        [E_HTTPRoutes.DB]: null,
        [E_HTTPRoutes.STUDIO]: null,
        [E_HTTPRoutes.INBUCKET]: null,
    };

    constructor(debug: boolean = false) {
        this.appDir = path.resolve('./modules/supabase/app');
        this.configDir = path.join(this.appDir, 'supabase');
        this.debug = debug;

        this.loadConfig();
    }

    public static getInstance(debug: boolean = false): Supabase {
        if (!Supabase.instance) {
            Supabase.instance = new Supabase(debug);
        }
        return Supabase.instance;
    }

    private loadConfig(): void {}

    async setupReverseProxies(app: express.Application): Promise<void> {
        const statusUrls = await this.getStatus();

        const setupProxy = (path: E_HTTPRoutes, target: string | null) => {
            if (target) {
                app.use(
                    path,
                    createProxyMiddleware({
                        target,
                        changeOrigin: true,
                        pathRewrite: { [`^${path}`]: '' },
                    }),
                );
                this.routes[path as E_HTTPRoutes] = target;
                log(`Reverse proxy set up for ${path} -> ${target}`, 'success');
            }
        };

        setupProxy(E_HTTPRoutes.API, statusUrls.apiUrl);
        setupProxy(E_HTTPRoutes.GRAPHQL, statusUrls.graphqlUrl);
        setupProxy(E_HTTPRoutes.STORAGE, statusUrls.s3StorageUrl);
        setupProxy(E_HTTPRoutes.STUDIO, statusUrls.studioUrl);
        setupProxy(E_HTTPRoutes.INBUCKET, statusUrls.inbucketUrl);
        setupProxy(E_HTTPRoutes.DB, statusUrls.dbUrl);
    }

    async initializeAndStart(data: { forceRestart: boolean }): Promise<void> {
        log('Initializing and starting Supabase...', 'info');

        try {
            await this.checkSupabaseCLI();
            await this.initializeProjectIfNeeded();
            await this.startSupabase(data.forceRestart);
        } catch (error) {
            log(
                `Failed to initialize and start Supabase: ${error.message}`,
                'error',
            );
            throw error;
        }

        log('Supabase initialization and startup complete.', 'success');
    }

    private async checkSupabaseCLI(): Promise<void> {
        try {
            const { stdout } = await execa.execaCommand(
                'npx supabase --version',
                {
                    cwd: this.appDir,
                },
            );
            log(`Supabase CLI version: ${stdout.trim()}`, 'success');
        } catch (error) {
            throw new SupabaseError(
                'Supabase CLI is not installed. Please install it first.',
            );
        }
    }

    private async initializeProjectIfNeeded(): Promise<void> {
        const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
        if (!fs.existsSync(configPath)) {
            log(
                'Supabase project not initialized. Initializing now...',
                'info',
            );
            await this.runSupabaseCommand({
                command: 'init',
                appendWorkdir: true,
            });
            log('Supabase project initialized.', 'success');
        } else {
            log('Supabase project already initialized.', 'success');
        }
    }

    private async startSupabase(forceRestart: boolean): Promise<void> {
        if (forceRestart) {
            log('Stopping Supabase services for a forced restart...', 'info');
            await this.stopSupabase();
        } else if (await this.isStarting()) {
            log(
                'Supabase is already starting up. Waiting for it to complete...',
                'info',
            );
            await this.waitForStartup();
            return;
        } else if (!(await this.isRunning())) {
            log('Supabase services are not running. Starting them...', 'info');
            await this.stopSupabase();
        }

        try {
            log('Starting Supabase services...', 'info');
            await this.runSupabaseCommand({
                command: 'start',
                appendWorkdir: true,
            });
            log('Supabase services started successfully.', 'success');
        } catch (error) {
            log(`Failed to start Supabase: ${error.message}`, 'error');
            throw error;
        }
    }

    private async stopSupabase(): Promise<void> {
        log('Stopping Supabase services...', 'info');
        try {
            await this.runSupabaseCommand({
                command: 'stop',
                appendWorkdir: true,
            });
            log('Supabase services stopped.', 'success');
        } catch (error) {
            log(`Failed to stop Supabase: ${error.message}`, 'warning');
        }
    }

    async isRunning(): Promise<boolean> {
        const NOT_RUNNING = 'not running';
        const EXITED = 'exited';
        const FAILED_TO_INSPECT = 'failed to inspect container health';
        const NO_SUCH_CONTAINER = 'No such container: supabase_db_app';

        try {
            const output = await this.runSupabaseCommand({
                command: 'status',
                appendWorkdir: true,
            });
            return (
                !output.includes(NOT_RUNNING) &&
                !output.includes(EXITED) &&
                !output.includes(FAILED_TO_INSPECT) &&
                !output.includes(NO_SUCH_CONTAINER)
            );
        } catch (error) {
            return false;
        }
    }

    private async isStarting(): Promise<boolean> {
        try {
            const { stdout } = await execa.execaCommand(
                'docker ps --format {{.Names}}',
                {
                    cwd: this.appDir,
                },
            );
            return (
                stdout.includes('supabase_db_app') && !(await this.isRunning())
            );
        } catch (error) {
            return false;
        }
    }

    private async waitForStartup(timeout: number = 300000): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await this.isRunning()) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        throw new Error('Timeout waiting for Supabase to start');
    }

    private async runSupabaseCommand(data: {
        command: string;
        appendWorkdir: boolean;
    }): Promise<string> {
        const fullCommand = `npx supabase ${data.command}${
            data.appendWorkdir ? ` --workdir ${this.appDir}` : ''
        }`;

        try {
            const { stdout, stderr } = await execa.execaCommand(fullCommand, {
                cwd: this.appDir,
                shell: true,
                env: { ...process.env, SUPABASE_DEBUG: this.debug ? '1' : '0' },
            });
            return stdout.trim();
        } catch (error) {
            log(`Error executing command: ${fullCommand}`, 'error');
            if (this.debug) {
                log(
                    `Full error details: ${JSON.stringify(error, null, 2)}`,
                    'error',
                );
            }
            throw new SupabaseError(`Command failed: ${fullCommand}`);
        }
    }

    async debugStatus(): Promise<void> {
        log('Running Supabase debug commands...', 'info');
        try {
            const status = await this.runSupabaseCommand({
                command: 'status --debug',
                appendWorkdir: true,
            });
            log(`Supabase Status (Debug): ${status}`, 'info');

            const dockerPs = await execa.execaCommand('docker ps -a', {
                cwd: this.appDir,
            });
            log(`Docker Containers: ${dockerPs}`, 'info');

            const dockerLogs = await execa.execaCommand(
                'docker logs supabase_db_app',
                {
                    cwd: this.appDir,
                },
            );
            log(`Supabase DB App Logs: ${dockerLogs}`, 'info');

            const dockerInspect = await execa.execaCommand(
                'docker inspect supabase_db_app',
                {
                    cwd: this.appDir,
                },
            );
            log(`Supabase DB App Inspect: ${dockerInspect}`, 'info');
        } catch (error) {
            log(`Error running debug commands: ${error}`, 'error');
        }
    }

    async getStatus(): Promise<{
        apiUrl: string | null;
        graphqlUrl: string | null;
        s3StorageUrl: string | null;
        dbUrl: string | null;
        studioUrl: string | null;
        inbucketUrl: string | null;
        jwtSecret: string | null;
        anonKey: string | null;
        serviceRoleKey: string | null;
        s3AccessKey: string | null;
        s3SecretKey: string | null;
        s3Region: string | null;
    }> {
        const API_URL = 'API URL';
        const GRAPHQL_URL = 'GraphQL URL';
        const S3_STORAGE_URL = 'S3 Storage URL';
        const DB_URL = 'DB URL';
        const STUDIO_URL = 'Studio URL';
        const INBUCKET_URL = 'Inbucket URL';
        const JWT_SECRET = 'JWT secret';
        const ANON_KEY = 'anon key';
        const SERVICE_ROLE_KEY = 'service_role key';
        const S3_ACCESS_KEY = 'S3 Access Key';
        const S3_SECRET_KEY = 'S3 Secret Key';
        const S3_REGION = 'S3 Region';

        const output = await this.runSupabaseCommand({
            command: 'status',
            appendWorkdir: true,
        });

        const parseValue = (key: string): string | null => {
            const regex = new RegExp(`${key}:\\s*(.+)`);
            const match = output.match(regex);
            return match ? match[1].trim() : null;
        };

        return {
            apiUrl: parseValue(API_URL),
            graphqlUrl: parseValue(GRAPHQL_URL),
            s3StorageUrl: parseValue(S3_STORAGE_URL),
            dbUrl: parseValue(DB_URL),
            studioUrl: parseValue(STUDIO_URL),
            inbucketUrl: parseValue(INBUCKET_URL),
            jwtSecret: parseValue(JWT_SECRET),
            anonKey: parseValue(ANON_KEY),
            serviceRoleKey: parseValue(SERVICE_ROLE_KEY),
            s3AccessKey: parseValue(S3_ACCESS_KEY),
            s3SecretKey: parseValue(S3_SECRET_KEY),
            s3Region: parseValue(S3_REGION),
        };
    }

    async getRoutes(): Promise<{ [key in E_HTTPRoutes]: string | null }> {
        return this.routes;
    }
}

export default Supabase.getInstance();
