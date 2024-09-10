import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Application } from "oak";
import { log } from "../general/log.ts";
import { createProxyMiddleware } from "npm:http-proxy-middleware";
import { Server } from "../../../shared/meta.ts";

const CONFIG_TOML_FILE = "config.toml";

export class SupabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseError";
  }
}

export class Supabase {
  private static instance: Supabase | null = null;

  private appDir: string;
  private configDir: string;
  private debug: boolean;
  private routes: {
    [key in Server.E_HTTPRoute]: string | null;
  } = {
    [Server.E_HTTPRoute.API]: null,
    [Server.E_HTTPRoute.GRAPHQL]: null,
    [Server.E_HTTPRoute.STORAGE]: null,
    [Server.E_HTTPRoute.DB]: null,
    [Server.E_HTTPRoute.STUDIO]: null,
    [Server.E_HTTPRoute.INBUCKET]: null,
  };

  constructor(debug: boolean = false) {
    this.appDir = path.resolve("./modules/supabase/app");
    this.configDir = path.join(this.appDir, "supabase");
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

  async setupReverseProxies(app: Application): Promise<void> {
    const statusUrls = await this.getStatus();

    const setupProxy = (route: Server.E_HTTPRoute, target: string | null) => {
      if (target) {
        app.use(
          route,
          createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: { [`^${route}`]: "" },
          })
        );
        this.routes[route as Server.E_HTTPRoute] = target;
        log(`Reverse proxy set up for ${route} -> ${target}`, "success");
      }
    };

