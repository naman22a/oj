import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PythonCompiler } from '../../src/workers/execution/compiler/python.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';

describe('Python execution integration', () => {
    it('should execute Python code with stdin and capture stdout', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-python-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new PythonCompiler();

            const compilation = await compiler.compile(
                'a, b = map(int, input().split())\nprint(a + b)',
                workspace
            );

            expect(compilation.success).toBe(true);
            expect(compilation.command).toBe('python3');

            const result = await sandbox.execute(
                workspace,
                compilation.command!,
                compilation.args!,
                '10 20\n',
                {
                    timeoutMs: 5000,
                    memoryMb: 256,
                    writable: false,
                    image: 'oj-python:local'
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

    it('should capture Python runtime errors', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-python-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new PythonCompiler();

            const compilation = await compiler.compile(
                'raise ValueError("intentional runtime error")',
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
                    image: 'oj-python:local'
                }
            );

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain('ValueError');
            expect(result.stderr).toContain('intentional runtime error');
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });

    it('should enforce the execution timeout', async () => {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-python-'));

        try {
            const sandbox = new DockerSandbox();
            const compiler = new PythonCompiler();

            const compilation = await compiler.compile(
                'while True:\n    pass',
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
                    image: 'oj-python:local'
                }
            );

            expect(result.timedOut).toBe(true);
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });
});
