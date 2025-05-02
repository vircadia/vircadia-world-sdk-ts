import { build } from "bun";

await build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
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
        "console-log-colors",
        "eight-colors",
        "jsonwebtoken",
        "lodash-es",
        "mobx",
        "postgres",
        "tmp",
        "vue",
        "zod",
        "idb"
    ],
    plugins: [
        {
            name: "log-plugin",
            setup(build) {
                build.onEnd((result) => {
                    console.log(`Build completed with ${result.outputs.length} output files`);

                    if (!result.success) {
                        console.error("Build failed with errors:", result.logs);
                    }
                });
            }
        }
    ]
}); 