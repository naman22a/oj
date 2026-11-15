import Fastify from 'fastify';
import type {
    RegisterType,
    ConfirmEmailType
} from '../common/schemas/index.js';
import { getORM } from '../db/index.js';
import { User } from '../models/user.model.js';
import argon2 from 'argon2';
import { createConfirmationUrl, sendEmail } from '../services/mail.js';
import { redis } from '../common/redis.js';
import { CONFIRMATION_PREFIX } from '../common/constants/index.js';

export const postRegister: Fastify.RouteHandler<RegisterType> = async (
    req,
    reply
) => {
    try {
        const { username, email, password } = req.body;
        const orm = await getORM();
        const em = orm.em.fork();

        // check if username already taken
        const usernameExists = await em.findOne(User, { username });
        if (usernameExists) {
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'username',
                        message: 'username alreay taken'
                    }
                ]
            });
        }

        // check if user already exists in DB
        const user = await em.findOne(User, { email });
        if (user) {
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'email',
                        message: 'email already in use'
                    }
                ]
            });
        }

        // password hashing
        const passwordHash = await argon2.hash(password);

        // save user to DB
        const newUser = em.create(User, {
            username,
            email,
            passwordHash
        });
        await em.persistAndFlush(newUser);

        // send confirmation email
        const url = await createConfirmationUrl(newUser.id);
        await sendEmail(email, url, 'Email Verification');

        return reply.status(201).send({ ok: true });
    } catch (error) {
        req.log.error(error);
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

export const postConfirmEmail: Fastify.RouteHandler<ConfirmEmailType> = async (
    req,
    reply
) => {
    try {
        // validation
        const token = req.params.token;
        if (!token) {
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'token',
                        message: 'token is required'
                    }
                ]
            });
        }

        const orm = await getORM();
        const em = orm.em.fork();

        // check if token exists in redis
        const userId = await redis.get(CONFIRMATION_PREFIX + token);
        if (!userId) return reply.status(400).send({ ok: false });

        // check if user exists
        const user = await em.findOne(User, { id: parseInt(userId, 10) });
        if (!user) {
            return reply.status(400).send({ ok: false });
        }

        // verify the user
        const count = await em.nativeUpdate(
            User,
            { id: user.id },
            { emailVerified: true }
        );

        // check if no user is updated
        if (count === 0) return reply.status(400).send({ ok: false });

        // delete token from redis
        await redis.del(CONFIRMATION_PREFIX + token);

        return reply.status(200).send({ ok: true });
    } catch (error) {
        req.log.error(error);
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
