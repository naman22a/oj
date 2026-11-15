import type { FastifyInstance } from 'fastify';
import {
    postConfirmEmail,
    postRegister,
    postLogin,
    postLogout,
    getMe
} from '../controllers/auth.controller.js';
import {
    ConfirmEmailSchema,
    RegisterSchema,
    LoginSchema,
    LogoutSchema,
    MeSchema
} from '../common/schemas/index.js';
import { authGuard } from '../middleware/auth.middleware.js';

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
    fastify.post('/login', { schema: LoginSchema }, postLogin);
    fastify.post(
        '/logout',
        { schema: LogoutSchema, preHandler: authGuard },
        postLogout
    );
    fastify.get('/me', { schema: MeSchema, preHandler: authGuard }, getMe);

    done();
};
