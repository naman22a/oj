import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { JavaScriptCompiler } from '../../src/workers/execution/compiler/javascript.compiler.js';
import type { Sandbox } from '../../src/workers/execution/sandbox/sandbox.interface.ts';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.ts';

describe('JavaScriptCompiler', () => {
    let tempDir: string;
    let workspace: string;
    let compiler: JavaScriptCompiler;
    let sandbox: Sandbox;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'oj-javascript-'));
        workspace = join(tempDir, 'workspace');
        sandbox = new DockerSandbox();
        compiler = new JavaScriptCompiler(sandbox);
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it('should write source code to main.js', async () => {
        const sourceCode = 'console.log("Hello World")';

        await compiler.compile(sourceCode, workspace);

        const writtenCode = await readFile(join(workspace, 'main.js'), 'utf8');

        expect(writtenCode).toBe(sourceCode);
    });

    it('should create the workspace if it does not exist', async () => {
        const result = await compiler.compile('console.log(42)', workspace);

        expect(result.success).toBe(true);
        expect(await readFile(join(workspace, 'main.js'), 'utf8')).toBe(
            'console.log(42)'
        );
    });

    it('should return the Node.js execution command', async () => {
        const result = await compiler.compile('console.log(42)', workspace);

        expect(result).toMatchObject({
            success: true,
            stderr: '',
            command: 'node',
            args: ['/workspace/main.js'],
            timedOut: false
        });

        expect(result.timeMs).toBeGreaterThanOrEqual(0);
    });

    it('should overwrite an existing main.js', async () => {
        await compiler.compile('console.log("first")', workspace);
        await compiler.compile('console.log("second")', workspace);

        const writtenCode = await readFile(join(workspace, 'main.js'), 'utf8');

        expect(writtenCode).toBe('console.log("second")');
    });
});
