import { spawn as nodeSpawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import type {
    Sandbox,
    SandboxOptions,
    SandboxResult
} from './sandbox.interface.js';

const DEFAULT_IMAGE = 'oj-cpp:local';

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DOCKER_COMMAND_TIMEOUT_MS = 10_000;
const CONTAINER_CREATE_TIMEOUT_MS = 15_000;

type SpawnFunction = typeof nodeSpawn;

interface ContainerState {
    OOMKilled: boolean;
    Error: string;
    ExitCode: number | null;
}

export class DockerSandbox implements Sandbox {
    constructor(private readonly spawn: SpawnFunction = nodeSpawn) {}

    async execute(
        workspace: string,
        command: string,
        args: string[],
        stdin: string,
        options: SandboxOptions
    ): Promise<SandboxResult> {
        const uid = process.getuid?.() ?? 10001;
        const gid = process.getgid?.() ?? 10001;

        if (uid === 0) {
            throw new Error('DockerSandbox cannot run from a root process');
        }

        const memoryMb = options.memoryMb;
        const timeoutMs = options.timeoutMs;

        if (!Number.isSafeInteger(memoryMb) || memoryMb <= 0) {
            throw new Error('Invalid sandbox memory limit');
        }

        if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
            throw new Error('Invalid sandbox timeout');
        }

        const containerName = `oj-${randomUUID()}`;

        const mount = [
            'type=bind',
            `source=${workspace}`,
            'target=/workspace',
            ...(options.writable ? [] : ['readonly'])
        ].join(',');

        const image = options.image ?? DEFAULT_IMAGE;

        const createArgs = [
            'create',
            '--interactive',
            '--name',
            containerName,

            '--network',
            'none',

            '--memory',
            `${memoryMb}m`,

            '--memory-swap',
            `${memoryMb}m`,

            '--cpus',
            '1',

            '--pids-limit',
            '64',

            '--read-only',

            '--cap-drop',
            'ALL',

            '--security-opt',
            'no-new-privileges',

            '--ulimit',
            'core=0',

            '--ulimit',
            'nofile=64:64',

            '--ulimit',
            'fsize=10485760:10485760',

            '--user',
            `${uid}:${gid}`,

            '--env',
            'HOME=/tmp',

            '--tmpfs',
            '/tmp:rw,noexec,nosuid,size=64m',

            '--mount',
            mount,

            '--workdir',
            '/workspace',

            image,
            command,
            ...args
        ];

        let containerId: string;

        try {
            containerId = (
                await this.runDockerCommand(
                    createArgs,
                    CONTAINER_CREATE_TIMEOUT_MS
                )
            ).trim();

            if (!containerId) {
                throw new Error('Docker did not return a container ID');
            }
        } catch (error) {
            await this.removeContainer(containerName);
            throw error;
        }

        return this.startContainer(containerId, stdin, timeoutMs);
    }

    private async startContainer(
        containerId: string,
        stdin: string,
        timeoutMs: number
    ): Promise<SandboxResult> {
        const child = this.spawn(
            'docker',
            ['start', '--attach', '--interactive', containerId],
            {
                stdio: ['pipe', 'pipe', 'pipe']
            }
        );

        const startedAt = performance.now();

        return new Promise((resolve, reject) => {
            let settled = false;
            let timedOut = false;
            let outputExceeded = false;
            let outputBytes = 0;

            let terminationPromise: Promise<void> | undefined;

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            const clearExecutionTimer = () => {
                clearTimeout(timer);
            };

            const terminateContainer = (): Promise<void> => {
                if (terminationPromise) {
                    return terminationPromise;
                }

                terminationPromise = (async () => {
                    try {
                        await this.runDockerCommand(['kill', containerId]);
                    } catch {
                        // It may already have exited.
                        // Inspect its state after the attach process closes.
                    }

                    if (child.exitCode === null && !child.killed) {
                        child.kill('SIGTERM');
                    }
                })();

                return terminationPromise;
            };

            const timer = setTimeout(() => {
                timedOut = true;
                void terminateContainer();
            }, timeoutMs);

            const appendOutput = (target: Buffer[], chunk: Buffer | string) => {
                const buffer = Buffer.isBuffer(chunk)
                    ? chunk
                    : Buffer.from(chunk);

                const remaining = Math.max(0, MAX_OUTPUT_BYTES - outputBytes);

                if (remaining > 0) {
                    target.push(buffer.subarray(0, remaining));
                }

                outputBytes += buffer.length;

                if (outputBytes > MAX_OUTPUT_BYTES && !outputExceeded) {
                    outputExceeded = true;
                    void terminateContainer();
                }
            };

            child.stdout.on('data', (chunk: Buffer) => {
                appendOutput(stdoutChunks, chunk);
            });

            child.stderr.on('data', (chunk: Buffer) => {
                appendOutput(stderrChunks, chunk);
            });

            // A submitted program may close stdin before all input
            // has been written. That is not a sandbox failure.
            child.stdin.on('error', () => {});

            child.on('error', async (error) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearExecutionTimer();

                try {
                    await terminateContainer();
                    await this.removeContainer(containerId);
                } catch {
                    // Preserve the original spawn error.
                }

                reject(error);
            });

            child.on('close', async (exitCode) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearExecutionTimer();

                try {
                    if (terminationPromise) {
                        await terminationPromise;
                    }

                    const state = await this.inspectContainer(containerId);

                    await this.removeContainer(containerId);

                    if (state.Error) {
                        throw new Error(
                            `Docker execution failed: ${state.Error}`
                        );
                    }

                    const stdout = Buffer.concat(stdoutChunks).toString('utf8');

                    const stderr = Buffer.concat(stderrChunks).toString('utf8');

                    const metrics = this.parseMetrics(stderr);

                    resolve({
                        stdout,
                        stderr: metrics.stderr,
                        exitCode,
                        timeMs: metrics.timeMs ?? performance.now() - startedAt,
                        memoryKb: metrics.memoryKb,
                        timedOut,
                        memoryExceeded: state.OOMKilled,
                        outputExceeded
                    });
                } catch (error) {
                    await this.removeContainer(containerId);
                    reject(error);
                }
            });

            child.stdin.end(stdin);
        });
    }

    private parseMetrics(stderr: string): {
        stderr: string;
        timeMs: number | null;
        memoryKb: number | null;
    } {
        const match = stderr.match(/__OJ_METRICS__(\d+(?:\.\d+)?)\s+(\d+)/);

        if (!match) {
            return {
                stderr,
                timeMs: null,
                memoryKb: null
            };
        }

        return {
            stderr: stderr.replace(match[0], '').trim(),
            timeMs: Number(match[1]) * 1000,
            memoryKb: Number(match[2])
        };
    }

    private async inspectContainer(
        containerId: string
    ): Promise<ContainerState> {
        const output = await this.runDockerCommand([
            'inspect',
            '--format={{json .State}}',
            containerId
        ]);

        return JSON.parse(output) as ContainerState;
    }

    private async removeContainer(containerId: string): Promise<void> {
        await this.runDockerCommand(['rm', '-f', containerId]).catch(() => '');
    }

    private runDockerCommand(
        args: string[],
        timeoutMs = DOCKER_COMMAND_TIMEOUT_MS
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = this.spawn('docker', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            let outputBytes = 0;
            let settled = false;

            const finish = (error?: Error, output = '') => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);

                if (error) {
                    reject(error);
                } else {
                    resolve(output);
                }
            };

            const append = (target: Buffer[], chunk: Buffer) => {
                outputBytes += chunk.length;

                if (outputBytes > MAX_OUTPUT_BYTES) {
                    child.kill('SIGTERM');

                    finish(new Error('Docker command exceeded output limit'));

                    return;
                }

                target.push(chunk);
            };

            const timer = setTimeout(() => {
                child.kill('SIGTERM');

                finish(new Error(`Docker command timed out: ${args[0]}`));
            }, timeoutMs);

            child.stdout.on('data', (chunk: Buffer) => {
                append(stdoutChunks, chunk);
            });

            child.stderr.on('data', (chunk: Buffer) => {
                append(stderrChunks, chunk);
            });

            child.on('error', (error) => {
                finish(error);
            });

            child.on('close', (code) => {
                if (settled) {
                    return;
                }

                const stdout = Buffer.concat(stdoutChunks).toString('utf8');

                const stderr = Buffer.concat(stderrChunks).toString('utf8');

                if (code !== 0) {
                    finish(
                        new Error(
                            `Docker command failed (${code}): ` +
                                `${args[0]}\n${stderr}`
                        )
                    );

                    return;
                }

                finish(undefined, stdout);
            });
        });
    }
}
