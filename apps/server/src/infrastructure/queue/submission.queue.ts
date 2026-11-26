import { executionQueue } from './index.ts';

export async function enqueueSubmission(submissionId: number) {
    return executionQueue.add('execute-submission', { submissionId });
}
