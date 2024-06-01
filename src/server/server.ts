import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { appRouter } from './router';

async function main() {
    // express implementation
    const app = express();

    app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
        );
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization',
        );
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        } else {
            next();
        }
    });

    // For testing purposes, wait-on requests '/'
    app.get('/', (_req, res) => res.send('Server is running!'));

    app.use(
        '/trpc',
        createExpressMiddleware({
            router: appRouter,
        }),
    );
    app.listen(3000);
}

void main();
