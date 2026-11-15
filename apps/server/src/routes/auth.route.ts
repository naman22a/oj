import type { FastifyInstance } from 'fastify';
import {
    postConfirmEmail,
    postRegister
} from '../controllers/auth.controller.js';
import { ConfirmEmailSchema, RegisterSchema } from '../common/schemas/index.js';

export default (
    fastify: FastifyInstance,
    _opts: {
        prefix: string;
    },
    done: (err?: Error) => void
) => {
    fastify.post('/register', { schema: RegisterSchema }, postRegister);
    fastify.post(
        '/confirm-email/:token',
        { schema: ConfirmEmailSchema },
        postConfirmEmail
    );

    done();
};
