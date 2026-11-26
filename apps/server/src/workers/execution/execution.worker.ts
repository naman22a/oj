import { Worker } from 'bullmq';
import { redisConnection } from '../../infrastructure/queue/redis.config.ts';
import { processExecution } from './execution.processor.ts';

interface ExecutionJobData {
    submissionId: number;
}

type ExecutionProcessor = (data: ExecutionJobData) => Promise<unknown>;

export function createExecutionWorker(
    processor: ExecutionProcessor = processExecution,
    queueName = 'execution-queue'
) {
    const worker = new Worker(
        queueName,
        async (job) => {
            if (job.name !== 'execute-submission') {
                throw new Error(`Unknown job: ${job.name}`);
            }

            return processor(job.data);
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

    return worker;
}
