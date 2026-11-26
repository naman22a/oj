import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';
import type { Sandbox } from '../sandbox/sandbox.interface.js';
import { images } from '../config/images.ts';

export class PythonCompiler implements Compiler {
    constructor(private readonly sandbox: Sandbox) {}

    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'main.py'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        const result = await this.sandbox.execute(
            workspace,
            'python3',
            ['-B', '-m', 'py_compile', '/workspace/main.py'],
            '',
            {
                timeoutMs: 5000,
                memoryMb: 128,
                writable: true,
                image: images.python
            }
        );

        if (result.timedOut) {
            return {
                success: false,
                stderr: 'Python syntax validation timed out',
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
            command: 'python3',
            args: ['-B', '/workspace/main.py']
        };
    }
}
