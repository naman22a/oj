import { performance } from 'node:perf_hooks';

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
import type { ExecutionJobContext } from './execution.worker.ts';
import { getLanguageConfig } from './config/language.registry.ts';
import { logger } from '../../infrastructure/logger.js';

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
    const startedAt = performance.now();
    const attempt = context.attemptsMade + 1;

    const em = await getEM();

    logger.info(
        { submissionId, attempt, maxAttempts: context.attempts },
        'Execution job started'
    );

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
            logger.info(
                {
                    submissionId,
                    status: submission.status
                },
                'Skipping already completed submission'
            );

            return;
        }

        logger.info(
            {
                submissionId,
                userId: submission.userId,
                problemId: submission.problemId,
                language: submission.language
            },
            'Processing submission'
        );

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

        logger.info(
            {
                submissionId,
                problemId: problem.id,
                language: submission.language,
                testCaseCount: testCases.length,
                timeLimitMs: problem.timeLimitMs,
                memoryLimitMb: problem.memoryLimitMb
            },
            'Starting code execution'
        );

        const sandbox = new DockerSandbox();
        const languageConfig = getLanguageConfig(submission.language);

        const executionService = new ExecutionService(
            languageConfig.compiler(sandbox),
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
                memoryLimitMb: problem.memoryLimitMb,
                image: languageConfig.image
            },
            async (status) => {
                submission.status = status;
                await em.flush();

                logger.info(
                    {
                        submissionId,
                        status
                    },
                    'Submission status updated'
                );

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

        const durationMs = Math.round(performance.now() - startedAt);

        logger.info(
            {
                submissionId,
                verdict: result.verdict,
                runtime: result.runtime,
                memory: result.memory,
                testCasesPassed: result.testCasesPassed,
                totalTestCases: result.totalTestCases,
                durationMs
            },
            'Submission execution completed'
        );

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

        logger.info(
            {
                submissionId,
                status: submission.status
            },
            'Submission result persisted and update emitted'
        );

        return result;
    } catch (error) {
        const isFinalAttempt = attempt >= context.attempts;
        const durationMs = Math.round(performance.now() - startedAt);

        logger.error(
            {
                err: error,
                submissionId,
                attempt,
                maxAttempts: context.attempts,
                isFinalAttempt,
                durationMs
            },
            'Submission execution failed'
        );

        if (!isFinalAttempt) {
            logger.warn(
                {
                    submissionId,
                    nextAttempt: attempt + 1,
                    maxAttempts: context.attempts
                },
                'Submission execution will be retried'
            );
        }

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

                logger.error(
                    {
                        submissionId,
                        status: submission.status
                    },
                    'Submission marked as INTERNAL_ERROR after exhausting retries'
                );
            }
        }

        throw error;
    }
}
