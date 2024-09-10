import { defineConfig } from 'npm:vite';
import path from 'node:path';

export default defineConfig({
    root: path.resolve(__dirname),
    plugins: [],
    build: {
        outDir: path.resolve(__dirname, 'dist/'),
        lib: {
            entry: path.resolve(__dirname, 'index.ts'),
            name: 'VircadiaWorldBrowserClient',
            formats: ['es', 'umd'],
            fileName: (format) => `vircadia-world-browser-client.${format}.js`,
        },
        rollupOptions: {
            external: ['semver'],
            output: {
                globals: {
                    semver: 'semver',
                },
            },
        },
    },
    optimizeDeps: {
        include: ['browser/index.ts']
    },
    server: {
        open: '/dashboard/index.html',
    },
});