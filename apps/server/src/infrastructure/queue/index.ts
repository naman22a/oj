import { Queue } from 'bullmq';
import { redisConnection } from './redis.config.js';

export const executionQueue = new Queue('execution-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: {
            age: 3600,
            count: 1000
        },
        removeOnFail: {
            age: 24 * 3600
        }
    }
});
