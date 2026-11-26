import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { PythonCompiler } from '../../src/workers/execution/compiler/python.compiler.js';
import type { Sandbox } from '../../src/workers/execution/sandbox/sandbox.interface.ts';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.ts';

describe('PythonCompiler', () => {
    let tempDir: string;
    let workspace: string;
    let compiler: PythonCompiler;
    let sandbox: Sandbox;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'oj-python-'));
        workspace = join(tempDir, 'workspace');
        sandbox = new DockerSandbox();
        compiler = new PythonCompiler(sandbox);
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it('should write source code to main.py', async () => {
        const sourceCode = 'print("Hello World")';

        await compiler.compile(sourceCode, workspace);

        const writtenCode = await readFile(join(workspace, 'main.py'), 'utf8');

        expect(writtenCode).toBe(sourceCode);
    });

    it('should create the workspace if it does not exist', async () => {
        const result = await compiler.compile('print(42)', workspace);

        expect(result.success).toBe(true);
        expect(await readFile(join(workspace, 'main.py'), 'utf8')).toBe(
            'print(42)'
        );
    });

    it('should return the Python execution command', async () => {
        const result = await compiler.compile('print(42)', workspace);

        expect(result).toMatchObject({
            success: true,
            stderr: '',
            command: 'python3',
            args: ['-B', '/workspace/main.py'],
            timedOut: false
        });

        expect(result.timeMs).toBeGreaterThanOrEqual(0);
    });

    it('should overwrite an existing main.py', async () => {
        await compiler.compile('print("first")', workspace);
        await compiler.compile('print("second")', workspace);

        const writtenCode = await readFile(join(workspace, 'main.py'), 'utf8');

        expect(writtenCode).toBe('print("second")');
    });
});
