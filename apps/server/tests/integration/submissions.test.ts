import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

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
    let userId: number | undefined;
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
        enqueueSubmissionMock.mockReset();
        enqueueSubmissionMock.mockResolvedValue({});

        emitSubmissionUpdateMock.mockReset();

        const orm = await getORM();
        const em = orm.em.fork();

        const user = em.create(User, {
            username: `test-user-${randomUUID()}`,
            email: `test-${randomUUID()}@example.com`,
            passwordHash: 'test-password-hash'
        });

        await em.persistAndFlush(user);
        userId = user.id;

        problemSlug = `test-problem-${randomUUID()}`;

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
        if (userId === undefined) return;

        const orm = await getORM();
        const em = orm.em.fork();

        await em.nativeDelete(Submission, { userId });

        if (problemSlug) {
            await em.nativeDelete(Problem, { slug: problemSlug });
        }

        await em.nativeDelete(User, { id: userId });

        userId = undefined;
        problemSlug = '';
    });

    afterAll(async () => {
        await app.close();
        await closeORM();
    });

    // Helper for authenticated submission requests.
    const submit = (
        code: string,
        language: SubmissionLanguage,
        idempotencyKey?: string
    ) => {
        return app.inject({
            method: 'POST',
            url: `/api/submissions/${problemSlug}`,
            headers: {
                authorization: `Bearer ${accessToken}`,
                ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {})
            },
            payload: {
                code,
                language
            }
        });
    };

    it('creates and persists an authenticated submission without an idempotency key', async () => {
        const code = `
#include <iostream>
using namespace std;

int main() {
  cout << "Hello World";
  return 0;
}
`;

        const response = await submit(code, SubmissionLanguage.CPP);

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
    });

    it('returns the existing submission for the same key and payload', async () => {
        const idempotencyKey = randomUUID();
        const code = 'int main() { return 0; }';

        const firstResponse = await submit(
            code,
            SubmissionLanguage.CPP,
            idempotencyKey
        );

        expect(firstResponse.statusCode).toBe(202);

        const firstBody = firstResponse.json();

        const secondResponse = await submit(
            code,
            SubmissionLanguage.CPP,
            idempotencyKey
        );

        expect(secondResponse.statusCode).toBe(202);

        const secondBody = secondResponse.json();

        expect(secondBody.data.submissionId).toBe(firstBody.data.submissionId);

        const orm = await getORM();
        const em = orm.em.fork();

        const submissions = await em.find(Submission, {
            userId,
            idempotencyKey
        });

        expect(submissions).toHaveLength(1);

        // Only the first request should enqueue and emit.
        expect(enqueueSubmissionMock).toHaveBeenCalledOnce();
        expect(emitSubmissionUpdateMock).toHaveBeenCalledOnce();
    });

    it('returns 409 when the same key is reused with different code', async () => {
        const idempotencyKey = randomUUID();

        const firstResponse = await submit(
            'int main() { return 0; }',
            SubmissionLanguage.CPP,
            idempotencyKey
        );

        expect(firstResponse.statusCode).toBe(202);

        const secondResponse = await submit(
            'int main() { return 1; }',
            SubmissionLanguage.CPP,
            idempotencyKey
        );

        expect(secondResponse.statusCode).toBe(409);

        expect(secondResponse.json()).toMatchObject({
            ok: false,
            errors: [
                {
                    field: 'idempotencyKey'
                }
            ]
        });

        expect(enqueueSubmissionMock).toHaveBeenCalledOnce();
        expect(emitSubmissionUpdateMock).toHaveBeenCalledOnce();
    });

    it('returns 409 when the same key is reused with a different language', async () => {
        const idempotencyKey = randomUUID();
        const code = 'int main() { return 0; }';

        const firstResponse = await submit(
            code,
            SubmissionLanguage.CPP,
            idempotencyKey
        );

        expect(firstResponse.statusCode).toBe(202);

        const secondResponse = await submit(
            code,
            SubmissionLanguage.JAVASCRIPT,
            idempotencyKey
        );

        expect(secondResponse.statusCode).toBe(409);

        expect(secondResponse.json()).toMatchObject({
            ok: false,
            errors: [
                {
                    field: 'idempotencyKey'
                }
            ]
        });

        expect(enqueueSubmissionMock).toHaveBeenCalledOnce();
        expect(emitSubmissionUpdateMock).toHaveBeenCalledOnce();
    });

    it('creates only one submission for concurrent requests with the same key', async () => {
        const idempotencyKey = randomUUID();
        const code = 'int main() { return 0; }';

        const [firstResponse, secondResponse] = await Promise.all([
            submit(code, SubmissionLanguage.CPP, idempotencyKey),
            submit(code, SubmissionLanguage.CPP, idempotencyKey)
        ]);

        expect(firstResponse.statusCode).toBe(202);
        expect(secondResponse.statusCode).toBe(202);

        const firstBody = firstResponse.json();
        const secondBody = secondResponse.json();

        expect(firstBody.data.submissionId).toBe(secondBody.data.submissionId);

        const orm = await getORM();
        const em = orm.em.fork();

        const submissions = await em.find(Submission, {
            userId,
            idempotencyKey
        });

        expect(submissions).toHaveLength(1);

        // Only one request should create and enqueue the submission.
        expect(enqueueSubmissionMock).toHaveBeenCalledOnce();
        expect(emitSubmissionUpdateMock).toHaveBeenCalledOnce();
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

        expect(response.statusCode).toBe(404);

        expect(response.json()).toMatchObject({
            ok: false,
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
