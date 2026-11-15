import Fastify from 'fastify';
import { getEM } from '../db/index.ts';
import { Problem } from '../models/problem.model.ts';
import type {
    CreateProblemType,
    DeleteProblemType,
    GetProblemsType,
    GetProblemType,
    UpdateProblemType
} from '../common/schemas/index.ts';
import { UniqueConstraintViolationException, wrap } from '@mikro-orm/core';
import type { Static } from '@sinclair/typebox';
import type { CommentSchema } from '../common/schemas/index.ts';
import type { Comment } from '../models/comment.model.ts';
import { Tag } from '../models/tag.model.ts';
import { Company } from '../models/company.model.ts';
import { ProblemTag } from '../models/problem-tag.model.ts';
import { ProblemCompany } from '../models/problem-company.model.ts';
import { TestCase } from '../models/test-case.model.ts';
import { Editorial } from '../models/editorial.model.ts';

type CommentDTO = Static<typeof CommentSchema>;

const serializeComment = (c: Comment, problemId: number): CommentDTO => ({
    id: c.id,
    problemId,
    userId: c.userId,
    parentId: c.parent?.id ?? null,
    title: c.title ?? null,
    content: c.content,
    isSolution: c.isSolution,
    language: c.language ?? null,
    upvotes: c.upvotes,
    downvotes: c.downvotes,
    isPinned: c.isPinned,
    isDeleted: c.isDeleted,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    replies: c.replies.isInitialized()
        ? c.replies
              .getItems()
              .map((reply) => serializeComment(reply, problemId))
        : []
});

