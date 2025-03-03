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
                host_internal:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.HOST_INTERNAL,
                port_internal:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.PORT_INTERNAL,
                host_cluster:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.HOST_CLUSTER,
                port_cluster:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.PORT_CLUSTER,
                host_public: VircadiaConfig.SERVER.SERVICE.POSTGRES.HOST_PUBLIC,
                port_public: VircadiaConfig.SERVER.SERVICE.POSTGRES.PORT_PUBLIC,
                database: VircadiaConfig.SERVER.SERVICE.POSTGRES.DATABASE,
                superUser: VircadiaConfig.GLOBAL_CONSTS.DB_SUPER_USER,
                agentProxyUser:
                    VircadiaConfig.GLOBAL_CONSTS.DB_AGENT_PROXY_USER,
                agentProxyPassword:
                    VircadiaConfig.SERVER.SERVICE.POSTGRES.AGENT_PROXY_PASSWORD,
            },
        });
    }

    public async getSuperClient(data: {
        environment: "internal" | "cluster" | "public";
    }): Promise<postgres.Sql> {
        try {
            if (!this.superSql) {
                // Create super user connection using config
                this.superSql = postgres({
                    host:
                        data.environment === "internal"
                            ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                  .HOST_INTERNAL
                            : data.environment === "cluster"
                              ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .HOST_CLUSTER
                              : VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .HOST_PUBLIC,
                    port:
                        data.environment === "internal"
                            ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                  .PORT_INTERNAL
                            : data.environment === "cluster"
                              ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .PORT_CLUSTER
                              : VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .PORT_PUBLIC,
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
        environment: "internal" | "cluster" | "public";
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
                    host:
                        data.environment === "internal"
                            ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                  .HOST_INTERNAL
                            : data.environment === "cluster"
                              ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .HOST_CLUSTER
                              : VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .HOST_PUBLIC,
                    port:
                        data.environment === "internal"
                            ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                  .PORT_INTERNAL
                            : data.environment === "cluster"
                              ? VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .PORT_CLUSTER
                              : VircadiaConfig.SERVER.SERVICE.POSTGRES
                                    .PORT_PUBLIC,
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
