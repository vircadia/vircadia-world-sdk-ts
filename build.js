import { spawn } from "bun";

async function runCommand(command, args) {
    console.log(`Running: ${command} ${args.join(" ")}`);
    const proc = spawn([command, ...args], {
        stdio: ["inherit", "inherit", "inherit"],
        cwd: process.cwd(),
    });

    const status = await proc.exited;
    if (status !== 0) {
        throw new Error(`Command failed with exit code ${status}`);
    }
}

try {
    // Generate TypeScript declaration files
    console.log("Generating TypeScript declaration files...");
    await runCommand("npx", ["tsc", "--emitDeclarationOnly"]);

    console.log("Starting browser build...");
    await runCommand("bun", ["run", "build.browser.js"]);

    console.log("Starting bun build...");
    await runCommand("bun", ["run", "build.bun.js"]);

    console.log("All builds completed successfully!");
} catch (error) {
    console.error("Build process failed:", error);
    process.exit(1);
}
