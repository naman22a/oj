import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { JavaScriptCompiler } from '../../src/workers/execution/compiler/javascript.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import { images } from '../../src/workers/execution/config/images.ts';

describe('JavaScript execution integration', () => {
    it('should execute JavaScript with stdin and capture stdout', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-js-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new JavaScriptCompiler(sandbox);

            const compilation = await compiler.compile(
                `const fs = require('node:fs');
const [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(a + b);`,
                workspace
            );

            const result = await sandbox.execute(
                workspace,
                compilation.command!,
                compilation.args!,
                '10 20\n',
                {
                    timeoutMs: 5000,
                    memoryMb: 256,
                    writable: false,
                    image: images.javascript
                }
            );

            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim()).toBe('30');
            expect(result.timedOut).toBe(false);
            expect(result.memoryExceeded).toBe(false);
            expect(result.outputExceeded).toBe(false);
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });

    it('should capture JavaScript runtime errors', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-js-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new JavaScriptCompiler(sandbox);

            const compilation = await compiler.compile(
                'throw new Error("intentional runtime error");',
                workspace
            );

            const result = await sandbox.execute(
                workspace,
                compilation.command!,
                compilation.args!,
                '',
                {
                    timeoutMs: 5000,
                    memoryMb: 256,
                    writable: false,
                    image: images.javascript
                }
            );

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('Error');
            expect(result.stderr).toContain('intentional runtime error');
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });

    it('should enforce the execution timeout', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-js-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new JavaScriptCompiler(sandbox);

            const compilation = await compiler.compile(
                'while (true) {}',
                workspace
            );

            const result = await sandbox.execute(
                workspace,
                compilation.command!,
                compilation.args!,
                '',
                {
                    timeoutMs: 1000,
                    memoryMb: 256,
                    writable: false,
                    image: images.javascript
                }
            );

            expect(result.timedOut).toBe(true);
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });
});
