import Fastify from 'fastify';
import type { CreateSubmissionType } from '../common/schemas/index.ts';
import { getEM } from '../db/index.ts';
import { Problem } from '../models/problem.model.ts';
import { Submission } from '../models/submission.model.ts';
import { SubmissionStatus } from '../models/enums.ts';
import { enqueueSubmission } from '../infrastructure/queue/submission.queue.ts';

// POST /api/submissions/:slug
export const createSubmission: Fastify.RouteHandler<
    CreateSubmissionType
> = async (req, reply) => {
    const problemSlug = req.params.slug;
    const { code, language } = req.body;

    // validation
    if (!code.trim()) {
        return {
            jobId: null,
            errors: [{ field: 'code', message: 'code is required' }]
        };
    }
    if (!language) {
        return {
            jobId: null,
            errors: [{ field: 'language', message: 'language is required' }]
        };
    }
    if (!problemSlug) {
        return {
            jobId: null,
            errors: [{ field: 'problemId', message: 'problemSlug is required' }]
        };
    }

    try {
        const em = await getEM();
        const problemExists = await em.findOne(Problem, { slug: problemSlug });

        if (!problemExists) {
            return {
                jobId: null,
                errors: [{ field: 'problemId', message: 'problem not found' }]
            };
        }

        const submission = em.create(Submission, {
            userId: req.userId!,
            code,
            language,
            problemId: problemExists.id,
            status: SubmissionStatus.QUEUED
        });

        await em.persistAndFlush(submission);

        await enqueueSubmission(submission.id);

        return reply.status(202).send({
            success: true,
            data: {
                submissionId: submission.id,
                status: submission.status
            }
        });
    } catch (error) {
        console.error(error);
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
