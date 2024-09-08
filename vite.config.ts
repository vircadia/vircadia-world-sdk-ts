import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'src/client'), // Set the root to the dashboard directory
    plugins: [],
    build: {
        outDir: path.resolve(__dirname, 'dist/client'),
        lib: {
            entry: path.resolve(__dirname, 'src/client/client.ts'),
            name: 'Client',
            fileName: (format) => `client.${format}.js`,
        },
    },
    optimizeDeps: {
        include: ['src/client/client.ts'], // Replace with your actual entry point file
    },
    server: {
        open: '/dashboard/index.html', // Open the dashboard/index.html on server start
    },
});
