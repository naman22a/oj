import Fastify from 'fastify';
import type { CreateSubmissionType } from '../common/schemas/index.ts';
import { getEM } from '../db/index.ts';
import { Problem } from '../models/problem.model.ts';
import { Submission } from '../models/submission.model.ts';
import { SubmissionStatus } from '../models/enums.ts';
import { enqueueSubmission } from '../infrastructure/queue/submission.queue.ts';
import { emitSubmissionUpdate } from '../infrastructure/socket/emitter.ts';
import { UniqueConstraintViolationException } from '@mikro-orm/core';

// POST /api/submissions/:slug
export const createSubmission: Fastify.RouteHandler<
    CreateSubmissionType
> = async (req, reply) => {
    const problemSlug = req.params.slug;
    const { code, language } = req.body;
    const userId = req.userId!;

    // Read and validate Idempotency-Key.
    const rawKey = req.headers['idempotency-key'];

    if (Array.isArray(rawKey)) {
        return reply.status(400).send({
            ok: false,
            errors: [
                { field: 'idempotencyKey', message: 'Invalid idempotency key' }
            ]
        });
    }

    const idempotencyKey = rawKey?.trim();

    if (
        rawKey !== undefined &&
        (!idempotencyKey || idempotencyKey.length > 128)
    ) {
        return reply.status(400).send({
            ok: false,
            errors: [
                {
                    field: 'idempotencyKey',
                    message:
                        'Idempotency key must be between 1 and 128 characters'
                }
            ]
        });
    }

    if (!code.trim()) {
        return reply.status(400).send({
            ok: false,
            errors: [{ field: 'code', message: 'code is required' }]
        });
    }

    if (!language) {
        return reply.status(400).send({
            ok: false,
            errors: [{ field: 'language', message: 'language is required' }]
        });
    }

    if (!problemSlug) {
        return reply.status(400).send({
            ok: false,
            errors: [{ field: 'problemId', message: 'problemSlug is required' }]
        });
    }

    try {
        const em = await getEM();
        const problem = await em.findOne(Problem, { slug: problemSlug });

        if (!problem) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'problemId', message: 'problem not found' }]
            });
        }

        // Check whether this request was already processed.
        if (idempotencyKey) {
            const existing = await em.findOne(Submission, {
                userId,
                idempotencyKey
            });

            if (existing) {
                const sameRequest =
                    existing.problemId === problem.id &&
                    existing.code === code &&
                    existing.language === language;

                if (!sameRequest) {
                    return reply.status(409).send({
                        ok: false,
                        errors: [
                            {
                                field: 'idempotencyKey',
                                message:
                                    'This idempotency key has already been used with a different request'
                            }
                        ]
                    });
                }

                return reply.status(202).send({
                    ok: true,
                    data: {
                        submissionId: existing.id,
                        status: existing.status
                    }
                });
            }
        }

        const submission = em.create(Submission, {
            userId,
            code,
            language,
            problemId: problem.id,
            status: SubmissionStatus.QUEUED,
            idempotencyKey: idempotencyKey!
        });

        try {
            await em.persistAndFlush(submission);
        } catch (error) {
            // Handle simultaneous requests using the same key.
            if (
                idempotencyKey &&
                error instanceof UniqueConstraintViolationException
            ) {
                const retryEm = await getEM();

                const existing = await retryEm.findOne(Submission, {
                    userId,
                    idempotencyKey
                });

                if (existing) {
                    const sameRequest =
                        existing.problemId === problem.id &&
                        existing.code === code &&
                        existing.language === language;

                    if (!sameRequest) {
                        return reply.status(409).send({
                            ok: false,
                            errors: [
                                {
                                    field: 'idempotencyKey',
                                    message:
                                        'This idempotency key has already been used with a different request'
                                }
                            ]
                        });
                    }

                    return reply.status(202).send({
                        ok: true,
                        data: {
                            submissionId: existing.id,
                            status: existing.status
                        }
                    });
                }
            }

            throw error;
        }

        await enqueueSubmission(submission.id);

        emitSubmissionUpdate(submission.userId, {
            submissionId: submission.id,
            status: submission.status
        });

        return reply.status(202).send({
            ok: true,
            data: {
                submissionId: submission.id,
                status: submission.status
            }
        });
    } catch (error) {
        console.error('Submission creation failed:', error);

        return reply.status(500).send({
            ok: false,
            errors: [
                {
                    field: 'INTERNAL_SERVER_ERROR',
                    message: 'INTERNAL_SERVER_ERROR'
                }
            ]
        });
    }
};

// GET /api/submissions/:id
export const getSubmission: Fastify.RouteHandler<{
    Params: { id: string };
}> = async (req, reply) => {
    const em = await getEM();
    const submissionId = Number(req.params.id);

    const submission = await em.findOne(Submission, {
        id: submissionId,
        userId: req.userId!
    });

    if (!submission) {
        return reply.status(404).send({
            success: false,
            message: 'Submission not found'
        });
    }

    return reply.send({
        success: true,
        data: {
            id: submission.id,
            status: submission.status,
            runtime: submission.runtime,
            memory: submission.memory,
            testCasesPassed: submission.testCasesPassed,
            totalTestCases: submission.totalTestCases,
            errorMessage: submission.errorMessage
        }
    });
};

// GET /api/submissions
export const getSubmissionsHistory: Fastify.RouteHandler = async (
    req,
    reply
) => {
    const em = await getEM();

    const submissions = await em.find(Submission, {
        userId: req.userId!
    });

    return reply.status(200).send(submissions);
};

// GET /api/submissions/history/:id
export const getSubmissionProblemHistory: Fastify.RouteHandler<{
    Params: { id: string };
}> = async (req, reply) => {
    const em = await getEM();

    const submissions = await em.find(
        Submission,
        {
            userId: req.userId!,
            problemId: parseInt(req.params.id!, 10)
        },
        {
            orderBy: {
                submittedAt: 'DESC'
            }
        }
    );

    return reply.status(200).send(submissions);
};
