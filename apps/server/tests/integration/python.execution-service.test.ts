import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PythonCompiler } from '../../src/workers/execution/compiler/python.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import { ExecutionService } from '../../src/workers/execution/execution.service.js';
import { images } from '../../src/workers/execution/config/images.ts';

describe('Python ExecutionService integration', () => {
    let workspace: string;

    afterEach(async () => {
        if (workspace) {
            await rm(workspace, { recursive: true, force: true });
        }
    });

    async function createExecutionService() {
        workspace = await mkdtemp(join(tmpdir(), 'oj-python-service-'));

        const sandbox = new DockerSandbox();
        const compiler = new PythonCompiler(sandbox);

        return new ExecutionService(compiler, sandbox);
    }

    it('should accept a submission when all test cases pass', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'a, b = map(int, input().split())\nprint(a + b)',
            [
                { input: '10 20\n', expectedOutput: '30\n' },
                { input: '5 7\n', expectedOutput: '12\n' },
                { input: '-5 5\n', expectedOutput: '0\n' }
            ],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.python
            }
        );

        expect(result.verdict).toBe('ACCEPTED');
    });

    it('should return WRONG_ANSWER when output is incorrect', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'print(999)',
            [{ input: '', expectedOutput: '100\n' }],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.python
            }
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
    });

    it('should return RUNTIME_ERROR for a Python exception', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'raise ValueError("intentional runtime error")',
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.python
            }
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
    });

    it('should return TIME_LIMIT_EXCEEDED for an infinite loop', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'while True:\n    pass',
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 1000,
                memoryLimitMb: 256,
                image: images.python
            }
        );

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
    });
});
