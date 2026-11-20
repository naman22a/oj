export interface CompileResult {
    success: boolean;
    stderr: string;
    timeMs: number;
    timedOut: boolean;
}

export interface Compiler {
    compile(sourceCode: string, workspace: string): Promise<CompileResult>;
}
