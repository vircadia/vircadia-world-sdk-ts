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
        const CLI_NOT_INSTALLED_ERROR =
            'Supabase CLI is not installed. Please install it first.';
        const STOP_ERROR = 'Failed to stop Supabase services during restart.';

        console.log('Initializing and starting Supabase...');

        try {
            const checkVersion = await this.runSupabaseCommand({
                command: '--version',
                appendWorkdir: false,
            });
            console.log('Supabase CLI version:', checkVersion);
        } catch (error) {
            if (error.message.includes('command not found')) {
                throw new SupabaseError(CLI_NOT_INSTALLED_ERROR);
            }
        }

        const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
        if (!fs.existsSync(configPath)) {
            console.log(
                'Supabase project not initialized. Initializing now...',
            );
            await this.runSupabaseCommand({
                command: 'init',
                appendWorkdir: true,
            });
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
                await this.runSupabaseCommand({
                    command: 'stop',
                    appendWorkdir: true,
                })
                    .catch(() => {
                        if (data.forceRestart) {
                            throw new SupabaseError(STOP_ERROR);
                        }
                    })
                    .then(async () => {
                        console.log('Supabase stopped.');
                        await this.runSupabaseCommand({
                            command: 'start',
                            appendWorkdir: true,
                        });
                        console.log('Supabase services started successfully.');
                    });
            } else {
                await this.runSupabaseCommand({
                    command: 'start',
                    appendWorkdir: true,
                });
                console.log('Supabase services started successfully.');
            }
        } catch (error) {
            console.error(`Attempt to start Supabase failed:`, error);
            console.log('Attempting to stop and restart Supabase...');
            await this.runSupabaseCommand({
                command: 'stop',
                appendWorkdir: true,
            })
                .catch(() => {
                    if (data.forceRestart) {
                        throw new SupabaseError(STOP_ERROR);
                    }
                })
                .then(async () => {
                    console.log('Supabase stopped.');
                    await this.runSupabaseCommand({
                        command: 'start',
                        appendWorkdir: true,
                    });
                    console.log('Supabase services started successfully.');
                });
        }

        console.log('Supabase initialization and startup complete.');
    }

    async stop(): Promise<void> {
        console.log('Stopping Supabase services...');
        await this.runSupabaseCommand({
            command: 'stop',
            appendWorkdir: true,
        });
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

    private async runSupabaseCommand(data: {
        command: string;
        appendWorkdir: boolean;
    }): Promise<string> {
        try {
            data.command = `npx supabase ${data.command}`;
            if (data.appendWorkdir || data.appendWorkdir === undefined) {
                data.command += ` --workdir ${this.appDir}`;
            }
            const { stdout } = await execa.execaCommand(data.command, {
                cwd: this.appDir,
                shell: true,
                env: { ...process.env, SUPABASE_DEBUG: this.debug ? '1' : '0' },
            });
            return stdout.trim();
        } catch (error) {
            console.error(`Error executing command: ${data.command}`, error);
            if (this.debug) {
                console.error(
                    'Full error details:',
                    JSON.stringify(error, null, 2),
                );
            }
            throw new SupabaseError(`Command failed: ${data.command}`);
        }
    }

    private async runCommand(data: { command: string }): Promise<string> {
        try {
            data.command = `${data.command}`;
            const { stdout, stderr } = await execa.execaCommand(data.command, {
                cwd: this.appDir,
                shell: true,
                env: { ...process.env, SUPABASE_DEBUG: this.debug ? '1' : '0' },
            });

            if (stderr) {
                throw new Error(stderr);
            }

            return stdout.trim();
        } catch (error) {
            const err = `Error executing command: ${data.command}, error: ${error}`;
            console.error(err);
            if (this.debug) {
                console.error(
                    'Full error details:',
                    JSON.stringify(error, null, 2),
                );
            }
            throw new Error(err);
        }
    }

    async debugStatus(): Promise<void> {
        console.log('Running Supabase debug commands...');
        try {
            const status = await this.runSupabaseCommand({
                command: 'status --debug',
                appendWorkdir: true,
            });
            console.log('Supabase Status (Debug):', status);

            const dockerPs = await this.runCommand({
                command: 'docker ps -a',
            });
            console.log('Docker Containers:', dockerPs);

            const dockerLogs = await this.runCommand({
                command: 'docker logs supabase_db_app',
            });
            console.log('Supabase DB App Logs:', dockerLogs);

            const dockerInspect = await this.runCommand({
                command: 'docker inspect supabase_db_app',
            });
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

        console.log('Running Supabase status commands...');
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
}

export default Supabase.getInstance();
