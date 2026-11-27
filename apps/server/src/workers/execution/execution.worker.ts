import { Worker } from 'bullmq';

import { redisConnection } from '../../infrastructure/queue/redis.config.ts';
import { logger } from '../../infrastructure/logger.js';
import { processExecution } from './execution.processor.ts';

interface ExecutionJobData {
    submissionId: number;
}

export interface ExecutionJobContext {
    attemptsMade: number;
    attempts: number;
}

type ExecutionProcessor = (
    data: ExecutionJobData,
    context: ExecutionJobContext
) => Promise<unknown>;

export function createExecutionWorker(
    processor: ExecutionProcessor = processExecution,
    queueName = 'execution-queue'
) {
    const worker = new Worker(
        queueName,
        async (job) => {
            if (job.name !== 'execute-submission') {
                logger.error(
                    {
                        queueName,
                        jobId: job.id,
                        jobName: job.name
                    },
                    'Unknown job received by execution worker'
                );

                throw new Error(`Unknown job: ${job.name}`);
            }

            logger.info(
                {
                    queueName,
                    jobId: job.id,
                    submissionId: job.data.submissionId,
                    attempt: job.attemptsMade + 1,
                    maxAttempts: job.opts.attempts ?? 1
                },
                'Execution job picked up by worker'
            );

            return processor(job.data, {
                attemptsMade: job.attemptsMade,
                attempts: job.opts.attempts || 1
            });
        },
        {
            connection: redisConnection,
            concurrency: 2
        }
    );

    // Worker started and ready to process jobs.
    worker.on('ready', () => {
        logger.info(
            { queueName },
            'Execution worker connected to Redis and ready'
        );
    });

    // Job successfully completed.
    worker.on('completed', (job) => {
        logger.info(
            {
                queueName,
                jobId: job.id,
                submissionId: job.data.submissionId
            },
            'Execution job completed'
        );
    });

    // Job failed or exhausted its attempts.
    worker.on('failed', (job, error) => {
        logger.error(
            {
                err: error,
                queueName,
                jobId: job?.id,
                submissionId: job?.data?.submissionId,
                attemptsMade: job?.attemptsMade,
                maxAttempts: job?.opts.attempts ?? 1
            },
            'Execution job failed'
        );
    });

    // Job was detected as stalled and may be processed again.
    worker.on('stalled', (jobId) => {
        logger.warn(
            {
                queueName,
                jobId
            },
            'Execution job stalled'
        );
    });

    // Worker-level errors, such as Redis connection failures.
    worker.on('error', (error) => {
        logger.error(
            {
                err: error,
                queueName
            },
            'Execution worker encountered an error'
        );
    });

    // Worker is shutting down.
    worker.on('closing', () => {
        logger.info({ queueName }, 'Execution worker shutting down');
    });

    return worker;
}
