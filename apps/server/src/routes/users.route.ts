import type { FastifyInstance } from 'fastify';
import { getUser, getUsers } from '../controllers/users.controller.ts';
import { GetUserSchema, GetUsersSchema } from '../common/schemas/index.ts';

export default (
    fastify: FastifyInstance,
    _opts: {
        prefix: string;
    },
    done: (err?: Error) => void
) => {
    fastify.get('/', { schema: GetUsersSchema }, getUsers);
    fastify.get('/:id', { schema: GetUserSchema }, getUser);
    done();
};
