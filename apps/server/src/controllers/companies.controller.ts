import Fastify from 'fastify';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { getEM } from '../db/index.js';
import { Company } from '../models/company.model.js';
import type {
    GetCompaniesType,
    GetCompanyType,
    BulkCreateCompaniesType
} from '../common/schemas/index.ts';

const serializeCompany = (company: Company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug ?? null,
    logoUrl: company.logoUrl ?? null,
    createdAt: company.createdAt.toISOString()
});

// GET /api/companies
export const getCompanies: Fastify.RouteHandler<GetCompaniesType> = async (
    _req,
    reply
) => {
    try {
        const em = await getEM();
        const companies = await em.find(
            Company,
            {},
            { orderBy: { name: 'ASC' } }
        );

        return reply.status(200).send(companies.map(serializeCompany));
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            ok: false,
            errors: [
                {
                    field: 'INTERNAL_SERVER_ERROR',
                    message: 'INTERNAL_SERVER_ERROR'
                }
            ]
        });
    }
};

// GET /api/companies/:id
export const getCompany: Fastify.RouteHandler<GetCompanyType> = async (
    req,
    reply
) => {
    try {
        const id = req.params.id;
        const em = await getEM();
        const company = await em.findOne(Company, { id });

        if (!company) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'company not found' }]
            });
        }

        return reply.status(200).send(serializeCompany(company));
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
            ok: false,
            errors: [
                {
                    field: 'INTERNAL_SERVER_ERROR',
                    message: 'INTERNAL_SERVER_ERROR'
                }
            ]
        });
    }
};

// POST /api/companies/bulk
export const bulkCreateCompanies: Fastify.RouteHandler<
    BulkCreateCompaniesType
> = async (req, reply) => {
    try {
        const { companies } = req.body;
        const em = await getEM();

        const names = companies.map((c) => c.name);
        const slugs = companies
            .map((c) => c.slug)
            .filter((s): s is string => Boolean(s));

        const existing = await em.find(Company, {
            $or: [
                { name: { $in: names } },
                ...(slugs.length ? [{ slug: { $in: slugs } }] : [])
            ]
        });

        if (existing.length > 0) {
            return reply.status(409).send({
                ok: false,
                errors: [
                    {
                        field: 'companies',
                        message: `companies already exist: ${existing.map((c) => c.name).join(', ')}`
                    }
                ]
            });
        }

        const createdCompanies = companies.map((c) =>
            em.create(Company, {
                name: c.name,
                slug: c.slug,
                ...(c.logoUrl !== undefined && c.logoUrl !== null
                    ? { logoUrl: c.logoUrl }
                    : {})
            })
        );

        await em.persistAndFlush(createdCompanies);

        return reply.status(201).send(createdCompanies.map(serializeCompany));
    } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
            return reply.status(409).send({
                ok: false,
                errors: [
                    {
                        field: 'companies',
                        message: 'duplicate company name or slug'
                    }
                ]
            });
        }

        console.error(error);
        return reply.status(500).send({
            ok: false,
            errors: [
                {
                    field: 'INTERNAL_SERVER_ERROR',
                    message: 'INTERNAL_SERVER_ERROR'
                }
            ]
        });
    }
};
