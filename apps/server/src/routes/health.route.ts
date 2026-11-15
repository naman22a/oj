import type { FastifyInstance } from 'fastify';
import { checkHealth } from '../controllers/health.controller.js';

export default (
    fastify: FastifyInstance,
    _opts: {
        prefix: string;
    },
    done: (err?: Error) => void
) => {
    fastify.get('/', checkHealth);
    done();
};
