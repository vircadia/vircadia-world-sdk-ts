import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Router, proxy } from "oak";
import { log } from "../vircadia-world-meta/general/modules/log.ts";
import { Server } from "../vircadia-world-meta/meta.ts";

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

  private loadConfig(): void {
    // const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
    // const config = toml.parse(await fs.readFile(configPath, "utf8"));
    // this.routes = config.routes;
  }

  async setupReverseProxies(router: Router): Promise<void> {
    const statusUrls = await this.getStatus();

    const setupProxy = (route: Server.E_HTTPRoute, target: string | null) => {
      if (target) {
        const targetUrl = new URL(target);
        router.all(`${route}(.*)`, async (ctx) => {
          ctx.request.url.pathname = ctx.params[0] || '/';
          await proxy(ctx, targetUrl.origin);
        });
        this.routes[route as Server.E_HTTPRoute] = target;
        log({
          message: `Reverse proxy set up for ${route} -> ${target}`,
          type: "success",
          debug: this.debug
        });
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
    log({
      message: "Initializing and starting Supabase...",
      type: "info",
      debug: this.debug
    });

    try {
      // Check if Supabase CLI is installed.
      try {
        const command = new Deno.Command("npx", {
          args: ["supabase", "--version"],
          cwd: this.appDir,
          stdout: "piped",
        });
        const { stdout } = await command.output();
        const output = new TextDecoder().decode(stdout).trim();
        log({
          message: `Supabase CLI version: ${output}`,
          type: "success",
          debug: this.debug
        });
      } catch (error) {
        throw new SupabaseError(
          "Supabase CLI is not installed. Please install it first."
        );
      }
      await this.initializeProjectIfNeeded();
      await this.startSupabase(data.forceRestart);
    } catch (error) {
      log({
        message: `Failed to initialize and start Supabase: ${error.message}`,
        type: "error",
        debug: this.debug
      });
      throw error;
    }

    log({
      message: "Supabase initialization and startup complete.",
      type: "success",
      debug: this.debug
    });
  }

  private async initializeProjectIfNeeded(): Promise<void> {
    const configPath = path.join(this.configDir, CONFIG_TOML_FILE);
    try {
      await fs.access(configPath);
      log({
        message: "Supabase project already initialized.",
        type: "success",
        debug: this.debug
      });
    } catch {
      log({
        message: "Supabase project not initialized. Initializing now...",
        type: "info",
        debug: this.debug
      });
      await this.runSupabaseCommand({
        command: "init",
        appendWorkdir: true,
      });
      log({
        message: "Supabase project initialized.",
        type: "success",
        debug: this.debug
      });
    }
  }

  private async startSupabase(forceRestart: boolean): Promise<void> {
    if (forceRestart) {
      log({
        message: "Stopping Supabase services for a forced restart...",
        type: "info",
        debug: this.debug
      });
      await this.stopSupabase();
    } else if (await this.isStarting()) {
      log({
        message: "Supabase is already starting up. Waiting for it to complete...",
        type: "info",
        debug: this.debug
      });
      await this.waitForStartup();
      return;
    } else if (!(await this.isRunning())) {
      log({
        message: "Supabase services are not running. Starting them...",
        type: "info",
        debug: this.debug
      });
      await this.stopSupabase();
    }

    try {
      log({
        message: "Starting Supabase services...",
        type: "info",
        debug: this.debug
      });
      await this.runSupabaseCommand({
        command: "start",
        appendWorkdir: true,
      });
      log({
        message: "Supabase services started successfully.",
        type: "success",
        debug: this.debug
      });
    } catch (error) {
      log({
        message: `Failed to start Supabase: ${error.message}`,
        type: "error",
        debug: this.debug
      });
      throw error;
    }
  }

  private async stopSupabase(): Promise<void> {
    log({
      message: "Stopping Supabase services...",
      type: "info",
      debug: this.debug
    });
    try {
      await this.runSupabaseCommand({
        command: "stop",
        appendWorkdir: true,
      });
      log({
        message: "Supabase services stopped.",
        type: "success",
        debug: this.debug
      });
    } catch (error) {
      log({
        message: `Failed to stop Supabase: ${error.message}`,
        type: "warning",
        debug: this.debug
      });
    }
  }

  async isRunning(): Promise<boolean> {
    const CONTAINS_IF_WORKING = 'API URL:';
    log({
      message: "Checking if Supabase is running...",
      type: "debug",
      debug: this.debug
    });
    try {
      const output = await this.runSupabaseCommand({
        command: "status",
        appendWorkdir: true,
        suppressError: true,
      });
      log({
        message: `Supabase status: ${output}`,
        type: "debug",
        debug: this.debug
      });
      return output.includes(CONTAINS_IF_WORKING);
    } catch (error) {
      return false;
    }
  }

  private async isStarting(): Promise<boolean> {
    try {
      const command = new Deno.Command("docker", {
        args: ["ps", "--format", "{{.Names}}"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const { stdout } = await command.output();
      const output = new TextDecoder().decode(stdout);
      return (
        output.includes("supabase_db_app") && !(await this.isRunning())
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
      const command = new Deno.Command("npx", {
        args: ["supabase", ...data.command.split(" "), ...(data.appendWorkdir ? ["--workdir", this.appDir] : [])],
        cwd: this.appDir,
        env: { ...Deno.env.toObject(), SUPABASE_DEBUG: this.debug ? "1" : "0" },
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout, stderr } = await command.output();
      const output = new TextDecoder().decode(stdout);
      const errorOutput = new TextDecoder().decode(stderr);

      if (errorOutput && !data.suppressError) {
        log({
          message: `Command stderr: ${errorOutput}`,
          type: "warning",
          debug: this.debug
        });
      }

      log({
        message: `Command stdout: ${output}`,
        type: "debug",
        debug: this.debug
      });

      return output.trim();
    } catch (error) {
      if (!data.suppressError) {
        log({
          message: `Error executing command: ${fullCommand}`,
          type: "error",
          debug: this.debug
        });
        log({
          message: `Full error details: ${JSON.stringify(error, null, 2)}`,
          type: "error",
          debug: this.debug
        });
      }
      throw new SupabaseError(`Command failed: ${fullCommand}`);
    }
  }

  async debugStatus(): Promise<void> {
    log({
      message: "Running Supabase debug commands...",
      type: "info",
      debug: this.debug
    });
    try {
      const status = await this.runSupabaseCommand({
        command: "status --debug",
        appendWorkdir: true,
      });
      log({
        message: `Supabase Status (Debug): ${status}`,
        type: "info",
        debug: this.debug
      });

      const dockerPs = new Deno.Command("docker", {
        args: ["ps", "-a"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const { stdout: dockerPsOutput } = await dockerPs.output();
      log({
        message: `Docker Containers: ${new TextDecoder().decode(dockerPsOutput)}`,
        type: "info",
        debug: this.debug
      });

      const dockerLogs = new Deno.Command("docker", {
        args: ["logs", "supabase_db_app"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const { stdout: dockerLogsOutput } = await dockerLogs.output();
      log({
        message: `Supabase DB App Logs: ${new TextDecoder().decode(dockerLogsOutput)}`,
        type: "info",
        debug: this.debug
      });

      const dockerInspect = new Deno.Command("docker", {
        args: ["inspect", "supabase_db_app"],
        cwd: this.appDir,
        stdout: "piped",
      });
      const { stdout: dockerInspectOutput } = await dockerInspect.output();
      log({
        message: `Supabase DB App Inspect: ${new TextDecoder().decode(dockerInspectOutput)}`,
        type: "info",
        debug: this.debug
      });
    } catch (error) {
      log({
        message: `Error running debug commands: ${error}`,
        type: "error",
        debug: this.debug
      });
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