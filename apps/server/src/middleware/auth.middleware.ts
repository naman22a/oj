import { type preHandlerHookHandler } from 'fastify';
import type { AccessTokenPayload } from '../services/token.js';
import jwt from 'jsonwebtoken';

export const authGuard: preHandlerHookHandler = async (req, reply) => {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const authorization = req.headers['authorization'];
    if (!authorization) {
        return reply.status(401).send({
            error: 'unauthorized',
            message: 'missing authorization header'
        });
    }

    // verify the access token and get payload
    let payload: AccessTokenPayload | null = null;
    try {
        const token = authorization.split(' ')[1];
        payload = jwt.verify(token!, secret) as unknown as AccessTokenPayload;
    } catch (error) {
        return reply.status(401).send({
            error: 'unauthorized',
            message: 'invalid token'
        });
    }

    // persist the user
    req.userId = payload.userId;
};
