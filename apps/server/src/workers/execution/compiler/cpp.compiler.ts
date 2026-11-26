import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';
import type { Sandbox } from '../sandbox/sandbox.interface.js';

export class CppCompiler implements Compiler {
    constructor(private readonly sandbox: Sandbox) {}

    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'main.cpp'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        const result = await this.sandbox.execute(
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
                image: 'oj-cpp:local'
            }
        );

        const success =
            result.exitCode === 0 &&
            !result.timedOut &&
            !result.memoryExceeded &&
            !result.outputExceeded;

        return {
            success,
            stderr: result.stderr,
            timeMs: result.timeMs,
            timedOut: result.timedOut,
            command: success ? '/workspace/main' : undefined,
            args: success ? [] : undefined
        };
    }
}
