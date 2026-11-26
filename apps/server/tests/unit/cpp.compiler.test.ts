import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { CppCompiler } from '../../src/workers/execution/compiler/cpp.compiler.js';
import type {
    Sandbox,
    SandboxResult
} from '../../src/workers/execution/sandbox/sandbox.interface.js';
import { images } from '../../src/workers/execution/config/images.ts';

const sandboxExecute = vi.fn();

const sandbox: Sandbox = {
    execute: sandboxExecute
};

const compiler = new CppCompiler(sandbox);

const successfulResult: SandboxResult = {
    stdout: '',
    stderr: '',
    exitCode: 0,
    timeMs: 120,
    memoryKb: 10240,
    timedOut: false,
    memoryExceeded: false,
    outputExceeded: false
};

describe('CppCompiler', () => {
    let workspace: string;

    beforeEach(async () => {
        vi.clearAllMocks();

        workspace = join(tmpdir(), `cpp-compiler-test-${crypto.randomUUID()}`);

        const { mkdir } = await import('node:fs/promises');
        await mkdir(workspace, { recursive: true });
    });

    afterEach(async () => {
        await rm(workspace, { recursive: true, force: true });
    });

    it('writes source code to main.cpp', async () => {
        const sourceCode = `
#include <iostream>
int main() {
    std::cout << "Hello World";
    return 0;
}
`;

        sandboxExecute.mockResolvedValue(successfulResult);

        await compiler.compile(sourceCode, workspace);

        const writtenSource = await readFile(
            join(workspace, 'main.cpp'),
            'utf-8'
        );

        expect(writtenSource).toBe(sourceCode);
    });

    it('invokes g++ with the expected arguments', async () => {
        sandboxExecute.mockResolvedValue(successfulResult);

        await compiler.compile('int main() { return 0; }', workspace);

        expect(sandboxExecute).toHaveBeenCalledWith(
            workspace,
            'g++',
            [
                '-std=c++17',
                '-O2',
                '-pipe',
                '-DONLINE_JUDGE',
                '/workspace/main.cpp',
                '-o',
                '/workspace/main'
            ],
            '',
            {
                timeoutMs: 10_000,
                memoryMb: 512,
                writable: true,
                image: images.cpp
            }
        );
    });

    it('returns the executable command after successful compilation', async () => {
        sandboxExecute.mockResolvedValue(successfulResult);

        const result = await compiler.compile(
            'int main() { return 0; }',
            workspace
        );

        expect(result).toEqual({
            success: true,
            stderr: '',
            timeMs: 120,
            timedOut: false,
            command: '/workspace/main',
            args: []
        });
    });

    it('returns compiler errors when compilation fails', async () => {
        sandboxExecute.mockResolvedValue({
            ...successfulResult,
            exitCode: 1,
            stderr: 'main.cpp: error: expected ;'
        });

        const result = await compiler.compile('int main() {', workspace);

        expect(result.success).toBe(false);
        expect(result.stderr).toContain('expected ;');
        expect(result.command).toBeUndefined();
    });

    it('returns timeout when compilation exceeds the time limit', async () => {
        sandboxExecute.mockResolvedValue({
            ...successfulResult,
            exitCode: 137,
            timedOut: true
        });

        const result = await compiler.compile(
            'int main() { return 0; }',
            workspace
        );

        expect(result.success).toBe(false);
        expect(result.timedOut).toBe(true);
    });

    it('propagates sandbox execution errors', async () => {
        sandboxExecute.mockRejectedValue(
            new Error('Docker daemon unavailable')
        );

        await expect(
            compiler.compile('int main() { return 0; }', workspace)
        ).rejects.toThrow('Docker daemon unavailable');
    });
});
