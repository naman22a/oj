import Fastify from 'fastify';

// GET /api/health
export const checkHealth: Fastify.RouteHandler = async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
};
