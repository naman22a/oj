import { describe, expect, it } from 'vitest';

import { JavaCompiler } from '../../src/workers/execution/compiler/java.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import { ExecutionService } from '../../src/workers/execution/execution.service.ts';
import { SubmissionStatus } from '../../src/models/enums.ts';

const sourceCode = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int a = scanner.nextInt();
        int b = scanner.nextInt();

        System.out.println(a + b);
    }
}
`;

describe('Java ExecutionService integration', () => {
    const sandbox = new DockerSandbox();
    const service = new ExecutionService(new JavaCompiler(sandbox), sandbox);

    const options = {
        timeLimitMs: 2_000,
        memoryLimitMb: 256,
        image: 'oj-java:local'
    };

    it('accepts a Java solution with multiple test cases', async () => {
        const statuses: SubmissionStatus[] = [];

        const result = await service.execute(
            sourceCode,
            [
                { input: '10 20', expectedOutput: '30' },
                { input: '5 7', expectedOutput: '12' },
                { input: '-4 9', expectedOutput: '5' }
            ],
            options,
            async (status) => {
                statuses.push(status);
            }
        );

        expect(result.verdict).toBe('ACCEPTED');
        expect(result.testCasesPassed).toBe(3);
        expect(result.totalTestCases).toBe(3);
        expect(result.results).toHaveLength(3);
        expect(statuses).toEqual([SubmissionStatus.RUNNING]);
    });

    it('returns WRONG_ANSWER for incorrect expected output', async () => {
        const result = await service.execute(
            sourceCode,
            [
                { input: '10 20', expectedOutput: '30' },
                { input: '5 7', expectedOutput: '999' }
            ],
            options
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
        expect(result.testCasesPassed).toBe(1);
        expect(result.totalTestCases).toBe(2);
    });

    it('returns COMPILE_ERROR for invalid Java source', async () => {
        const result = await service.execute(
            'public class Main {',
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('COMPILE_ERROR');
        expect(result.errorMessage).toBeTruthy();
    });
});
