import type { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
    userId: number;
}

export interface RefreshTokenPayload {
    userId: number;
    tokenVersion: number;
}

export function createAccessToken(user: User) {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    return jwt.sign({ userId: user.id } satisfies AccessTokenPayload, secret, {
        expiresIn: '15m'
    });
}

export function createRefreshToken(user: User) {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    return jwt.sign(
        {
            userId: user.id,
            tokenVersion: user.tokenVersion!
        } satisfies RefreshTokenPayload,
        secret,
        { expiresIn: '7d' }
    );
}

export async function verifyAccessToken(token: string) {
    let payload: AccessTokenPayload | null = null;
    try {
        payload = jwt.verify(
            token!,
            process.env.ACCESS_TOKEN_SECRET
        ) as unknown as AccessTokenPayload;
        return payload;
    } catch (error) {
        return null;
    }
}
