import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HTTPServer } from 'node:http';

import { verifyAccessToken } from '../../services/token.js';

export async function initializeSocket(server: HTTPServer) {
    const pubClient = new Redis(process.env.REDIS_URL!);
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.ping(), subClient.ping()]);

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true
        }
    });

    io.adapter(createAdapter(pubClient, subClient));

    // Authenticate every socket connection.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth['accessToken'];

            if (typeof token !== 'string' || !token) {
                return next(new Error('Unauthorized'));
            }

            const payload = await verifyAccessToken(token);

            if (!payload || !Number.isInteger(payload.userId)) {
                return next(new Error('Unauthorized'));
            }

            socket.data.userId = payload.userId;
            next();
        } catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId as number;

        socket.join(`user:${userId}`);

        console.log(`User ${userId} connected to Socket.IO`);

        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected`);
        });
    });

    return io;
}
