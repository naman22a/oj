import type {
    FastifyInstance,
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    FastifyBaseLogger
} from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
    BulkCreateCompaniesSchema,
    GetCompaniesSchema,
    GetCompanySchema
} from '../common/schemas/index.ts';
import {
    bulkCreateCompanies,
    getCompanies,
    getCompany
} from '../controllers/companies.controller.ts';
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
    fastify.addHook('preHandler', authGuard);
    fastify.get('/', { schema: GetCompaniesSchema }, getCompanies);
    fastify.get('/:id', { schema: GetCompanySchema }, getCompany);
    fastify.post(
        '/bulk',
        { schema: BulkCreateCompaniesSchema, preHandler: adminGuard },
        bulkCreateCompanies
    );

    done();
};
