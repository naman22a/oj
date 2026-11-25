import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExecutionService } from '../../src/workers/execution/execution.service.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import type { SandboxResult } from '../../src/workers/execution/sandbox/sandbox.interface.js';
import { SubmissionStatus } from '../../src/models/enums.js';

const sandboxResult = (
    overrides: Partial<SandboxResult> = {}
): SandboxResult => ({
    stdout: '',
    stderr: '',
    exitCode: 0,
    timeMs: 10,
    memoryKb: 1024,
    timedOut: false,
    memoryExceeded: false,
    outputExceeded: false,
    ...overrides
});

function createService(results: SandboxResult[]) {
    const execute = vi.spyOn(DockerSandbox.prototype, 'execute');

    for (const result of results) {
        execute.mockResolvedValueOnce(result);
    }

    return {
        service: new ExecutionService(),
        execute
    };
}

const options = {
    timeLimitMs: 2000,
    memoryLimitMb: 256
};

const sourceCode = 'int main() { return 0; }';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ExecutionService.executeCpp', () => {
    it('returns ACCEPTED when all test cases pass', async () => {
        const { service, execute } = createService([
            sandboxResult(), // Compilation
            sandboxResult({ stdout: '2', timeMs: 20, memoryKb: 2048 }),
            sandboxResult({ stdout: '4', timeMs: 30, memoryKb: 4096 })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [
                { input: '1', expectedOutput: '2' },
                { input: '2', expectedOutput: '4' }
            ],
            options
        );

        expect(result.verdict).toBe('ACCEPTED');
        expect(result.testCasesPassed).toBe(2);
        expect(result.totalTestCases).toBe(2);
        expect(result.runtime).toBe(50);
        expect(result.memory).toBe(4096);
        expect(execute).toHaveBeenCalledTimes(3);
    });

    it('returns WRONG_ANSWER when output does not match', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({ stdout: 'wrong answer' })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '1', expectedOutput: 'correct answer' }],
            options
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
        expect(result.testCasesPassed).toBe(0);
    });

    it('returns COMPILE_ERROR when compilation fails', async () => {
        const { service, execute } = createService([
            sandboxResult({
                exitCode: 1,
                stderr: 'Compilation failed'
            })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('COMPILE_ERROR');
        expect(result.errorMessage).toBe('Compilation failed');
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('returns TIME_LIMIT_EXCEEDED when compilation times out', async () => {
        const { service } = createService([sandboxResult({ timedOut: true })]);

        const result = await service.executeCpp(sourceCode, [], options);

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
    });

    it('returns TIME_LIMIT_EXCEEDED when execution times out', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({ timedOut: true, timeMs: 2000 })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
    });

    it('returns MEMORY_LIMIT_EXCEEDED when execution exceeds memory', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({ memoryExceeded: true, memoryKb: 300000 })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('MEMORY_LIMIT_EXCEEDED');
        expect(result.memory).toBe(300000);
    });

    it('returns RUNTIME_ERROR when the program exits unsuccessfully', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({
                exitCode: 1,
                stderr: 'Segmentation fault'
            })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.errorMessage).toBe('Segmentation fault');
    });

    it('returns RUNTIME_ERROR when output exceeds the limit', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({ outputExceeded: true })
        ]);

        const result = await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            options
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.errorMessage).toBe('Output limit exceeded');
    });

    it('updates submission status to RUNNING after successful compilation', async () => {
        const { service } = createService([
            sandboxResult(),
            sandboxResult({ stdout: '42' })
        ]);

        const onStatus = vi
            .fn<(status: SubmissionStatus) => Promise<void>>()
            .mockResolvedValue(undefined);

        await service.executeCpp(
            sourceCode,
            [{ input: '', expectedOutput: '42' }],
            options,
            onStatus
        );

        expect(onStatus).toHaveBeenCalledTimes(1);
        expect(onStatus).toHaveBeenCalledWith(SubmissionStatus.RUNNING);
    });
});
