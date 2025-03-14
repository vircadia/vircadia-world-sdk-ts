import postgres from "postgres";
import { log } from "../general/log";
import { VircadiaConfig } from "../../config/vircadia.config";

// TODO: Use Bun native .sql client and use pooling to reduce latency issues.

const IDLE_TIMEOUT_MS = 10000;
const CONNECT_TIMEOUT_MS = 10000;

export class PostgresClient {
    private static instance: PostgresClient | null = null;
    private superSql: postgres.Sql | null = null;
    private proxySql: postgres.Sql | null = null;

    private debug: boolean;
    private suppress: boolean;

    constructor(data: {
        debug: boolean;
        suppress: boolean;
    }) {
        this.debug = data.debug;
        this.suppress = data.suppress;
    }

    public static getInstance(data: {
        debug: boolean;
        suppress: boolean;
    }): PostgresClient {
        if (!PostgresClient.instance) {
            PostgresClient.instance = new PostgresClient(data);
        }
        return PostgresClient.instance;
    }

    private logIssue(error: unknown, host: string, port: number): void {
        log({
            message: "PostgreSQL connection issue.",
            data: {
                host,
                port,
            },
            type: "debug",
            suppress: this.suppress,
            debug: this.debug,
            error,
        });
        log({
            message: "PostgreSQL connection env variables:",
            type: "debug",
            debug: this.debug,
            suppress: this.suppress,
            data: {
                ...VircadiaConfig.SERVER,
                ...VircadiaConfig.CLI,
            },
        });
    }

    public async getSuperClient(data: {
        postgres: {
            host: string;
            port: number;
            database: string;
            username: string;
            password: string;
        };
    }): Promise<postgres.Sql> {
        try {
            if (!this.superSql) {
                // Create super user connection using config
                this.superSql = postgres({
                    host: data.postgres.host,
                    port: data.postgres.port,
                    database: data.postgres.database,
                    username: data.postgres.username,
                    password: data.postgres.password,
                    idle_timeout: IDLE_TIMEOUT_MS,
                    connect_timeout: CONNECT_TIMEOUT_MS,
                    onnotice:
                        this.debug && !this.suppress ? () => {} : undefined,
                    onclose:
                        this.debug && !this.suppress ? () => {} : undefined,
                });

                // Test super user connection immediately
                await this.superSql`SELECT 1`;

                log({
                    message:
                        "PostgreSQL super user connection established successfully.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
            return this.superSql;
        } catch (error) {
            this.logIssue(error, data.postgres.host, data.postgres.port);
            throw error;
        }
    }

    public async getProxyClient(data: {
        postgres: {
            host: string;
            port: number;
            database: string;
            username: string;
            password: string;
        };
    }): Promise<postgres.Sql> {
        try {
            if (!this.proxySql) {
                // Create proxy account connection
                log({
                    message:
                        "Initializing PostgreSQL proxy account connection...",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });

                this.proxySql = postgres({
                    host: data.postgres.host,
                    port: data.postgres.port,
                    database: data.postgres.database,
                    username: data.postgres.username,
                    password: data.postgres.password,
                    idle_timeout: IDLE_TIMEOUT_MS,
                    connect_timeout: CONNECT_TIMEOUT_MS,
                    onnotice:
                        this.debug && !this.suppress ? () => {} : undefined,
                    onclose:
                        this.debug && !this.suppress ? () => {} : undefined,
                });

                // Test proxy account connection immediately
                await this.proxySql`SELECT 1`;

                log({
                    message:
                        "PostgreSQL proxy account connection established successfully.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
            return this.proxySql;
        } catch (error) {
            this.logIssue(error, data.postgres.host, data.postgres.port);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.superSql) {
            await this.superSql.end();
            this.superSql = null;
            log({
                message: "PostgreSQL super user connection closed.",
                type: "debug",
                suppress: this.suppress,
                debug: this.debug,
            });
        }

        if (this.proxySql) {
            await this.proxySql.end();
            this.proxySql = null;
            log({
                message: "PostgreSQL proxy account connection closed.",
                type: "debug",
                suppress: this.suppress,
                debug: this.debug,
            });
        }
    }
}
