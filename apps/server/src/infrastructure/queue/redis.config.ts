import type { ConnectionOptions, QueueBaseOptions } from 'bullmq';

export const redisConnection: QueueBaseOptions<ConnectionOptions>['connection'] =
    {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: null
    };
