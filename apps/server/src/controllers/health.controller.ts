import Fastify from 'fastify';

export const checkHealth: Fastify.RouteHandler = async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
};
