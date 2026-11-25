import { Redis } from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';

const redis = new Redis(process.env.REDIS_URL!);
const emitter = new Emitter(redis);

export interface SubmissionUpdate {
    submissionId: number;
    status: string;
    runtime?: number;
    memory?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
    errorMessage?: string | null;
    results?: {
        output: string;
        expectedOutput: string;
    }[];
}

export function emitSubmissionUpdate(userId: number, data: SubmissionUpdate) {
    emitter.to(`user:${userId}`).emit('submission:updated', data);
}

export async function closeSubmissionEmitter() {
    await redis.quit();
}
