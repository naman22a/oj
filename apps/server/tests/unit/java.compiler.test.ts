import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { JavaCompiler } from '../../src/workers/execution/compiler/java.compiler.js';
import type {
    Sandbox,
    SandboxResult
} from '../../src/workers/execution/sandbox/sandbox.interface.js';
import { images } from '../../src/workers/execution/config/images.ts';

const sandboxExecute = vi.fn();

const sandbox: Sandbox = {
    execute: sandboxExecute
};

const compiler = new JavaCompiler(sandbox);

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

describe('JavaCompiler', () => {
    let workspace: string;

    beforeEach(async () => {
        vi.clearAllMocks();

        workspace = join(tmpdir(), `java-compiler-test-${crypto.randomUUID()}`);

        await mkdir(workspace, { recursive: true });
    });

    afterEach(async () => {
        await rm(workspace, { recursive: true, force: true });
    });

    it('writes source code to Main.java', async () => {
        const sourceCode = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
`;

        sandboxExecute.mockResolvedValue(successfulResult);

        await compiler.compile(sourceCode, workspace);

        const writtenSource = await readFile(
            join(workspace, 'Main.java'),
            'utf-8'
        );

        expect(writtenSource).toBe(sourceCode);
    });

    it('invokes javac with the expected arguments', async () => {
        sandboxExecute.mockResolvedValue(successfulResult);

        await compiler.compile(
            'public class Main { public static void main(String[] args) {} }',
            workspace
        );

        expect(sandboxExecute).toHaveBeenCalledWith(
            workspace,
            'javac',
            ['-encoding', 'UTF-8', '-d', '/workspace', '/workspace/Main.java'],
            '',
            {
                timeoutMs: 15_000,
                memoryMb: 512,
                writable: true,
                image: images.java
            }
        );
    });

    it('returns the execution command after successful compilation', async () => {
        sandboxExecute.mockResolvedValue(successfulResult);

        const result = await compiler.compile(
            'public class Main { public static void main(String[] args) {} }',
            workspace
        );

        expect(result).toEqual({
            success: true,
            stderr: '',
            timeMs: 120,
            timedOut: false,
            command: 'java',
            args: ['-cp', '/workspace', 'Main']
        });
    });

    it('returns compiler errors when compilation fails', async () => {
        sandboxExecute.mockResolvedValue({
            ...successfulResult,
            exitCode: 1,
            stderr: 'Main.java: error: expected ;'
        });

        const result = await compiler.compile('public class Main {', workspace);

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
            'public class Main { public static void main(String[] args) {} }',
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
            compiler.compile(
                'public class Main { public static void main(String[] args) {} }',
                workspace
            )
        ).rejects.toThrow('Docker daemon unavailable');
    });
});
