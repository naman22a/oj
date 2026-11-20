export interface SandboxOptions {
    timeoutMs: number;
    memoryMb: number;
    writable?: boolean;
}

export interface Sandbox {
    execute(
        workspace: string,
        command: string,
        args: string[],
        stdin: string,
        options: SandboxOptions
    ): Promise<SandboxResult>;
}

export interface SandboxResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timeMs: number;
    memoryKb: number | null;
    timedOut: boolean;
    memoryExceeded: boolean;
    outputExceeded: boolean;
}
