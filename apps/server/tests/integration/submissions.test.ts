import {
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import jwt from 'jsonwebtoken';

// Mock external infrastructure before importing the application.
const { enqueueSubmissionMock, emitSubmissionUpdateMock } = vi.hoisted(() => ({
    enqueueSubmissionMock: vi.fn(),
    emitSubmissionUpdateMock: vi.fn()
}));

vi.mock('../../src/infrastructure/queue/submission.queue.ts', () => ({
    enqueueSubmission: enqueueSubmissionMock
}));

vi.mock('../../src/infrastructure/socket/emitter.ts', () => ({
    emitSubmissionUpdate: emitSubmissionUpdateMock
}));

import { buildApp } from '../../src/app.js';
import { getORM, closeORM } from '../../src/db/index.js';

import { User } from '../../src/models/user.model.js';
import { Problem } from '../../src/models/problem.model.js';
import { Submission } from '../../src/models/submission.model.js';

import {
    Difficulty,
    SubmissionLanguage,
    SubmissionStatus
} from '../../src/models/enums.js';

describe('Submission API integration tests', () => {
    let app: Awaited<ReturnType<typeof buildApp>>;
    let userId: number;
    let problemSlug: string;
    let accessToken: string;

    beforeAll(async () => {
        if (!process.env.DATABASE_URL?.includes('oj_test')) {
            throw new Error(
                'Refusing to run tests against a non-test database'
            );
        }

        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is missing');
        }

        app = await buildApp();
        await app.ready();
    });

    beforeEach(async () => {
        enqueueSubmissionMock.mockResolvedValue({});
        emitSubmissionUpdateMock.mockReset();

        const orm = await getORM();
        const em = orm.em.fork();

        const user = em.create(User, {
            username: `test-user-${crypto.randomUUID()}`,
            email: `test-${crypto.randomUUID()}@example.com`,
            passwordHash: 'test-password-hash'
        });

        await em.persistAndFlush(user);
        userId = user.id;

        problemSlug = `test-problem-${crypto.randomUUID()}`;

        const problem = em.create(Problem, {
            title: 'Two Sum Test',
            slug: problemSlug,
            description: 'Given an array of integers, return two indices.',
            difficulty: Difficulty.EASY,
            hints: [],
            createdById: userId
        });

        await em.persistAndFlush(problem);

        accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET!);
    });

    afterEach(async () => {
        if (!userId) return;

        const orm = await getORM();
        const em = orm.em.fork();

        await em.nativeDelete(Submission, { userId });

        if (problemSlug) {
            await em.nativeDelete(Problem, { slug: problemSlug });
        }

        await em.nativeDelete(User, { id: userId });

        userId = undefined as unknown as number;
        problemSlug = '';
    });

    afterAll(async () => {
        await app.close();
        await closeORM();
    });

    it('creates and persists an authenticated submission', async () => {
        const code = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World";
    return 0;
}
`;

        const response = await app.inject({
            method: 'POST',
            url: `/api/submissions/${problemSlug}`,
            headers: {
                authorization: `Bearer ${accessToken}`
            },
            payload: {
                code,
                language: SubmissionLanguage.CPP
            }
        });

        expect(response.statusCode).toBe(202);

        const body = response.json();

        expect(body.ok).toBe(true);
        expect(body.data).toMatchObject({
            status: SubmissionStatus.QUEUED
        });
        expect(body.data.submissionId).toEqual(expect.any(Number));

        const orm = await getORM();
        const em = orm.em.fork();

        const submission = await em.findOne(Submission, {
            id: body.data.submissionId
        });

        expect(submission).not.toBeNull();

        expect(submission).toMatchObject({
            userId,
            status: SubmissionStatus.QUEUED,
            language: SubmissionLanguage.CPP,
            code
        });

        expect(submission?.problemId).toEqual(expect.any(Number));

        expect(enqueueSubmissionMock).toHaveBeenCalledOnce();
        expect(enqueueSubmissionMock).toHaveBeenCalledWith(
            body.data.submissionId
        );

        expect(emitSubmissionUpdateMock).toHaveBeenCalledOnce();
        expect(emitSubmissionUpdateMock).toHaveBeenCalledWith(userId, {
            submissionId: body.data.submissionId,
            status: SubmissionStatus.QUEUED
        });
    });

    it('rejects a request without an authorization header', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/api/submissions/${problemSlug}`,
            payload: {
                code: 'int main() {}',
                language: SubmissionLanguage.CPP
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toMatchObject({
            error: 'unauthorized',
            message: 'missing authorization header'
        });

        expect(enqueueSubmissionMock).not.toHaveBeenCalled();
    });

    it('returns an error when the problem does not exist', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/submissions/nonexistent-problem',
            headers: {
                authorization: `Bearer ${accessToken}`
            },
            payload: {
                code: 'int main() {}',
                language: SubmissionLanguage.CPP
            }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            ok: false,
            jobId: null,
            errors: [
                {
                    field: 'problemId',
                    message: 'problem not found'
                }
            ]
        });

        expect(enqueueSubmissionMock).not.toHaveBeenCalled();
    });
});
