import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';
import type { Sandbox } from '../sandbox/sandbox.interface.js';
import { images } from '../config/images.ts';

export class JavaScriptCompiler implements Compiler {
    constructor(private readonly sandbox: Sandbox) {}

    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'main.js'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        const result = await this.sandbox.execute(
            workspace,
            'node',
            ['--check', '/workspace/main.js'],
            '',
            {
                timeoutMs: 5000,
                memoryMb: 128,
                writable: false,
                image: images.javascript
            }
        );

        if (result.timedOut) {
            return {
                success: false,
                stderr: 'JavaScript syntax validation timed out',
                timeMs: result.timeMs,
                timedOut: true
            };
        }

        if (result.exitCode !== 0) {
            return {
                success: false,
                stderr: result.stderr,
                timeMs: result.timeMs,
                timedOut: false
            };
        }

        return {
            success: true,
            stderr: '',
            timeMs: result.timeMs,
            timedOut: false,
            command: 'node',
            args: ['/workspace/main.js']
        };
    }
}
