import Fastify from 'fastify';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { getEM } from '../db/index.js';
import { Tag } from '../models/tag.model.js';
import type {
    GetTagsType,
    GetTagType,
    BulkCreateTagsType
} from '../common/schemas/index.ts';

const serializeTag = (tag: Tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug ?? null,
    createdAt: tag.createdAt.toISOString()
});

// GET /api/tags
export const getTags: Fastify.RouteHandler<GetTagsType> = async (
    _req,
    reply
) => {
    try {
        const em = await getEM();
        const tags = await em.find(Tag, {}, { orderBy: { name: 'ASC' } });

        return reply.status(200).send(tags.map(serializeTag));
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

// GET /api/tags/:id
export const getTag: Fastify.RouteHandler<GetTagType> = async (req, reply) => {
    try {
        const id = req.params.id;
        const em = await getEM();
        const tag = await em.findOne(Tag, { id });

        if (!tag) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'tag not found' }]
            });
        }

        return reply.status(200).send(serializeTag(tag));
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

// POST /api/tags/bulk
export const bulkCreateTags: Fastify.RouteHandler<BulkCreateTagsType> = async (
    req,
    reply
) => {
    try {
        const { tags } = req.body;
        const em = await getEM();

        // Check for duplicate names or slugs in request or DB
        const names = tags.map((t) => t.name);
        const slugs = tags
            .map((t) => t.slug)
            .filter((s): s is string => Boolean(s));

        const existing = await em.find(Tag, {
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
                        field: 'tags',
                        message: `tags already exist: ${existing.map((t) => t.name).join(', ')}`
                    }
                ]
            });
        }

        const createdTags = tags.map((t) =>
            em.create(Tag, {
                name: t.name,
                slug: t.slug,
                ...(t.description !== undefined && t.description !== null
                    ? { description: t.description }
                    : {})
            })
        );

        await em.persistAndFlush(createdTags);

        return reply.status(201).send(createdTags.map(serializeTag));
    } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
            return reply.status(409).send({
                ok: false,
                errors: [
                    {
                        field: 'tags',
                        message: 'duplicate tag name or slug'
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
