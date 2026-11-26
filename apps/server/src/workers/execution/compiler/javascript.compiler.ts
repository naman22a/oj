import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Compiler, CompileResult } from './compiler.interface.js';

export class JavaScriptCompiler implements Compiler {
    async compile(
        sourceCode: string,
        workspace: string
    ): Promise<CompileResult> {
        await mkdir(workspace, { recursive: true });

        await writeFile(join(workspace, 'main.js'), sourceCode, {
            encoding: 'utf8',
            mode: 0o600
        });

        return {
            success: true,
            stderr: '',
            timeMs: 0,
            timedOut: false,
            command: 'node',
            args: ['/workspace/main.js']
        };
    }
}
