import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { JavaScriptCompiler } from '../../src/workers/execution/compiler/javascript.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import { ExecutionService } from '../../src/workers/execution/execution.service.js';
import { images } from '../../src/workers/execution/config/images.ts';

describe('JavaScript ExecutionService integration', () => {
    let workspace: string;

    afterEach(async () => {
        if (workspace) {
            await rm(workspace, { recursive: true, force: true });
        }
    });

    async function createExecutionService() {
        workspace = await mkdtemp(join(tmpdir(), 'oj-javascript-service-'));

        const sandbox = new DockerSandbox();
        const compiler = new JavaScriptCompiler(sandbox);

        return new ExecutionService(compiler, sandbox);
    }

    it('should accept a submission when all test cases pass', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            `const fs = require('node:fs');
const [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(a + b);`,
            [
                { input: '10 20\n', expectedOutput: '30\n' },
                { input: '5 7\n', expectedOutput: '12\n' },
                { input: '-5 5\n', expectedOutput: '0\n' }
            ],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.javascript
            }
        );

        expect(result.verdict).toBe('ACCEPTED');
    });

    it('should return WRONG_ANSWER when output is incorrect', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'console.log(999);',
            [{ input: '', expectedOutput: '100\n' }],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.javascript
            }
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
    });

    it('should return RUNTIME_ERROR for a JavaScript exception', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'throw new Error("intentional runtime error");',
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 5000,
                memoryLimitMb: 256,
                image: images.javascript
            }
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
    });

    it('should return TIME_LIMIT_EXCEEDED for an infinite loop', async () => {
        const service = await createExecutionService();

        const result = await service.execute(
            'while (true) {}',
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 1000,
                memoryLimitMb: 256,
                image: images.javascript
            }
        );

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
    });
});
