import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { randomUUID } from 'node:crypto';

const { emitSubmissionUpdateMock } = vi.hoisted(() => ({
    emitSubmissionUpdateMock: vi.fn()
}));

vi.mock('../../src/infrastructure/socket/emitter.js', () => ({
    emitSubmissionUpdate: emitSubmissionUpdateMock
}));

import { processExecution } from '../../src/workers/execution/execution.processor.js';
import { getEM, closeORM } from '../../src/db/index.js';
import { User } from '../../src/models/user.model.js';
import { Problem } from '../../src/models/problem.model.js';
import { Submission } from '../../src/models/submission.model.js';
import { TestCase } from '../../src/models/test-case.model.js';
import {
    Difficulty,
    SubmissionLanguage,
    SubmissionStatus
} from '../../src/models/enums.js';

describe('Execution processor integration tests', () => {
    let userId: number | undefined;
    let problemId: number | undefined;

    beforeEach(async () => {
        emitSubmissionUpdateMock.mockReset();

        const em = await getEM();

        const user = em.create(User, {
            username: `execution-test-${randomUUID()}`,
            email: `execution-${randomUUID()}@example.com`,
            passwordHash: 'test-password-hash'
        });

        await em.persistAndFlush(user);
        userId = user.id;

        const problem = em.create(Problem, {
            title: 'Execution Integration Test',
            slug: `execution-test-${randomUUID()}`,
            description: 'Test C++ execution',
            difficulty: Difficulty.EASY,
            hints: [],
            createdById: user.id,
            timeLimitMs: 2000,
            memoryLimitMb: 256
        });

        await em.persistAndFlush(problem);
        problemId = problem.id;

        const testCases = [
            em.create(TestCase, {
                problem,
                input: '2\n',
                expectedOutput: '4\n',
                isSample: true,
                isActive: true
            }),
            em.create(TestCase, {
                problem,
                input: '5\n',
                expectedOutput: '10\n',
                isSample: false,
                isActive: true
            })
        ];

        await em.persistAndFlush(testCases);
    });

    afterEach(async () => {
        if (userId === undefined) return;

        const em = await getEM();

        await em.nativeDelete(Submission, { userId });
        await em.nativeDelete(Problem, { id: problemId! });
        await em.nativeDelete(User, { id: userId });

        userId = undefined;
        problemId = undefined;
    });

    afterAll(async () => {
        await closeORM();
    });

    async function createSubmission(
        code: string,
        status = SubmissionStatus.QUEUED
    ) {
        const em = await getEM();

        const submission = em.create(Submission, {
            userId: userId!,
            problemId: problemId!,
            language: SubmissionLanguage.CPP,
            code,
            status
        });

        await em.persistAndFlush(submission);

        return submission.id;
    }

    async function getSubmission(id: number) {
        const em = await getEM();
        return em.findOne(Submission, { id });
    }

    function getEmittedStatuses(): SubmissionStatus[] {
        return emitSubmissionUpdateMock.mock.calls.map(
            ([, payload]) => payload.status
        );
    }

    it('accepts a correct C++ solution', async () => {
        const submissionId = await createSubmission(`
      #include <iostream>
      using namespace std;

      int main() {
        int n;
        cin >> n;
        cout << n * 2 << endl;
        return 0;
      }
    `);

        const result = await processExecution({ submissionId });

        expect(result?.verdict).toBe('ACCEPTED');
        expect(result?.testCasesPassed).toBe(2);
        expect(result?.totalTestCases).toBe(2);

        const submission = await getSubmission(submissionId);

        expect(submission).toMatchObject({
            status: SubmissionStatus.ACCEPTED,
            testCasesPassed: 2,
            totalTestCases: 2
        });

        expect(submission?.runtime).toEqual(expect.any(Number));
        expect(submission?.memory).toEqual(expect.any(Number));

        expect(getEmittedStatuses()).toEqual([
            SubmissionStatus.COMPILING,
            SubmissionStatus.RUNNING,
            SubmissionStatus.ACCEPTED
        ]);
    }, 60000);

    it('returns WRONG_ANSWER for incorrect output', async () => {
        const submissionId = await createSubmission(`
      #include <iostream>
      using namespace std;

      int main() {
        cout << -1 << endl;
        return 0;
      }
    `);

        const result = await processExecution({ submissionId });

        expect(result?.verdict).toBe('WRONG_ANSWER');

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.WRONG_ANSWER);
        expect(submission?.testCasesPassed).toBe(0);
        expect(submission?.totalTestCases).toBe(2);

        expect(getEmittedStatuses()).toEqual([
            SubmissionStatus.COMPILING,
            SubmissionStatus.RUNNING,
            SubmissionStatus.WRONG_ANSWER
        ]);
    }, 60000);

    it('returns COMPILE_ERROR for invalid C++ code', async () => {
        const submissionId = await createSubmission(`
      #include <iostream>
      int main( {
        return 0;
      }
    `);

        const result = await processExecution({ submissionId });

        expect(result?.verdict).toBe('COMPILE_ERROR');

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.COMPILE_ERROR);
        expect(submission?.errorMessage).toBeTruthy();

        expect(getEmittedStatuses()).toEqual([
            SubmissionStatus.COMPILING,
            SubmissionStatus.COMPILE_ERROR
        ]);
    }, 60000);

    it('returns TIME_LIMIT_EXCEEDED for an infinite loop', async () => {
        const em = await getEM();
        const problem = await em.findOneOrFail(Problem, {
            id: problemId!
        });

        problem.timeLimitMs = 500;
        await em.flush();

        const submissionId = await createSubmission(`
      int main() {
        while (true) {}
        return 0;
      }
    `);

        const result = await processExecution({ submissionId });

        expect(result?.verdict).toBe('TIME_LIMIT_EXCEEDED');

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.TIME_LIMIT_EXCEEDED);
        expect(getEmittedStatuses()).toEqual([
            SubmissionStatus.COMPILING,
            SubmissionStatus.RUNNING,
            SubmissionStatus.TIME_LIMIT_EXCEEDED
        ]);
    }, 60000);

    it('returns RUNTIME_ERROR when the program exits unsuccessfully', async () => {
        const submissionId = await createSubmission(`
      int main() {
        return 1;
      }
    `);

        const result = await processExecution({ submissionId });

        expect(result?.verdict).toBe('RUNTIME_ERROR');

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.RUNTIME_ERROR);
    }, 60000);

    it('marks the submission INTERNAL_ERROR when no active test cases exist', async () => {
        const em = await getEM();

        await em.nativeDelete(TestCase, {
            problem: problemId!
        });

        const submissionId = await createSubmission(`
      int main() {
        return 0;
      }
    `);

        await expect(processExecution({ submissionId })).rejects.toThrow(
            'No active judge test cases found'
        );

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.INTERNAL_ERROR);
        expect(submission?.errorMessage).toContain(
            'No active judge test cases found'
        );

        expect(getEmittedStatuses()).toEqual([
            SubmissionStatus.COMPILING,
            SubmissionStatus.INTERNAL_ERROR
        ]);
    }, 60000);

    it('does not reprocess an already completed submission', async () => {
        const submissionId = await createSubmission(
            'int main() { return 0; }',
            SubmissionStatus.ACCEPTED
        );

        const result = await processExecution({ submissionId });

        expect(result).toBeUndefined();

        const submission = await getSubmission(submissionId);

        expect(submission?.status).toBe(SubmissionStatus.ACCEPTED);
        expect(emitSubmissionUpdateMock).not.toHaveBeenCalled();
    });
});
