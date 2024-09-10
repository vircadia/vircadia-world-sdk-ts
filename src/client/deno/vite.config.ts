import { defineConfig } from 'npm:vite';
import path from 'node:path';

export default defineConfig({
    root: path.resolve(__dirname, 'src/browser/client'),
    plugins: [],
    build: {
        outDir: path.resolve(__dirname, 'dist/browser/client'),
        lib: {
            entry: path.resolve(__dirname, 'src/browser/client/client.ts'),
            name: 'Client',
            fileName: (format) => `client.${format}.js`,
        },
    },
    optimizeDeps: {
        include: ['src/client/browser/client.ts'],
    },
    server: {
        open: '/dashboard/index.html',
    },
});