    setupProxy(Server.E_HTTPRoute.API, statusUrls.apiUrl);
    setupProxy(Server.E_HTTPRoute.GRAPHQL, statusUrls.graphqlUrl);
    setupProxy(Server.E_HTTPRoute.STORAGE, statusUrls.s3StorageUrl);
    setupProxy(Server.E_HTTPRoute.STUDIO, statusUrls.studioUrl);
    setupProxy(Server.E_HTTPRoute.INBUCKET, statusUrls.inbucketUrl);
    setupProxy(Server.E_HTTPRoute.DB, statusUrls.dbUrl);
  }

  async initializeAndStart(data: { forceRestart: boolean }): Promise<void> {
    log("Initializing and starting Supabase...", "info");

    try {
      // Check if Supabase CLI is installed.
      try {
        const process = Deno.run({
          cmd: ["npx", "supabase", "--version"],
          cwd: this.appDir,
          stdout: "piped",
        });
        const output = await process.output();
        const stdout = new TextDecoder().decode(output).trim();
        process.close();
        log(`Supabase CLI version: ${stdout}`, "success");
      } catch (error) {
        throw new SupabaseError(
          "Supabase CLI is not installed. Please install it first."
        );
      }
      await this.initializeProjectIfNeeded();
      await this.startSupabase(data.forceRestart);
    } catch (error) {
      log(
        `Failed to initialize and start Supabase: ${error.message}`,
        "error"
      );
      throw error;
    }

    log("Supabase initialization and startup complete.", "success");
  }

  private async initializeProjectIfNeeded(): Promise<void> {
    const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
    try {
      await fs.access(configPath);
      log("Supabase project already initialized.", "success");
    } catch {
      log("Supabase project not initialized. Initializing now...", "info");
      await this.runSupabaseCommand({
        command: "init",
        appendWorkdir: true,
      });
      log("Supabase project initialized.", "success");
    }
  }

  private async startSupabase(forceRestart: boolean): Promise<void> {
    if (forceRestart) {
      log("Stopping Supabase services for a forced restart...", "info");
      await this.stopSupabase();
    } else if (await this.isStarting()) {
      log(
        "Supabase is already starting up. Waiting for it to complete...",
        "info"
      );
      await this.waitForStartup();
      return;
    } else if (!(await this.isRunning())) {
      log("Supabase services are not running. Starting them...", "info");
      await this.stopSupabase();
    }

    try {
      log("Starting Supabase services...", "info");
      await this.runSupabaseCommand({
        command: "start",
        appendWorkdir: true,
      });
      log("Supabase services started successfully.", "success");
    } catch (error) {
      log(`Failed to start Supabase: ${error.message}`, "error");
      throw error;
    }
  }

  private async stopSupabase(): Promise<void> {
    log("Stopping Supabase services...", "info");
    try {
      await this.runSupabaseCommand({
        command: "stop",
        appendWorkdir: true,
      });
      log("Supabase services stopped.", "success");
    } catch (error) {
      log(`Failed to stop Supabase: ${error.message}`, "warning");
    }
  }

  async isRunning(): Promise<boolean> {
    const NOT_RUNNING = "not running";
    const EXITED = "exited";
    const FAILED_TO_INSPECT = "failed to inspect container health";
    const NO_SUCH_CONTAINER = "No such container: supabase_db_app";

    try {
      const output = await this.runSupabaseCommand({
        command: "status",
        appendWorkdir: true,
        suppressError: true, // Suppress error logging
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
      const process = Deno.run({
        cmd: ["docker", "ps", "--format", "{{.Names}}"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const output = await process.output();
      const stdout = new TextDecoder().decode(output);
      process.close();
      return (
        stdout.includes("supabase_db_app") && !(await this.isRunning())
      );
    } catch (error) {
      return false;
    }
  }

  private async waitForStartup(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    const checkRunning = async (): Promise<void> => {
      if (await this.isRunning()) {
        return;
      }
      if (Date.now() - startTime >= timeout) {
        throw new Error("Timeout waiting for Supabase to start");
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      await checkRunning();
    };

    await checkRunning();
  }

  private async runSupabaseCommand(data: {
    command: string;
    appendWorkdir: boolean;
    suppressError?: boolean;
  }): Promise<string> {
    const fullCommand = `npx supabase ${data.command}${
      data.appendWorkdir ? ` --workdir ${this.appDir}` : ""
    }`;

    try {
      const process = Deno.run({
        cmd: ["sh", "-c", fullCommand],
        cwd: this.appDir,
        env: { ...Deno.env.toObject(), SUPABASE_DEBUG: this.debug ? "1" : "0" },
        stdout: "piped",
        stderr: "piped",
      });
      const [stdout, stderr] = await Promise.all([
        process.output(),
        process.stderrOutput(),
      ]);
      const status = await process.status();
      process.close();

      if (!status.success) {
        throw new Error(new TextDecoder().decode(stderr));
      }

      return new TextDecoder().decode(stdout).trim();
    } catch (error) {
      if (!data.suppressError) {
        log(`Error executing command: ${fullCommand}`, "error");
        if (this.debug) {
          log(
            `Full error details: ${JSON.stringify(error, null, 2)}`,
            "error"
          );
        }
      }
      throw new SupabaseError(`Command failed: ${fullCommand}`);
    }
  }

  async debugStatus(): Promise<void> {
    log("Running Supabase debug commands...", "info");
    try {
      const status = await this.runSupabaseCommand({
        command: "status --debug",
        appendWorkdir: true,
      });
      log(`Supabase Status (Debug): ${status}`, "info");

      const dockerPs = await Deno.run({
        cmd: ["docker", "ps", "-a"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const dockerPsOutput = await dockerPs.output();
      dockerPs.close();
      log(`Docker Containers: ${new TextDecoder().decode(dockerPsOutput)}`, "info");

      const dockerLogs = await Deno.run({
        cmd: ["docker", "logs", "supabase_db_app"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const dockerLogsOutput = await dockerLogs.output();
      dockerLogs.close();
      log(`Supabase DB App Logs: ${new TextDecoder().decode(dockerLogsOutput)}`, "info");

      const dockerInspect = await Deno.run({
        cmd: ["docker", "inspect", "supabase_db_app"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const dockerInspectOutput = await dockerInspect.output();
      dockerInspect.close();
      log(`Supabase DB App Inspect: ${new TextDecoder().decode(dockerInspectOutput)}`, "info");
    } catch (error) {
      log(`Error running debug commands: ${error}`, "error");
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
    const API_URL = "API URL";
    const GRAPHQL_URL = "GraphQL URL";
    const S3_STORAGE_URL = "S3 Storage URL";
    const DB_URL = "DB URL";
    const STUDIO_URL = "Studio URL";
    const INBUCKET_URL = "Inbucket URL";
    const JWT_SECRET = "JWT secret";
    const ANON_KEY = "anon key";
    const SERVICE_ROLE_KEY = "service_role key";
    const S3_ACCESS_KEY = "S3 Access Key";
    const S3_SECRET_KEY = "S3 Secret Key";
    const S3_REGION = "S3 Region";

    const output = await this.runSupabaseCommand({
      command: "status",
      appendWorkdir: true,
    });

    const parseValue = (key: string): string | null => {
      const regex = new RegExp(`${key}:\\s*(.+)`, "u");
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