// GET /api/problems
export const getProblems: Fastify.RouteHandler<GetProblemsType> = async (
    _req,
    reply
) => {
    try {
        const em = await getEM();
        const problems = await em.find(Problem, {});

        const serializedProblems = problems.map((problem) => ({
            ...problem,
            constraints: problem.constraints ?? '',
            createdAt: problem.createdAt.toISOString(),
            updatedAt: problem.updatedAt.toISOString()
        }));

        return reply.status(200).send(serializedProblems);
    } catch (error) {
        console.error(error);
        reply.status(500).send({
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

// GET /api/problems/:id
export const getProblem: Fastify.RouteHandler<GetProblemType> = async (
    req,
    reply
) => {
    try {
        const id = req.params.id;
        const em = await getEM();
        const problem = await em.findOne(
            Problem,
            { id },
            {
                populate: [
                    'problemTags.tag',
                    'problemCompanies.company',
                    'testCases',
                    'editorials',
                    'comments',
                    'bookmarks',
                    'problemLikes'
                ]
            }
        );

        if (!problem) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'problem not found' }]
            });
        }

        const serializedProblem = {
            ...wrap(problem).toObject(),
            constraints: problem.constraints ?? '',
            createdAt: problem.createdAt.toISOString(),
            updatedAt: problem.updatedAt.toISOString(),
            problemTags: problem.problemTags.getItems().map((pt) => ({
                problemId: problem.id,
                tagId: pt.tag.id,
                tag: {
                    id: pt.tag.id,
                    name: pt.tag.name,
                    ...('slug' in pt.tag && pt.tag.slug !== undefined
                        ? { slug: pt.tag.slug }
                        : {})
                }
            })),
            problemCompanies: problem.problemCompanies.getItems().map((pc) => ({
                problemId: problem.id,
                companyId: pc.company.id,
                frequency: pc.frequency,
                lastAskedDate: pc.lastAskedDate
                    ? pc.lastAskedDate.toISOString().split('T')[0]!
                    : null,
                company: {
                    id: pc.company.id,
                    name: pc.company.name,
                    ...('slug' in pc.company && pc.company.slug !== undefined
                        ? { slug: pc.company.slug }
                        : {})
                }
            })),
            testCases: problem.testCases
                .getItems()
                .map((tc) => ({
                    id: tc.id,
                    problemId: problem.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isSample: tc.isSample,
                    isActive: tc.isActive,
                    explanation: tc.explanation ?? null,
                    createdAt: tc.createdAt.toISOString()
                }))
                .filter((tc) => tc.isSample),
            editorials: problem.editorials.getItems().map((ed) => ({
                id: ed.id,
                problemId: problem.id,
                title: ed.title,
                approach: ed.approach ?? null,
                content: ed.content,
                codeSnippets: ed.codeSnippets ?? null,
                timeComplexity: ed.timeComplexity ?? null,
                spaceComplexity: ed.spaceComplexity ?? null,
                isOfficial: ed.isOfficial,
                createdById: ed.createdById,
                createdAt: ed.createdAt.toISOString(),
                updatedAt: ed.updatedAt.toISOString()
            })),
            comments: problem.comments
                .getItems()
                .map((c) => serializeComment(c, problem.id)),
            bookmarks: problem.bookmarks.getItems().map((b) => ({
                userId: b.userId,
                problemId: problem.id,
                notes: b.notes ?? null,
                createdAt: b.createdAt.toISOString()
            })),
            problemLikes: problem.problemLikes.getItems().map((pl) => ({
                userId: pl.userId,
                problemId: problem.id,
                isLike: pl.isLike,
                createdAt: pl.createdAt.toISOString()
            }))
        };

        return reply.status(200).send(serializedProblem);
    } catch (error) {
        console.error(error);
        reply.status(500).send({
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

// POST /api/problems
export const createProblem: Fastify.RouteHandler<CreateProblemType> = async (
    req,
    reply
) => {
    try {
        const {
            title,
            slug,
            description,
            difficulty,
            constraints,
            hints,
            similarProblems,
            createdById,
            tagIds,
            companies,
            testCases,
            editorials
        } = req.body;

        const em = await getEM();

        // 1. Check for duplicate slug up front
        const existingSlug = await em.findOne(Problem, { slug });
        if (existingSlug) {
            return reply.status(409).send({
                ok: false,
                errors: [{ field: 'slug', message: 'slug already exists' }]
            });
        }

        // 2. Validate referenced Tag IDs and Company IDs exist
        const uniqueTagIds = [...new Set(tagIds ?? [])];
        const tags = uniqueTagIds.length
            ? await em.find(Tag, { id: { $in: uniqueTagIds } })
            : [];

        if (tags.length !== uniqueTagIds.length) {
            const foundIds = new Set(tags.map((t) => t.id));
            const missingIds = uniqueTagIds.filter((id) => !foundIds.has(id));
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'tagIds',
                        message: `invalid tag IDs: ${missingIds.join(', ')}`
                    }
                ]
            });
        }

        const uniqueCompanyIds = [
            ...new Set((companies ?? []).map((c) => c.companyId))
        ];
        const companyEntities = uniqueCompanyIds.length
            ? await em.find(Company, { id: { $in: uniqueCompanyIds } })
            : [];

        if (companyEntities.length !== uniqueCompanyIds.length) {
            const foundIds = new Set(companyEntities.map((c) => c.id));
            const missingIds = uniqueCompanyIds.filter(
                (id) => !foundIds.has(id)
            );
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'companies',
                        message: `invalid company IDs: ${missingIds.join(', ')}`
                    }
                ]
            });
        }

        const companyMap = new Map(companyEntities.map((c) => [c.id, c]));

        // 3. Create the Problem entity
        const problem = em.create(Problem, {
            title,
            slug,
            description,
            difficulty: difficulty as any,
            ...(constraints !== undefined && constraints !== null
                ? { constraints }
                : {}),
            hints: hints ?? [],
            similarProblems: similarProblems ?? [],
            createdById
        });

        // 4. Create child relations attached to the new problem
        const createdTags = tags.map((tag) =>
            em.create(ProblemTag, { problem, tag })
        );

        const createdCompanies = (companies ?? []).map((compInput) =>
            em.create(ProblemCompany, {
                problem,
                company: companyMap.get(compInput.companyId)!,
                frequency: compInput.frequency ?? 1,
                ...(compInput.lastAskedDate
                    ? { lastAskedDate: new Date(compInput.lastAskedDate) }
                    : {})
            })
        );

        const createdTestCases = (testCases ?? []).map((tcInput) =>
            em.create(TestCase, {
                problem,
                input: tcInput.input,
                expectedOutput: tcInput.expectedOutput,
                isSample: tcInput.isSample ?? false,
                isActive: tcInput.isActive ?? true,
                ...(tcInput.explanation !== undefined &&
                tcInput.explanation !== null
                    ? { explanation: tcInput.explanation }
                    : {})
            })
        );

        const createdEditorials = (editorials ?? []).map((edInput) =>
            em.create(Editorial, {
                problem,
                title: edInput.title,
                content: edInput.content,
                isOfficial: edInput.isOfficial ?? true,
                createdById: edInput.createdById,
                ...(edInput.approach !== undefined && edInput.approach !== null
                    ? { approach: edInput.approach }
                    : {}),
                ...(edInput.codeSnippets !== undefined &&
                edInput.codeSnippets !== null
                    ? { codeSnippets: edInput.codeSnippets }
                    : {}),
                ...(edInput.timeComplexity !== undefined &&
                edInput.timeComplexity !== null
                    ? { timeComplexity: edInput.timeComplexity }
                    : {}),
                ...(edInput.spaceComplexity !== undefined &&
                edInput.spaceComplexity !== null
                    ? { spaceComplexity: edInput.spaceComplexity }
                    : {})
            })
        );

        // 5. Persist everything in a single transaction
        await em.persistAndFlush([
            problem,
            ...createdTags,
            ...createdCompanies,
            ...createdTestCases,
            ...createdEditorials
        ]);

        // 6. Serialize response matching ExtendedProblemSchema & exactOptionalPropertyTypes
        const serializedProblem = {
            ...wrap(problem).toObject(),
            constraints: problem.constraints ?? '',
            createdAt: problem.createdAt.toISOString(),
            updatedAt: problem.updatedAt.toISOString(),
            problemTags: createdTags.map((pt) => ({
                problemId: problem.id,
                tagId: pt.tag.id,
                tag: {
                    id: pt.tag.id,
                    name: pt.tag.name,
                    ...('slug' in pt.tag && pt.tag.slug !== undefined
                        ? { slug: pt.tag.slug }
                        : {})
                }
            })),
            problemCompanies: createdCompanies.map((pc) => ({
                problemId: problem.id,
                companyId: pc.company.id,
                frequency: pc.frequency,
                lastAskedDate: pc.lastAskedDate
                    ? pc.lastAskedDate.toISOString().split('T')[0]!
                    : null,
                company: {
                    id: pc.company.id,
                    name: pc.company.name,
                    ...('slug' in pc.company && pc.company.slug !== undefined
                        ? { slug: pc.company.slug }
                        : {})
                }
            })),
            testCases: createdTestCases.map((tc) => ({
                id: tc.id,
                problemId: problem.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: tc.isSample,
                isActive: tc.isActive,
                explanation: tc.explanation ?? null,
                createdAt: tc.createdAt.toISOString()
            })),
            editorials: createdEditorials.map((ed) => ({
                id: ed.id,
                problemId: problem.id,
                title: ed.title,
                approach: ed.approach ?? null,
                content: ed.content,
                codeSnippets: ed.codeSnippets ?? null,
                timeComplexity: ed.timeComplexity ?? null,
                spaceComplexity: ed.spaceComplexity ?? null,
                isOfficial: ed.isOfficial,
                createdById: ed.createdById,
                createdAt: ed.createdAt.toISOString(),
                updatedAt: ed.updatedAt.toISOString()
            })),
            comments: [],
            bookmarks: [],
            problemLikes: []
        };

        return reply.status(201).send(serializedProblem);
    } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
            return reply.status(409).send({
                ok: false,
                errors: [{ field: 'slug', message: 'slug already exists' }]
            });
        }

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

