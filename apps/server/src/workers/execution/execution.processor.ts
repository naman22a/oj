import { getEM } from '../../db/index.ts';
import { SubmissionStatus } from '../../models/enums.ts';
import { Problem } from '../../models/problem.model.ts';
import { Submission } from '../../models/submission.model.ts';
import { TestCase } from '../../models/test-case.model.ts';
import {
    ExecutionService,
    type ExecutionVerdict
} from './execution.service.ts';
import { emitSubmissionUpdate } from '../../infrastructure/socket/emitter.js';
import { DockerSandbox } from './sandbox/docker.sandbox.ts';
import { CppCompiler } from './compiler/cpp.compiler.ts';
import type { ExecutionJobContext } from './execution.worker.ts';

interface ExecutionJobData {
    submissionId: number;
}

const verdictMap: Record<ExecutionVerdict, SubmissionStatus> = {
    ACCEPTED: SubmissionStatus.ACCEPTED,
    WRONG_ANSWER: SubmissionStatus.WRONG_ANSWER,
    TIME_LIMIT_EXCEEDED: SubmissionStatus.TIME_LIMIT_EXCEEDED,
    MEMORY_LIMIT_EXCEEDED: SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
    RUNTIME_ERROR: SubmissionStatus.RUNTIME_ERROR,
    COMPILE_ERROR: SubmissionStatus.COMPILE_ERROR,
    INTERNAL_ERROR: SubmissionStatus.INTERNAL_ERROR
};

export async function processExecution(
    { submissionId }: ExecutionJobData,
    context: ExecutionJobContext = {
        attemptsMade: 0,
        attempts: 1
    }
) {
    const em = await getEM();

    try {
        const submission = await em.findOne(Submission, {
            id: submissionId
        });

        if (!submission) {
            throw new Error(`Submission ${submissionId} not found`);
        }

        // Avoid reprocessing already completed submissions.
        const terminalStatuses = [
            SubmissionStatus.ACCEPTED,
            SubmissionStatus.WRONG_ANSWER,
            SubmissionStatus.TIME_LIMIT_EXCEEDED,
            SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
            SubmissionStatus.RUNTIME_ERROR,
            SubmissionStatus.COMPILE_ERROR
        ];

        if (terminalStatuses.includes(submission.status)) {
            return;
        }

        submission.status = SubmissionStatus.COMPILING;
        await em.flush();

        emitSubmissionUpdate(submission.userId, {
            submissionId: submission.id,
            status: submission.status
        });

        const problem = await em.findOne(Problem, {
            id: submission.problemId
        });

        if (!problem) {
            throw new Error(`Problem ${submission.problemId} not found`);
        }

        // Execute all active judge test cases, not only samples.
        const testCases = await em.find(
            TestCase,
            {
                problem,
                isActive: true
            },
            {
                orderBy: { id: 'ASC' }
            }
        );

        if (testCases.length === 0) {
            throw new Error('No active judge test cases found');
        }

        const sandbox = new DockerSandbox();
        const executionService = new ExecutionService(
            new CppCompiler(sandbox),
            sandbox
        );

        const result = await executionService.execute(
            submission.code,
            testCases.map((testCase) => ({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput
            })),
            {
                timeLimitMs: problem.timeLimitMs,
                memoryLimitMb: problem.memoryLimitMb
            },
            async (status) => {
                submission.status = status;
                await em.flush();

                emitSubmissionUpdate(submission.userId, {
                    submissionId: submission.id,
                    status: submission.status
                });
            }
        );

        submission.status = verdictMap[result.verdict];
        submission.runtime = result.runtime;
        submission.memory = result.memory;
        submission.testCasesPassed = result.testCasesPassed;
        submission.totalTestCases = result.totalTestCases;
        submission.errorMessage = result.errorMessage ?? '';

        await em.flush();

        emitSubmissionUpdate(submission.userId, {
            submissionId: submission.id,
            status: submission.status,
            runtime: submission.runtime,
            memory: submission.memory,
            testCasesPassed: submission.testCasesPassed,
            totalTestCases: submission.totalTestCases,
            errorMessage: submission.errorMessage ?? null,
            results: result.results!
        });

        return result;
    } catch (error) {
        console.error('Submission execution failed:', error);

        const isFinalAttempt = context.attemptsMade + 1 >= context.attempts;

        if (isFinalAttempt) {
            const submission = await em.findOne(Submission, {
                id: submissionId
            });

            if (submission) {
                submission.status = SubmissionStatus.INTERNAL_ERROR;
                submission.errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Unknown execution error';

                await em.flush();

                emitSubmissionUpdate(submission.userId, {
                    submissionId: submission.id,
                    status: submission.status,
                    runtime: submission.runtime!,
                    memory: submission.memory!,
                    testCasesPassed: submission.testCasesPassed,
                    totalTestCases: submission.totalTestCases,
                    errorMessage: submission.errorMessage ?? null
                });
            }
        }

        throw error;
    }
}
