import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { __prod__ } from './common/constants/index.js';

import healthRoutes from './routes/health.route.js';

const fastify = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
            }
        }
    }
});
const port = parseInt(process.env.PORT || '', 10) || 5000;

fastify.register(cors, {
    origin: process.env.CLIENT_URL,
    credentials: true
});
fastify.register(
    async (instance) => {
        instance.register(healthRoutes, { prefix: '/health' });
    },
    { prefix: '/api' }
);

const start = async () => {
    try {
        await fastify.listen({
            port,
            host: __prod__ ? '0.0.0.0' : '127.0.0.1'
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
