import { executionQueue } from './index.ts';

export async function enqueueSubmission(submissionId: number) {
    return executionQueue.add(
        'execute-submission',
        { submissionId },
        {
            jobId: `submission-${submissionId}`,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: 100,
            removeOnFail: 500
        }
    );
}
