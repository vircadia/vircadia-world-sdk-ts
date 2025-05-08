import postgres from "postgres";
import { BunLogModule } from "./vircadia.common.bun.log.module";
import { serverConfiguration } from "../config/vircadia.server.config";
// TODO: Use Bun native .sql client and use pooling to reduce latency issues.

const IDLE_TIMEOUT_S = 86400; // 24 hours
const CONNECT_TIMEOUT_S = 10; // 10 seconds

export class BunPostgresClientModule {
    private static instance: BunPostgresClientModule | null = null;
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
    }): BunPostgresClientModule {
        if (!BunPostgresClientModule.instance) {
            BunPostgresClientModule.instance = new BunPostgresClientModule(
                data,
            );
        }
        return BunPostgresClientModule.instance;
    }

    private logIssue(error: unknown, host: string, port: number): void {
        BunLogModule({
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
        BunLogModule({
            message: "PostgreSQL connection env variables:",
            type: "debug",
            debug: this.debug,
            suppress: this.suppress,
            data: {
                ...serverConfiguration,
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
                    idle_timeout: IDLE_TIMEOUT_S,
                    connect_timeout: CONNECT_TIMEOUT_S,
                    onnotice:
                        this.debug && !this.suppress ? () => {} : undefined,
                    onclose:
                        this.debug && !this.suppress ? () => {} : undefined,
                });

                // Test super user connection immediately
                await this.superSql`SELECT 1`;

                BunLogModule({
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
                BunLogModule({
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
                    idle_timeout: IDLE_TIMEOUT_S,
                    connect_timeout: CONNECT_TIMEOUT_S,
                    onnotice:
                        this.debug && !this.suppress ? () => {} : undefined,
                    onclose:
                        this.debug && !this.suppress ? () => {} : undefined,
                });

                // Test proxy account connection immediately
                await this.proxySql`SELECT 1`;

                BunLogModule({
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
            BunLogModule({
                message: "PostgreSQL super user connection closed.",
                type: "debug",
                suppress: this.suppress,
                debug: this.debug,
            });
        }

        if (this.proxySql) {
            await this.proxySql.end();
            this.proxySql = null;
            BunLogModule({
                message: "PostgreSQL proxy account connection closed.",
                type: "debug",
                suppress: this.suppress,
                debug: this.debug,
            });
        }
    }
}
