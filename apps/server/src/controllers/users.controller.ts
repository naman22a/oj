import Fastify from 'fastify';
import { getEM } from '../db/index.ts';
import type { GetUsersType, GetUserType } from '../common/schemas/index.ts';
import { User } from '../models/user.model.ts';

export const getUsers: Fastify.RouteHandler<GetUsersType> = async (
    _req,
    reply
) => {
    try {
        const em = await getEM();

        const users = await em.find(User, {});

        return reply.status(200).send(
            users.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,

                fullName: user.fullName ?? null,
                avatarUrl: user.avatarUrl ?? null,
                bio: user.bio ?? null,
                githubUrl: user.githubUrl ?? null,
                linkedinUrl: user.linkedinUrl ?? null,
                websiteUrl: user.websiteUrl ?? null,

                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString()
            }))
        );
    } catch (error) {
        console.error(error);
        reply.status(500).send({
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

export const getUser: Fastify.RouteHandler<GetUserType> = async (
    req,
    reply
) => {
    try {
        const id = req.params.id;
        const em = await getEM();

        const user = await em.findOne(User, { id });

        if (!user) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'user not found' }]
            });
        }

        return reply.status(200).send({
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,

            fullName: user.fullName ?? null,
            avatarUrl: user.avatarUrl ?? null,
            bio: user.bio ?? null,
            githubUrl: user.githubUrl ?? null,
            linkedinUrl: user.linkedinUrl ?? null,
            websiteUrl: user.websiteUrl ?? null,

            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
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
