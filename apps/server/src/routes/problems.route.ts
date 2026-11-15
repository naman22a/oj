import type {
    FastifyInstance,
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    FastifyBaseLogger
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
    getProblems,
    getProblem,
    createProblem,
    updateProblem,
    deleteProblem
} from '../controllers/problems.controller.ts';
import {
    GetProblemsSchema,
    GetProblemSchema,
    CreateProblemSchema,
    UpdateProblemSchema,
    DeleteProblemSchema
} from '../common/schemas/index.ts';
import { authGuard } from '../middleware/auth.middleware.ts';
import { adminGuard } from '../middleware/admin.middleware.ts';

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
    fastify.get('/', { schema: GetProblemsSchema }, getProblems);
    fastify.get('/:id', { schema: GetProblemSchema }, getProblem);

    // admin routes
    fastify.post(
        '/',
        { schema: CreateProblemSchema, preHandler: adminGuard },
        createProblem
    );
    fastify.put(
        '/:id',
        { schema: UpdateProblemSchema, preHandler: adminGuard },
        updateProblem
    );
    fastify.delete(
        '/:id',
        { schema: DeleteProblemSchema, preHandler: adminGuard },
        deleteProblem
    );

    done();
};
