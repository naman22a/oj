import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';

export class PythonCompiler implements Compiler {
    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'main.py'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        return {
            success: true,
            stderr: '',
            timeMs: 0,
            timedOut: false,
            command: 'python3',
            args: ['-B', '/workspace/main.py']
        };
    }
}
