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
        await writeFile(`${workspace}/main.cpp`, sourceCode, {
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
                writable: true
            }
        );

        return {
            success: result.exitCode === 0 && !result.timedOut,
            stderr: result.stderr,
            timeMs: result.timeMs,
            timedOut: result.timedOut
        };
    }
}
