export interface CompileResult {
    success: boolean;
    stderr: string;
    timeMs: number;
    timedOut: boolean;
    command?: string | undefined;
    args?: string[] | undefined;
}

export interface Compiler {
    compile(sourceCode: string, workspace: string): Promise<CompileResult>;
}
