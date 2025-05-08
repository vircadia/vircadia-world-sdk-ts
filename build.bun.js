import { build } from "bun";

try {
    const result = await build({
        entrypoints: ["./src/index.bun.ts"],
        outdir: "./dist/bun",
        format: "esm",
        target: "bun",
        splitting: true, // Enables code splitting for tree-shaking
        minify: {
            syntax: true,
            whitespace: true,
            identifiers: true,
        },
        sourcemap: "external",
        external: [
            // List dependencies that should not be bundled
            "vue",
            "eight-colors",
            "jsonwebtoken",
            "lodash-es",
            "postgres",
            "tmp",
            "zod",
            "idb"
        ]
    });

    console.log(`Bun build completed with ${result.outputs.length} output files`);

    if (!result.success) {
        console.error("Bun build failed with errors:", result.logs);
        process.exit(1);
    }
} catch (error) {
    console.error("Bun build failed:", error);
    process.exit(1);
} 