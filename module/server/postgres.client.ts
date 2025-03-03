import postgres from "postgres";
import { log } from "../general/log";
import { VircadiaConfig } from "../../config/vircadia.config";

export class PostgresClient {
    private static instance: PostgresClient | null = null;
    private superSql: postgres.Sql | null = null;
    private proxySql: postgres.Sql | null = null;

    public static getInstance(): PostgresClient {
        if (!PostgresClient.instance) {
            PostgresClient.instance = new PostgresClient();
        }
        return PostgresClient.instance;
    }

    private static logConfig(): void {
        log({
            message: "PostgreSQL connection env variables:",
            type: "info",
            debug: VircadiaConfig.SERVER.DEBUG,
            suppress: VircadiaConfig.SERVER.SUPPRESS,
            data: {
                HOST_EXTERNAL:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.HOST_EXTERNAL,
                PORT_EXTERNAL:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.PORT_EXTERNAL,
                HOST_CLUSTER:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.HOST_CLUSTER,
                PORT_CLUSTER:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.PORT_CLUSTER,
                DATABASE: VircadiaConfig.SERVER.SERVICE.POSTGRES.DATABASE,
                SUPERUSER: VircadiaConfig.GLOBAL_CONSTS.DB_SUPER_USER,
                AGENT_PROXY_USER:
                    VircadiaConfig.GLOBAL_CONSTS.DB_AGENT_PROXY_USER,
                AGENT_PROXY_PASSWORD:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.AGENT_PROXY_PASSWORD,
            },
        });
    }

    public async getSuperClient(data: {
        postgres: {
            host: string;
            port: number;
        };
    }): Promise<postgres.Sql> {
        try {
            if (!this.superSql) {
                // Create super user connection using config
                this.superSql = postgres({
                    host: data.postgres.host,
                    port: data.postgres.port,
                    database: VircadiaConfig.SERVER.SERVICE.POSTGRES.DATABASE,
                    username: VircadiaConfig.GLOBAL_CONSTS.DB_SUPER_USER,
                    password: VircadiaConfig.SERVER.SERVICE.POSTGRES.PASSWORD,
                    onnotice: VircadiaConfig.SERVER.SUPPRESS
                        ? () => {}
                        : undefined,
                    onclose: VircadiaConfig.SERVER.SUPPRESS
                        ? () => {}
                        : undefined,
                });

                // Test super user connection immediately
                await this.superSql`SELECT 1`;

                log({
                    message:
                        "PostgreSQL super user connection established successfully.",
                    type: "debug",
                    suppress: VircadiaConfig.SERVER.SUPPRESS,
                    debug: VircadiaConfig.SERVER.DEBUG,
                });
            }
            return this.superSql;
        } catch (error) {
            PostgresClient.logConfig();
            throw error;
        }
    }

    public async getProxyClient(data: {
        postgres: {
            host: string;
            port: number;
        };
    }): Promise<postgres.Sql> {
        try {
            if (!this.proxySql) {
                // Create proxy account connection
                log({
                    message:
                        "Initializing PostgreSQL proxy account connection...",
                    type: "debug",
                    suppress: VircadiaConfig.SERVER.SUPPRESS,
                    debug: VircadiaConfig.SERVER.DEBUG,
                });

                this.proxySql = postgres({
                    host: data.postgres.host,
                    port: data.postgres.port,
                    database: VircadiaConfig.SERVER.SERVICE.POSTGRES.DATABASE,
                    username: VircadiaConfig.GLOBAL_CONSTS.DB_AGENT_PROXY_USER,
                    password:
                        VircadiaConfig.SERVER.SERVICE.POSTGRES
                            .AGENT_PROXY_PASSWORD,
                    onnotice: VircadiaConfig.SERVER.SUPPRESS
                        ? () => {}
                        : undefined,
                    onclose: VircadiaConfig.SERVER.SUPPRESS
                        ? () => {}
                        : undefined,
                });

                // Test proxy account connection immediately
                await this.proxySql`SELECT 1`;

                log({
                    message:
                        "PostgreSQL proxy account connection established successfully.",
                    type: "debug",
                    suppress: VircadiaConfig.SERVER.SUPPRESS,
                    debug: VircadiaConfig.SERVER.DEBUG,
                });
            }
            return this.proxySql;
        } catch (error) {
            PostgresClient.logConfig();
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
                suppress: VircadiaConfig.SERVER.SUPPRESS,
                debug: VircadiaConfig.SERVER.DEBUG,
            });
        }

        if (this.proxySql) {
            await this.proxySql.end();
            this.proxySql = null;
            log({
                message: "PostgreSQL proxy account connection closed.",
                type: "debug",
                suppress: VircadiaConfig.SERVER.SUPPRESS,
                debug: VircadiaConfig.SERVER.DEBUG,
            });
        }
    }
}
