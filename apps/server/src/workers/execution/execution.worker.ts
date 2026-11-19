import { Worker } from 'bullmq';
import { redisConnection } from '../../infrastructure/queue/redis.config.ts';
import { processExecution } from './execution.processor.ts';

const worker = new Worker(
    'execution-queue',
    async (job) => {
        if (job.name !== 'execute-submission') {
            throw new Error(`Unknown job: ${job.name}`);
        }

        await processExecution(job.data);
    },
    {
        connection: redisConnection,
        concurrency: 2
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
});

console.log('Execution worker started');

async function shutdown() {
    await worker.close();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
