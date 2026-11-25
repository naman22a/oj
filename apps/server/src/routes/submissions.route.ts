import type {
    FastifyInstance,
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    FastifyBaseLogger
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
    createSubmission,
    getSubmission,
    getSubmissionProblemHistory,
    getSubmissionsHistory
} from '../controllers/submissions.controller.ts';
import { CreateSubmissionSchema } from '../common/schemas/index.ts';
import { authGuard } from '../middleware/auth.middleware.ts';

export type FastifyTypeBox = FastifyInstance<
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    FastifyBaseLogger,
    TypeBoxTypeProvider
>;

export default (
    fastify: FastifyTypeBox,
    _opts: {
        prefix: string;
    },
    done: (err?: Error) => void
) => {
    // protected routes
    fastify.addHook('preHandler', authGuard);

    fastify.get('/', getSubmissionsHistory);
    fastify.post(
        '/:slug',
        { schema: CreateSubmissionSchema },
        createSubmission
    );
    fastify.get('/:id', getSubmission);
    fastify.get('/history/:id', getSubmissionProblemHistory);

    done();
};
