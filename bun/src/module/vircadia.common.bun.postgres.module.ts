import { SQL } from "bun";
import { BunLogModule } from "./vircadia.common.bun.log.module";
import { serverConfiguration } from "../config/vircadia.server.config";
// Using Bun's native SQL client with built-in connection pooling

export class BunPostgresClientModule {
    private static instance: BunPostgresClientModule | null = null;
    private superSql: SQL | null = null;
    private proxySql: SQL | null = null;
    private legacySuperSql: import("postgres").Sql | null = null;

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
    }): Promise<SQL> {
        try {
            if (!this.superSql) {
                // Create super user connection using Bun's SQL (pooling enabled by default)
                const connectionString = `postgres://${encodeURIComponent(data.postgres.username)}:${encodeURIComponent(data.postgres.password)}@${data.postgres.host}:${data.postgres.port}/${encodeURIComponent(data.postgres.database)}`;
                this.superSql = new SQL(connectionString);

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
    }): Promise<SQL> {
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

                const connectionString = `postgres://${encodeURIComponent(data.postgres.username)}:${encodeURIComponent(data.postgres.password)}@${data.postgres.host}:${data.postgres.port}/${encodeURIComponent(data.postgres.database)}`;
                this.proxySql = new SQL(connectionString);

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

    public async getLegacySuperClient(data: {
        postgres: {
            host: string;
            port: number;
            database: string;
            username: string;
            password: string;
        };
    }): Promise<import("postgres").Sql> {
        try {
            if (!this.legacySuperSql) {
                BunLogModule({
                    message:
                        "Initializing legacy postgres.js super user connection...",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });

                const { default: postgres } = await import("postgres");
                this.legacySuperSql = postgres({
                    host: data.postgres.host,
                    port: data.postgres.port,
                    database: data.postgres.database,
                    username: data.postgres.username,
                    password: data.postgres.password,
                });

                await this.legacySuperSql`SELECT 1`;

                BunLogModule({
                    message:
                        "Legacy postgres.js super user connection established successfully.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
            return this.legacySuperSql;
        } catch (error) {
            this.logIssue(error, data.postgres.host, data.postgres.port);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.superSql) {
            try {
                const endFn = (
                    this.superSql as unknown as {
                        end?: () => Promise<void> | void;
                        close?: () => Promise<void> | void;
                    }
                ).end;
                if (endFn) await Promise.resolve(endFn.call(this.superSql));
                else {
                    const closeFn = (
                        this.superSql as unknown as {
                            close?: () => Promise<void> | void;
                        }
                    ).close;
                    if (closeFn)
                        await Promise.resolve(closeFn.call(this.superSql));
                }
            } finally {
                this.superSql = null;
                BunLogModule({
                    message: "PostgreSQL super user connection closed.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
        }

        if (this.proxySql) {
            try {
                const endFn = (
                    this.proxySql as unknown as {
                        end?: () => Promise<void> | void;
                        close?: () => Promise<void> | void;
                    }
                ).end;
                if (endFn) await Promise.resolve(endFn.call(this.proxySql));
                else {
                    const closeFn = (
                        this.proxySql as unknown as {
                            close?: () => Promise<void> | void;
                        }
                    ).close;
                    if (closeFn)
                        await Promise.resolve(closeFn.call(this.proxySql));
                }
            } finally {
                this.proxySql = null;
                BunLogModule({
                    message: "PostgreSQL proxy account connection closed.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
        }

        if (this.legacySuperSql) {
            try {
                await this.legacySuperSql.end();
            } finally {
                this.legacySuperSql = null;
                BunLogModule({
                    message: "Legacy postgres.js super user connection closed.",
                    type: "debug",
                    suppress: this.suppress,
                    debug: this.debug,
                });
            }
        }
    }
}
