import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { __prod__ } from './common/constants/index.js';
import { getORM } from './db/index.js';
import fastifyCookie from '@fastify/cookie';

// IMPORT ROUTES
import healthRoutes from './routes/health.route.js';
import authRoutes from './routes/auth.route.js';
import usersRoutes from './routes/users.route.js';
import problemsRoutes from './routes/problems.route.js';

declare module 'fastify' {
    interface FastifyRequest {
        userId?: number;
    }
}

// CONSTANTS
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

// MIDDLEWARE
fastify.register(cors, {
    origin: process.env.CLIENT_URL,
    credentials: true
});
fastify.register(fastifyCookie);

// ROUTES
fastify.register(
    async (instance) => {
        instance.register(healthRoutes, { prefix: '/health' });
        instance.register(authRoutes, { prefix: '/auth' });
        instance.register(usersRoutes, { prefix: '/users' });
        instance.register(problemsRoutes, { prefix: '/problems' });
    },
    { prefix: '/api' }
);

// START THE SERVER
const start = async () => {
    try {
        // DB CONNECTION
        const orm = await getORM();
        await orm.connect();

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
