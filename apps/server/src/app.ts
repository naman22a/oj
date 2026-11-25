import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';

import healthRoutes from './routes/health.route.js';
import authRoutes from './routes/auth.route.js';
import usersRoutes from './routes/users.route.js';
import problemsRoutes from './routes/problems.route.js';
import tagsRoutes from './routes/tags.route.js';
import companiesRoutes from './routes/companies.route.js';
import submissionsRoutes from './routes/submissions.route.js';

declare module 'fastify' {
    interface FastifyRequest {
        userId?: number;
    }
}

export async function buildApp() {
    const fastify = Fastify({
        logger:
            process.env.NODE_ENV === 'test'
                ? false
                : {
                      transport: {
                          target: 'pino-pretty',
                          options: {
                              translateTime: 'HH:MM:ss Z',
                              ignore: 'pid,hostname'
                          }
                      }
                  }
    });

    await fastify.register(cors, {
        origin: process.env.CLIENT_URL,
        credentials: true
    });

    await fastify.register(fastifyCookie);

    await fastify.register(
        async (instance) => {
            instance.register(healthRoutes, { prefix: '/health' });
            instance.register(authRoutes, { prefix: '/auth' });
            instance.register(usersRoutes, { prefix: '/users' });
            instance.register(problemsRoutes, { prefix: '/problems' });
            instance.register(tagsRoutes, { prefix: '/tags' });
            instance.register(companiesRoutes, { prefix: '/companies' });
            instance.register(submissionsRoutes, { prefix: '/submissions' });
        },
        { prefix: '/api' }
    );

    return fastify;
}
