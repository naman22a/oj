import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';
import type { Sandbox } from '../sandbox/sandbox.interface.js';
import { images } from '../config/images.ts';

export class JavaCompiler implements Compiler {
    constructor(private readonly sandbox: Sandbox) {}

    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'Main.java'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        const result = await this.sandbox.execute(
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
            command: success ? 'java' : undefined,
            args: success ? ['-cp', '/workspace', 'Main'] : undefined
        };
    }
}
