import { getEM } from '../../db/index.ts';
import { Submission } from '../../models/submission.model.ts';

interface ExecutionJobData {
    submissionId: number;
}

export async function processExecution({ submissionId }: ExecutionJobData) {
    const em = await getEM();

    const submission = await em.findOne(Submission, {
        id: submissionId
    });

    if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
    }

    console.log(`Processing submission ${submission.id}`);
    console.log(`Language: ${submission.language}`);
    console.log(`Problem ID: ${submission.problemId}`);

    // TODO: Actual code compilation and execution will come later.
}
