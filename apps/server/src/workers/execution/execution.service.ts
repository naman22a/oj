import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Compiler } from './compiler/compiler.interface.js';
import type { Sandbox } from './sandbox/sandbox.interface.js';
import { outputsMatch } from './utils/output-comparator.js';
import { SubmissionStatus } from '../../models/enums.ts';

export interface ExecutionTestCase {
    input: string;
    expectedOutput: string;
}

export type ExecutionVerdict =
    | 'ACCEPTED'
    | 'WRONG_ANSWER'
    | 'COMPILE_ERROR'
    | 'TIME_LIMIT_EXCEEDED'
    | 'MEMORY_LIMIT_EXCEEDED'
    | 'INTERNAL_ERROR'
    | 'RUNTIME_ERROR';

export interface ExecutionResult {
    verdict: ExecutionVerdict;
    runtime: number;
    memory: number;
    testCasesPassed: number;
    totalTestCases: number;
    errorMessage?: string;
    results?: {
        output: string;
        expectedOutput: string;
    }[];
}

export interface ExecutionOptions {
    timeLimitMs: number;
    memoryLimitMb: number;
    image?: string;
}

export class ExecutionService {
    constructor(
        private readonly compiler: Compiler,
        private readonly sandbox: Sandbox
    ) {}

    async execute(
        sourceCode: string,
        testCases: ExecutionTestCase[],
        options: ExecutionOptions,
        onStatus?: (status: SubmissionStatus) => Promise<void>
    ): Promise<ExecutionResult> {
        const workspace = await mkdtemp(join(tmpdir(), 'oj-submission-'));

        try {
            const compilation = await this.compiler.compile(
                sourceCode,
                workspace
            );

            if (!compilation.success) {
                return {
                    verdict: compilation.timedOut
                        ? 'TIME_LIMIT_EXCEEDED'
                        : 'COMPILE_ERROR',
                    runtime: compilation.timeMs,
                    memory: 0,
                    testCasesPassed: 0,
                    totalTestCases: testCases.length,
                    errorMessage: compilation.stderr
                };
            }

            if (!compilation.command) {
                throw new Error(
                    'Compiler succeeded without providing an execution command'
                );
            }

            await onStatus?.(SubmissionStatus.RUNNING);

            let totalRuntime = 0;
            let peakMemory = 0;
            let passed = 0;

            const results: {
                output: string;
                expectedOutput: string;
            }[] = [];

            for (const testCase of testCases) {
                const result = await this.sandbox.execute(
                    workspace,
                    compilation.command,
                    compilation.args ?? [],
                    testCase.input,
                    {
                        timeoutMs: options.timeLimitMs,
                        memoryMb: options.memoryLimitMb,
                        writable: false,
                        image: options.image!
                    }
                );

                totalRuntime += result.timeMs;

                peakMemory = Math.max(peakMemory, result.memoryKb ?? 0);

                results.push({
                    output: result.stdout,
                    expectedOutput: testCase.expectedOutput
                });

                if (result.timedOut) {
                    return {
                        verdict: 'TIME_LIMIT_EXCEEDED',
                        runtime: totalRuntime,
                        memory: peakMemory,
                        testCasesPassed: passed,
                        totalTestCases: testCases.length,
                        results
                    };
                }

                if (result.memoryExceeded) {
                    return {
                        verdict: 'MEMORY_LIMIT_EXCEEDED',
                        runtime: totalRuntime,
                        memory: peakMemory,
                        testCasesPassed: passed,
                        totalTestCases: testCases.length,
                        results
                    };
                }

                if (result.outputExceeded) {
                    return {
                        verdict: 'RUNTIME_ERROR',
                        runtime: totalRuntime,
                        memory: peakMemory,
                        testCasesPassed: passed,
                        totalTestCases: testCases.length,
                        errorMessage: 'Output limit exceeded',
                        results
                    };
                }

                if (result.exitCode !== 0) {
                    return {
                        verdict: 'RUNTIME_ERROR',
                        runtime: totalRuntime,
                        memory: peakMemory,
                        testCasesPassed: passed,
                        totalTestCases: testCases.length,
                        errorMessage: result.stderr,
                        results
                    };
                }

                if (!outputsMatch(result.stdout, testCase.expectedOutput)) {
                    return {
                        verdict: 'WRONG_ANSWER',
                        runtime: totalRuntime,
                        memory: peakMemory,
                        testCasesPassed: passed,
                        totalTestCases: testCases.length,
                        results
                    };
                }

                passed++;
            }

            return {
                verdict: 'ACCEPTED',
                runtime: totalRuntime,
                memory: peakMemory,
                testCasesPassed: passed,
                totalTestCases: testCases.length,
                results
            };
        } finally {
            await rm(workspace, {
                recursive: true,
                force: true
            });
        }
    }
}
