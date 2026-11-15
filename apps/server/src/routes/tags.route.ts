import type {
    FastifyInstance,
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    FastifyBaseLogger
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { authGuard } from '../middleware/auth.middleware.ts';
import {
    BulkCreateTagsSchema,
    GetTagSchema,
    GetTagsSchema
} from '../common/schemas/index.ts';
import {
    bulkCreateTags,
    getTag,
    getTags
} from '../controllers/tags.controller.ts';
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
    fastify.addHook('preHandler', authGuard);
    fastify.get('/', { schema: GetTagsSchema }, getTags);
    fastify.get('/:id', { schema: GetTagSchema }, getTag);
    fastify.post(
        '/bulk',
        { schema: BulkCreateTagsSchema, preHandler: adminGuard },
        bulkCreateTags
    );

    done();
};
