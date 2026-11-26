import { Queue, QueueEvents } from 'bullmq';
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { redisConnection } from '../../src/infrastructure/queue/redis.config.js';
import { createExecutionWorker } from '../../src/workers/execution/execution.worker.js';

const queueName = `execution-worker-test-${process.pid}`;

type Processor = (data: { submissionId: number }) => Promise<unknown>;

describe('Execution worker integration', () => {
    let queue: Queue;
    let queueEvents: QueueEvents;
    let worker: ReturnType<typeof createExecutionWorker>;

    async function setup(processor: Processor) {
        queue = new Queue(queueName, {
            connection: redisConnection
        });

        queueEvents = new QueueEvents(queueName, {
            connection: redisConnection
        });

        worker = createExecutionWorker(processor, queueName);

        await Promise.all([
            queue.waitUntilReady(),
            queueEvents.waitUntilReady(),
            worker.waitUntilReady()
        ]);
    }

    beforeEach(async () => {
        // Each test starts with a fresh queue and worker.
    });

    afterEach(async () => {
        if (worker) await worker.close();
        if (queueEvents) await queueEvents.close();

        if (queue) {
            await queue.obliterate({ force: true });
            await queue.close();
        }
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('processes a valid execution job', async () => {
        const processor = vi.fn<Processor>().mockResolvedValue(undefined);
        await setup(processor);

        const job = await queue.add('execute-submission', {
            submissionId: 101
        });

        await job.waitUntilFinished(queueEvents, 10000);

        expect(processor).toHaveBeenCalledTimes(1);
        expect(processor).toHaveBeenCalledWith(
            { submissionId: 101 },
            {
                attemptsMade: 0,
                attempts: 1
            }
        );
    });

    it('retries a failed job and succeeds on a subsequent attempt', async () => {
        let attempts = 0;

        const processor = vi.fn<Processor>().mockImplementation(async () => {
            attempts++;

            if (attempts < 3) {
                throw new Error('Temporary execution failure');
            }
        });

        await setup(processor);

        const job = await queue.add(
            'execute-submission',
            { submissionId: 102 },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 10
                }
            }
        );

        await job.waitUntilFinished(queueEvents, 10000);

        expect(processor).toHaveBeenCalledTimes(3);

        const completedJob = await queue.getJob(job.id!);
        expect(await completedJob?.getState()).toBe('completed');
    });

    it('marks a job as failed when the processor keeps throwing', async () => {
        const processor = vi
            .fn<Processor>()
            .mockRejectedValue(new Error('Persistent execution failure'));

        await setup(processor);

        const job = await queue.add(
            'execute-submission',
            { submissionId: 103 },
            {
                attempts: 3,
                backoff: {
                    type: 'fixed',
                    delay: 10
                }
            }
        );

        await expect(job.waitUntilFinished(queueEvents, 10000)).rejects.toThrow(
            'Persistent execution failure'
        );

        expect(processor).toHaveBeenCalledTimes(3);

        const failedJob = await queue.getJob(job.id!);
        expect(await failedJob?.getState()).toBe('failed');
    });

    it('rejects jobs with unknown names', async () => {
        const processor = vi.fn<Processor>().mockResolvedValue(undefined);
        await setup(processor);

        const job = await queue.add('unknown-job', { submissionId: 104 });

        await expect(job.waitUntilFinished(queueEvents, 10000)).rejects.toThrow(
            'Unknown job: unknown-job'
        );

        expect(processor).not.toHaveBeenCalled();

        const failedJob = await queue.getJob(job.id!);
        expect(await failedJob?.getState()).toBe('failed');
    });

    it('does not enqueue the same job ID twice', async () => {
        const processor = vi.fn<Processor>().mockResolvedValue(undefined);
        await setup(processor);

        const firstJob = await queue.add(
            'execute-submission',
            { submissionId: 105 },
            { jobId: 'duplicate-submission-105' }
        );

        await firstJob.waitUntilFinished(queueEvents, 10000);

        const secondJob = await queue.add(
            'execute-submission',
            { submissionId: 105 },
            { jobId: 'duplicate-submission-105' }
        );

        expect(secondJob.id).toBe(firstJob.id);
        expect(await secondJob.getState()).toBe('completed');
        expect(processor).toHaveBeenCalledTimes(1);
    });

    it('processes jobs concurrently up to the worker concurrency limit', async () => {
        let activeJobs = 0;
        let maximumConcurrentJobs = 0;

        const processor: Processor = async () => {
            activeJobs++;
            maximumConcurrentJobs = Math.max(maximumConcurrentJobs, activeJobs);

            await new Promise((resolve) => setTimeout(resolve, 150));

            activeJobs--;
        };

        await setup(processor);

        const jobs = await Promise.all(
            [201, 202, 203, 204].map((submissionId) =>
                queue.add('execute-submission', { submissionId })
            )
        );

        await Promise.all(
            jobs.map((job) => job.waitUntilFinished(queueEvents, 10000))
        );

        expect(maximumConcurrentJobs).toBe(2);
    });
});
