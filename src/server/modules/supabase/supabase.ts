import * as fs from 'fs';
import * as path from 'path';
import * as execa from 'execa';

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

    async initializeAndStart(data: { forceRestart: boolean }): Promise<void> {
        console.log('Initializing and starting Supabase...');

        try {
            await this.runCommand('supabase --version');
        } catch (error) {
            throw new SupabaseError(
                'Supabase CLI is not installed. Please install it first.',
            );
        }

        const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
        if (!fs.existsSync(configPath)) {
            console.log(
                'Supabase project not initialized. Initializing now...',
            );
            await this.runCommand('supabase init');
            console.log('Supabase project initialized.');
        } else {
            console.log('Supabase project already initialized.');
        }

        console.log('Starting Supabase services...');

        if (!(await this.isRunning())) {
            data.forceRestart = true;
        }

        try {
            if (data.forceRestart) {
                await this.runCommand('supabase stop')
                    .catch(() => {
                        if (data.forceRestart) {
                            throw new SupabaseError(
                                'Failed to stop Supabase services during restart.',
                            );
                        }
                    })
                    .then(async () => {
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
            await this.runCommand('supabase stop')
                .catch(() => {
                    if (data.forceRestart) {
                        throw new SupabaseError(
                            'Failed to stop Supabase services during restart.',
                        );
                    }
                })
                .then(async () => {
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
            return (
                !output.includes('not running') &&
                !output.includes('exited') &&
                !output.includes('failed to inspect container health') &&
                !output.includes('No such container: supabase_db_app')
            );
        } catch (error) {
            return false;
        }
    }

    private async runCommand(command: string): Promise<string> {
        try {
            command = command += ' --workdir ' + this.appDir;

            const { stdout } = await execa.execaCommand(command, {
                cwd: this.appDir,
                shell: true,
                env: { ...process.env, SUPABASE_DEBUG: this.debug ? '1' : '0' },
            });
            return stdout.trim();
        } catch (error) {
            console.error(`Error executing command: ${command}`, error);
            if (this.debug) {
                console.error(
                    'Full error details:',
                    JSON.stringify(error, null, 2),
                );
            }
            throw new SupabaseError(`Command failed: ${command}`);
        }
    }

    async debugStatus(): Promise<void> {
        console.log('Running Supabase debug commands...');
        try {
            const status = await this.runCommand('supabase status --debug');
            console.log('Supabase Status (Debug):', status);

            const dockerPs = await this.runCommand('docker ps -a');
            console.log('Docker Containers:', dockerPs);

            const dockerLogs = await this.runCommand(
                'docker logs supabase_db_app',
            );
            console.log('Supabase DB App Logs:', dockerLogs);

            const dockerInspect = await this.runCommand(
                'docker inspect supabase_db_app',
            );
            console.log('Supabase DB App Inspect:', dockerInspect);
        } catch (error) {
            console.error('Error running debug commands:', error);
        }
    }

    async status(): Promise<{
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
        console.log('Running Supabase status commands...');
        const output = await this.runCommand('supabase status');

        const parseValue = (key: string): string | null => {
            const regex = new RegExp(`${key}:\\s*(.+)`);
            const match = output.match(regex);
            return match ? match[1].trim() : null;
        };

        return {
            apiUrl: parseValue('API URL'),
            graphqlUrl: parseValue('GraphQL URL'),
            s3StorageUrl: parseValue('S3 Storage URL'),
            dbUrl: parseValue('DB URL'),
            studioUrl: parseValue('Studio URL'),
            inbucketUrl: parseValue('Inbucket URL'),
            jwtSecret: parseValue('JWT secret'),
            anonKey: parseValue('anon key'),
            serviceRoleKey: parseValue('service_role key'),
            s3AccessKey: parseValue('S3 Access Key'),
            s3SecretKey: parseValue('S3 Secret Key'),
            s3Region: parseValue('S3 Region'),
        };
    }
}

export default Supabase.getInstance();
