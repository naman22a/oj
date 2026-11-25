import { spawn as nodeSpawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type {
    Sandbox,
    SandboxOptions,
    SandboxResult
} from './sandbox.interface.ts';

const IMAGE = 'oj-cpp:local';
const MAX_OUTPUT_BYTES = 1024 * 1024;
type SpawnFunction = typeof nodeSpawn;

export class DockerSandbox implements Sandbox {
    constructor(private readonly spawn: SpawnFunction = nodeSpawn) {}

    async execute(
        workspace: string,
        command: string,
        args: string[],
        stdin: string,
        options: SandboxOptions
    ): Promise<SandboxResult> {
        const containerName = `oj-${randomUUID()}`;

        const uid = process.getuid?.() ?? 10001;
        const gid = process.getgid?.() ?? 10001;

        if (uid === 0) {
            throw new Error('Execution worker must run as a non-root user');
        }

        const memoryMb = options.memoryMb ?? 256;
        const timeoutMs = options.timeoutMs ?? 2000;

        if (!Number.isFinite(memoryMb) || memoryMb <= 0) {
            throw new Error(`Invalid memory limit: ${memoryMb}`);
        }

        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new Error(`Invalid timeout: ${timeoutMs}`);
        }

        const dockerArgs = [
            'run',

            // Keep STDIN open and forward input to container.
            '--interactive',

            '--name',
            containerName,

            // Network isolation
            '--network',
            'none',

            // Memory limits (no swap)
            '--memory',
            `${memoryMb}m`,

            '--memory-swap',
            `${memoryMb}m`,

            // CPU and process limits
            '--cpus',
            '1',

            '--pids-limit',
            '64',

            // Filesystem and privilege restrictions
            '--read-only',

            '--cap-drop',
            'ALL',

            '--security-opt',
            'no-new-privileges',

            // Resource limits
            '--ulimit',
            'core=0',

            '--ulimit',
            'nofile=64:64',

            '--ulimit',
            'fsize=10485760:10485760',

            // Run as non-root
            '--user',
            `${uid}:${gid}`,

            // Temporary writable directory
            '--tmpfs',
            '/tmp:rw,noexec,nosuid,size=64m',

            // Workspace mount
            '--mount',
            `type=bind,source=${workspace},target=/workspace${options.writable ? '' : ',readonly'}`,

            '--workdir',
            '/workspace',

            // Execution image and command
            IMAGE,
            command,
            ...args
        ];

        const startedAt = performance.now();

        return new Promise((resolve, reject) => {
            const child = this.spawn('docker', dockerArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let outputBytes = 0;

            let timedOut = false;
            let outputExceeded = false;
            let settled = false;

            const killContainer = () => {
                const killer = this.spawn('docker', ['kill', containerName], {
                    stdio: 'ignore'
                });

                killer.on('error', () => {});
            };

            const timeout = setTimeout(() => {
                timedOut = true;
                killContainer();
            }, timeoutMs);

            const appendOutput = (current: string, chunk: Buffer): string => {
                if (outputExceeded) {
                    return current;
                }

                if (outputBytes + chunk.length > MAX_OUTPUT_BYTES) {
                    outputExceeded = true;
                    killContainer();
                    return current;
                }

                outputBytes += chunk.length;

                return current + chunk.toString('utf8');
            };

            child.stdout.on('data', (chunk: Buffer) => {
                stdout = appendOutput(stdout, chunk);
            });

            child.stderr.on('data', (chunk: Buffer) => {
                stderr = appendOutput(stderr, chunk);
            });

            child.on('error', (error) => {
                if (settled) return;

                settled = true;
                clearTimeout(timeout);

                void this.removeContainer(containerName);
                reject(error);
            });

            child.on('close', async (exitCode) => {
                console.log('[DockerSandbox] Container:', containerName);
                console.log('[DockerSandbox] Exit code:', exitCode);
                console.log('[DockerSandbox] Timed out:', timedOut);
                console.log('[DockerSandbox] Output exceeded:', outputExceeded);
                console.log('[DockerSandbox] stdout:', stdout);
                console.log('[DockerSandbox] stderr:', stderr);

                if (exitCode === 125 || exitCode === 126 || exitCode === 127) {
                    settled = true;
                    clearTimeout(timeout);

                    await this.removeContainer(containerName);

                    reject(
                        new Error(
                            `Docker execution failed with exit code ${exitCode}:\n${stderr}`
                        )
                    );

                    return;
                }

                if (settled) return;

                settled = true;
                clearTimeout(timeout);

                try {
                    const oomKilled = await this.wasOomKilled(containerName);

                    await this.removeContainer(containerName);

                    const metrics = this.parseMetrics(stderr);

                    resolve({
                        stdout,
                        stderr: metrics.cleanStderr,
                        exitCode,
                        timeMs: metrics.timeMs ?? performance.now() - startedAt,
                        memoryKb: metrics.memoryKb,
                        timedOut,
                        memoryExceeded: oomKilled,
                        outputExceeded
                    });
                } catch (error) {
                    await this.removeContainer(containerName);
                    reject(error);
                }
            });

            child.stdin.on('error', () => {
                // The process may exit before consuming all stdin.
            });

            child.stdin.end(stdin);
        });
    }

    private parseMetrics(stderr: string) {
        const match = stderr.match(/__OJ_METRICS__(\d+(?:\.\d+)?)\s+(\d+)/);

        return {
            timeMs: match ? Number(match[1]) * 1000 : null,
            memoryKb: match ? Number(match[2]) : null,
            cleanStderr: stderr.replace(
                /\n?__OJ_METRICS__\d+(?:\.\d+)?\s+\d+/,
                ''
            )
        };
    }

    private async wasOomKilled(name: string): Promise<boolean> {
        try {
            const output = await this.runDockerCommand([
                'inspect',
                '--format={{.State.OOMKilled}}',
                name
            ]);

            return output.trim() === 'true';
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            if (/no such (object|container)/i.test(message)) {
                return false;
            }

            throw error;
        }
    }

    private async removeContainer(name: string): Promise<void> {
        await this.runDockerCommand(['rm', '-f', name]).catch(() => '');
    }

    private runDockerCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = this.spawn('docker', args);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', reject);

            child.on('close', (code) => {
                if (code !== 0) {
                    reject(
                        new Error(
                            `Docker command failed (${code}): ${args.join(' ')}\n${stderr}`
                        )
                    );
                    return;
                }

                resolve(stdout);
            });
        });
    }
}