// PUT /api/problems/:id
export const updateProblem: Fastify.RouteHandler<UpdateProblemType> = async (
    req,
    reply
) => {
    try {
        const id = req.params.id;
        const {
            title,
            slug,
            description,
            difficulty,
            constraints,
            hints,
            similarProblems,
            tagIds,
            companies,
            testCases,
            editorials
        } = req.body;

        const em = await getEM();

        // 1. Load existing problem and its mutable child collections
        const problem = await em.findOne(
            Problem,
            { id },
            {
                populate: [
                    'problemTags.tag',
                    'problemCompanies.company',
                    'testCases',
                    'editorials',
                    'comments',
                    'bookmarks',
                    'problemLikes'
                ]
            }
        );

        if (!problem) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'problem not found' }]
            });
        }

        // 2. Check slug uniqueness if slug changed
        if (slug !== problem.slug) {
            const existingSlug = await em.findOne(Problem, {
                slug,
                id: { $ne: id }
            });
            if (existingSlug) {
                return reply.status(409).send({
                    ok: false,
                    errors: [{ field: 'slug', message: 'slug already exists' }]
                });
            }
        }

        // 3. Validate referenced Tag IDs and Company IDs exist
        const uniqueTagIds = [...new Set(tagIds ?? [])];
        const tags = uniqueTagIds.length
            ? await em.find(Tag, { id: { $in: uniqueTagIds } })
            : [];

        if (tags.length !== uniqueTagIds.length) {
            const foundIds = new Set(tags.map((t) => t.id));
            const missingIds = uniqueTagIds.filter((tid) => !foundIds.has(tid));
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'tagIds',
                        message: `invalid tag IDs: ${missingIds.join(', ')}`
                    }
                ]
            });
        }

        const uniqueCompanyIds = [
            ...new Set((companies ?? []).map((c) => c.companyId))
        ];
        const companyEntities = uniqueCompanyIds.length
            ? await em.find(Company, { id: { $in: uniqueCompanyIds } })
            : [];

        if (companyEntities.length !== uniqueCompanyIds.length) {
            const foundIds = new Set(companyEntities.map((c) => c.id));
            const missingIds = uniqueCompanyIds.filter(
                (cid) => !foundIds.has(cid)
            );
            return reply.status(400).send({
                ok: false,
                errors: [
                    {
                        field: 'companies',
                        message: `invalid company IDs: ${missingIds.join(', ')}`
                    }
                ]
            });
        }

        const companyMap = new Map(companyEntities.map((c) => [c.id, c]));

        // 4. Update scalar fields (full PUT replacement)
        problem.title = title;
        problem.slug = slug;
        problem.description = description;
        problem.difficulty = difficulty as any;
        problem.constraints = (constraints as any) ?? undefined;
        problem.hints = hints ?? [];
        problem.similarProblems = similarProblems ?? [];

        // 5. Replace mutable child collections (orphan removal deletes old rows)
        em.remove(problem.problemTags.getItems());
        problem.problemTags.removeAll();
        const updatedTags = tags.map((tag) => {
            const pt = em.create(ProblemTag, { problem, tag });
            problem.problemTags.add(pt);
            return pt;
        });

        em.remove(problem.problemCompanies.getItems());
        problem.problemCompanies.removeAll();
        const updatedCompanies = (companies ?? []).map((compInput) => {
            const pc = em.create(ProblemCompany, {
                problem,
                company: companyMap.get(compInput.companyId)!,
                frequency: compInput.frequency ?? 1,
                ...(compInput.lastAskedDate
                    ? { lastAskedDate: new Date(compInput.lastAskedDate) }
                    : {})
            });
            problem.problemCompanies.add(pc);
            return pc;
        });

        em.remove(problem.testCases.getItems());
        problem.testCases.removeAll();
        const updatedTestCases = (testCases ?? []).map((tcInput) => {
            const tc = em.create(TestCase, {
                problem,
                input: tcInput.input,
                expectedOutput: tcInput.expectedOutput,
                isSample: tcInput.isSample ?? false,
                isActive: tcInput.isActive ?? true,
                ...(tcInput.explanation !== undefined &&
                tcInput.explanation !== null
                    ? { explanation: tcInput.explanation }
                    : {})
            });
            problem.testCases.add(tc);
            return tc;
        });

        em.remove(problem.editorials.getItems());
        problem.editorials.removeAll();
        const updatedEditorials = (editorials ?? []).map((edInput) => {
            const ed = em.create(Editorial, {
                problem,
                title: edInput.title,
                content: edInput.content,
                isOfficial: edInput.isOfficial ?? true,
                createdById: edInput.createdById,
                ...(edInput.approach !== undefined && edInput.approach !== null
                    ? { approach: edInput.approach }
                    : {}),
                ...(edInput.codeSnippets !== undefined &&
                edInput.codeSnippets !== null
                    ? { codeSnippets: edInput.codeSnippets }
                    : {}),
                ...(edInput.timeComplexity !== undefined &&
                edInput.timeComplexity !== null
                    ? { timeComplexity: edInput.timeComplexity }
                    : {}),
                ...(edInput.spaceComplexity !== undefined &&
                edInput.spaceComplexity !== null
                    ? { spaceComplexity: edInput.spaceComplexity }
                    : {})
            });
            problem.editorials.add(ed);
            return ed;
        });

        // 6. Persist all changes in one transaction
        await em.flush();

        // 7. Serialize response matching ExtendedProblemSchema & exactOptionalPropertyTypes
        const serializedProblem = {
            ...wrap(problem).toObject(),
            constraints: problem.constraints ?? '',
            createdAt: problem.createdAt.toISOString(),
            updatedAt: problem.updatedAt.toISOString(),
            problemTags: updatedTags.map((pt) => ({
                problemId: problem.id,
                tagId: pt.tag.id,
                tag: {
                    id: pt.tag.id,
                    name: pt.tag.name,
                    ...('slug' in pt.tag && pt.tag.slug !== undefined
                        ? { slug: pt.tag.slug }
                        : {})
                }
            })),
            problemCompanies: updatedCompanies.map((pc) => ({
                problemId: problem.id,
                companyId: pc.company.id,
                frequency: pc.frequency,
                lastAskedDate: pc.lastAskedDate
                    ? pc.lastAskedDate.toISOString().split('T')[0]!
                    : null,
                company: {
                    id: pc.company.id,
                    name: pc.company.name,
                    ...('slug' in pc.company && pc.company.slug !== undefined
                        ? { slug: pc.company.slug }
                        : {})
                }
            })),
            testCases: updatedTestCases.map((tc) => ({
                id: tc.id,
                problemId: problem.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: tc.isSample,
                isActive: tc.isActive,
                explanation: tc.explanation ?? null,
                createdAt: tc.createdAt.toISOString()
            })),
            editorials: updatedEditorials.map((ed) => ({
                id: ed.id,
                problemId: problem.id,
                title: ed.title,
                approach: ed.approach ?? null,
                content: ed.content,
                codeSnippets: ed.codeSnippets ?? null,
                timeComplexity: ed.timeComplexity ?? null,
                spaceComplexity: ed.spaceComplexity ?? null,
                isOfficial: ed.isOfficial,
                createdById: ed.createdById,
                createdAt: ed.createdAt.toISOString(),
                updatedAt: ed.updatedAt.toISOString()
            })),
            comments: problem.comments
                .getItems()
                .map((c) => serializeComment(c, problem.id)),
            bookmarks: problem.bookmarks.getItems().map((b) => ({
                userId: b.userId,
                problemId: problem.id,
                notes: b.notes ?? null,
                createdAt: b.createdAt.toISOString()
            })),
            problemLikes: problem.problemLikes.getItems().map((pl) => ({
                userId: pl.userId,
                problemId: problem.id,
                isLike: pl.isLike,
                createdAt: pl.createdAt.toISOString()
            }))
        };

        return reply.status(200).send(serializedProblem);
    } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
            return reply.status(409).send({
                ok: false,
                errors: [{ field: 'slug', message: 'slug already exists' }]
            });
        }

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

// DELETE /api/problems/:id
export const deleteProblem: Fastify.RouteHandler<DeleteProblemType> = async (
    req,
    reply
) => {
    try {
        const id = req.params.id;
        const em = await getEM();

        const problem = await em.findOne(Problem, { id });

        if (!problem) {
            return reply.status(404).send({
                ok: false,
                errors: [{ field: 'id', message: 'problem not found' }]
            });
        }

        await em.removeAndFlush(problem);

        return reply.status(200).send({
            ok: true,
            id
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
