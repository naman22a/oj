import { Queue } from 'bullmq';
import { redisConnection } from './redis.config.js';

export const executionQueue = new Queue('execution-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: {
            age: 3600,
            count: 100
        },
        removeOnFail: {
            age: 24 * 3600,
            count: 500
        }
    }
});
