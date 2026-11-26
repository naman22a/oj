import type { FastifyInstance } from 'fastify';
import {
    postConfirmEmail,
    postRegister,
    postLogin,
    postLogout,
    getMe,
    postForgotPassword,
    postResetPassword,
    postRefreshToken
} from '../controllers/auth.controller.js';
import {
    ConfirmEmailSchema,
    RegisterSchema,
    LoginSchema,
    LogoutSchema,
    MeSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    RefreshTokenSchema
} from '../common/schemas/index.js';
import { authGuard } from '../middleware/auth.middleware.js';

export default (
    fastify: FastifyInstance,
    _opts: {
        prefix: string;
    },
    done: (err?: Error) => void
) => {
    fastify.post(
        '/register',
        {
            schema: RegisterSchema,
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: '1 hour'
                }
            }
        },
        postRegister
    );
    fastify.post(
        '/confirm-email/:token',
        { schema: ConfirmEmailSchema },
        postConfirmEmail
    );
    fastify.post(
        '/login',
        {
            schema: LoginSchema,
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: '1 minute'
                }
            }
        },
        postLogin
    );
    fastify.post(
        '/logout',
        { schema: LogoutSchema, preHandler: authGuard },
        postLogout
    );
    fastify.get('/me', { schema: MeSchema, preHandler: authGuard }, getMe);
    fastify.post(
        '/forgot-password',
        { schema: ForgotPasswordSchema },
        postForgotPassword
    );
    fastify.post(
        '/reset-password/:token',
        { schema: ResetPasswordSchema },
        postResetPassword
    );
    fastify.post(
        '/refresh_token',
        { schema: RefreshTokenSchema },
        postRefreshToken
    );

    done();
};
