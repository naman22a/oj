import Fastify from 'fastify';
import type {
    RegisterType,
    ConfirmEmailType,
    LoginType,
    LogoutType,
    MeType
} from '../common/schemas/index.js';
import { getEM } from '../db/index.js';
import { User } from '../models/user.model.js';
import argon2 from 'argon2';
import { createConfirmationUrl, sendEmail } from '../services/mail.js';
import { redis } from '../common/redis.js';
import {
    __prod__,
    CONFIRMATION_PREFIX,
    COOKIE_NAME
} from '../common/constants/index.js';
import { createAccessToken, createRefreshToken } from '../services/token.js';

export const postRegister: Fastify.RouteHandler<RegisterType> = async (
    req,
    reply
) => {
    try {
        const { username, email, password } = req.body;
        const em = await getEM();

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

        const em = await getEM();

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

export const postLogin: Fastify.RouteHandler<LoginType> = async (
    req,
    reply
) => {
    try {
        const { email, password } = req.body;
        const em = await getEM();

        // check if user exists
        const user = await em.findOne(User, { email });
        if (!user) {
            return reply.status(400).send({
                accessToken: '',
                errors: [{ field: 'email', message: 'user not found' }]
            });
        }

        // check if password is correct
        const isMatch = await argon2.verify(user.passwordHash, password);
        if (!isMatch) {
            return reply.status(400).send({
                accessToken: '',
                errors: [{ field: 'password', message: 'wrong password' }]
            });
        }

        // check if user is verified
        if (!user.emailVerified) {
            return reply.status(400).send({
                accessToken: '',
                errors: [{ field: 'email', message: 'please verify the email' }]
            });
        }

        // create access and refresh tokens
        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user);

        return reply
            .status(200)
            .setCookie(COOKIE_NAME, refreshToken, {
                httpOnly: true,
                sameSite: 'lax',
                secure: __prod__,
                domain: __prod__
                    ? process.env.COOKIE_DOMAIN!
                    : (undefined as any),
                path: '/'
            })
            .send({ accessToken });
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

export const postLogout: Fastify.RouteHandler<LogoutType> = async (
    req,
    reply
) => {
    try {
        reply
            .clearCookie(COOKIE_NAME, {
                httpOnly: true,
                sameSite: 'lax',
                secure: __prod__,
                domain: __prod__
                    ? process.env.COOKIE_DOMAIN!
                    : (undefined as any),
                path: '/'
            })
            .status(200)
            .send({ ok: true });
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

export const getMe: Fastify.RouteHandler<MeType> = async (req, reply) => {
    try {
        const em = await getEM();

        const user = await em.findOne(User, { id: req.userId! });

        if (!user) {
            return reply.status(404).send({
                ok: false,
                errors: [
                    {
                        field: 'user',
                        message: 'User not found'
                    }
                ]
            });
        }

        return reply.status(200).send(user);
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
