import { build } from "bun";

try {
    const result = await build({
        entrypoints: ["./src/index.browser.ts"],
        outdir: "./dist/browser",
        format: "esm",
        target: "browser",
        splitting: true, // Enables code splitting for tree-shaking
        minify: {
            syntax: true,
            whitespace: true,
            identifiers: true,
        },
        sourcemap: "external",
        external: [
            // List dependencies that should not be bundled
            "@vueuse/core",
            "vue",
            "zod",
            "idb",
            "lodash-es",
            "mobx"
        ]
    });

    console.log(`Browser build completed with ${result.outputs.length} output files`);

    if (!result.success) {
        console.error("Browser build failed with errors:", result.logs);
        process.exit(1);
    }
} catch (error) {
    console.error("Browser build failed:", error);
    process.exit(1);
} 