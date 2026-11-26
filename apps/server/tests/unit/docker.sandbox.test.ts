import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
import { spawn as nodeSpawn } from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';

class FakeChild extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();

    stdin = Object.assign(new EventEmitter(), {
        end: vi.fn()
    });

    exitCode: number | null = null;
    killed = false;

    kill = vi.fn(() => {
        this.killed = true;
        return true;
    });
}

const CONTAINER_ID = 'abc123def456';

const DEFAULT_STATE = JSON.stringify({
    OOMKilled: false,
    Error: '',
    ExitCode: 0
});

const defaultOptions = {
    timeoutMs: 2000,
    memoryMb: 256,
    writable: false
};

function createHarness(inspectOutput = DEFAULT_STATE) {
    const mainChild = new FakeChild();

    let resolveStarted!: () => void;

    const started = new Promise<void>((resolve) => {
        resolveStarted = resolve;
    });

    const spawnMock = vi.fn((...spawnArgs: unknown[]) => {
        const args = spawnArgs[1] as string[];
        const child = new FakeChild();

        if (args[0] === 'start') {
            resolveStarted();
            return mainChild;
        }

        queueMicrotask(() => {
            if (args[0] === 'create') {
                child.stdout.emit('data', Buffer.from(`${CONTAINER_ID}\n`));
            }

            if (args[0] === 'inspect') {
                child.stdout.emit('data', Buffer.from(inspectOutput));
            }

            child.emit('close', 0);
        });

        return child;
    });

    const sandbox = new DockerSandbox(spawnMock as unknown as typeof nodeSpawn);

    return {
        sandbox,
        spawnMock,
        mainChild,
        started
    };
}

function finishExecution(
    child: FakeChild,
    options: {
        stdout?: string;
        stderr?: string;
        exitCode?: number | null;
    } = {}
) {
    if (options.stdout) {
        child.stdout.emit('data', Buffer.from(options.stdout));
    }

    if (options.stderr) {
        child.stderr.emit('data', Buffer.from(options.stderr));
    }

    const exitCode = options.exitCode === undefined ? 0 : options.exitCode;

    child.exitCode = exitCode;
    child.emit('close', exitCode);
}

describe('DockerSandbox', () => {
    beforeEach(() => {
        vi.spyOn(process, 'getuid').mockReturnValue(1000);
        vi.spyOn(process, 'getgid').mockReturnValue(1000);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('creates a container with security restrictions', async () => {
        const { sandbox, spawnMock, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            'g++',
            ['main.cpp', '-o', 'main'],
            '',
            defaultOptions
        );

        await started;

        const createCall = spawnMock.mock.calls.find(
            ([, args]) => (args as string[])[0] === 'create'
        );

        expect(createCall?.[0]).toBe('docker');

        const dockerArgs = createCall?.[1] as string[];

        expect(dockerArgs).toContain('create');
        expect(dockerArgs).toContain('--network');
        expect(dockerArgs).toContain('none');
        expect(dockerArgs).toContain('--read-only');
        expect(dockerArgs).toContain('--cap-drop');
        expect(dockerArgs).toContain('ALL');
        expect(dockerArgs).toContain('--pids-limit');
        expect(dockerArgs).toContain('64');
        expect(dockerArgs).toContain('--security-opt');
        expect(dockerArgs).toContain('no-new-privileges');
        expect(dockerArgs).toContain('--user');
        expect(dockerArgs).toContain('1000:1000');
        expect(dockerArgs).toContain('--memory');
        expect(dockerArgs).toContain('256m');
        expect(dockerArgs).toContain('--memory-swap');

        const startCall = spawnMock.mock.calls.find(
            ([, args]) => (args as string[])[0] === 'start'
        );

        expect(startCall?.[1]).toEqual([
            'start',
            '--attach',
            '--interactive',
            CONTAINER_ID
        ]);

        finishExecution(mainChild);

        await promise;
    });

    it('forwards stdin to the container process', async () => {
        const { sandbox, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            'hello world',
            defaultOptions
        );

        await started;

        expect(mainChild.stdin.end).toHaveBeenCalledWith('hello world');

        finishExecution(mainChild);

        await promise;
    });

    it('uses a writable workspace mount when requested', async () => {
        const { sandbox, spawnMock, mainChild, started } = createHarness();

        const promise = sandbox.execute('/tmp/workspace', 'g++', [], '', {
            ...defaultOptions,
            writable: true
        });

        await started;

        const createCall = spawnMock.mock.calls.find(
            ([, args]) => (args as string[])[0] === 'create'
        );

        const dockerArgs = createCall?.[1] as string[];
        const mountIndex = dockerArgs.indexOf('--mount');

        expect(dockerArgs[mountIndex + 1]).toBe(
            'type=bind,source=/tmp/workspace,target=/workspace'
        );

        finishExecution(mainChild);

        await promise;
    });

    it('uses a read-only workspace mount by default', async () => {
        const { sandbox, spawnMock, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        await started;

        const createCall = spawnMock.mock.calls.find(
            ([, args]) => (args as string[])[0] === 'create'
        );

        const dockerArgs = createCall?.[1] as string[];
        const mountIndex = dockerArgs.indexOf('--mount');

        expect(dockerArgs[mountIndex + 1]).toBe(
            'type=bind,source=/tmp/workspace,target=/workspace,readonly'
        );

        finishExecution(mainChild);

        await promise;
    });

    it('parses execution metrics from stderr', async () => {
        const { sandbox, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/usr/bin/time',
            [],
            '',
            defaultOptions
        );

        await started;

        finishExecution(mainChild, {
            stderr: 'program warning\n__OJ_METRICS__0.12 2048'
        });

        const result = await promise;

        expect(result.timeMs).toBe(120);
        expect(result.memoryKb).toBe(2048);
        expect(result.stderr).toBe('program warning');
    });

    it('detects OOM termination', async () => {
        const oomState = JSON.stringify({
            OOMKilled: true,
            Error: '',
            ExitCode: 137
        });

        const { sandbox, mainChild, started } = createHarness(oomState);

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        await started;

        finishExecution(mainChild, {
            exitCode: 137
        });

        const result = await promise;

        expect(result.memoryExceeded).toBe(true);
        expect(result.exitCode).toBe(137);
    });

    it('enforces the output size limit', async () => {
        const { sandbox, spawnMock, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        await started;

        mainChild.stdout.emit('data', Buffer.from('x'.repeat(1024 * 1024 + 1)));

        expect(
            spawnMock.mock.calls.some(
                ([, args]) => (args as string[])[0] === 'kill'
            )
        ).toBe(true);

        finishExecution(mainChild, {
            exitCode: 137
        });

        const result = await promise;

        expect(result.outputExceeded).toBe(true);
        expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(
            1024 * 1024
        );
        expect(result.stdout).toBe('x'.repeat(1024 * 1024));
    });

    it('kills the container when execution times out', async () => {
        vi.useFakeTimers();

        const { sandbox, spawnMock, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            {
                ...defaultOptions,
                timeoutMs: 100
            }
        );

        await started;

        await vi.advanceTimersByTimeAsync(100);

        expect(
            spawnMock.mock.calls.some(
                ([, args]) => (args as string[])[0] === 'kill'
            )
        ).toBe(true);

        finishExecution(mainChild, {
            exitCode: 137
        });

        const result = await promise;

        expect(result.timedOut).toBe(true);
    });

    it.each([125, 126, 127])(
        'treats submitted-program exit code %i as a runtime exit code',
        async (exitCode) => {
            const { sandbox, mainChild, started } = createHarness();

            const promise = sandbox.execute(
                '/tmp/workspace',
                '/workspace/main',
                [],
                '',
                defaultOptions
            );

            await started;

            finishExecution(mainChild, {
                exitCode,
                stderr: 'Program error'
            });

            const result = await promise;

            expect(result.exitCode).toBe(exitCode);
            expect(result.stderr).toBe('Program error');
        }
    );

    it('rejects when Docker itself cannot start', async () => {
        const { sandbox, mainChild, started } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        await started;

        mainChild.emit('error', new Error('Docker not found'));

        await expect(promise).rejects.toThrow('Docker not found');
    });

    it('rejects when Docker reports an execution infrastructure error', async () => {
        const errorState = JSON.stringify({
            OOMKilled: false,
            Error: 'OCI runtime create failed',
            ExitCode: 125
        });

        const { sandbox, mainChild, started } = createHarness(errorState);

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        await started;

        finishExecution(mainChild, {
            exitCode: 125,
            stderr: 'Docker error'
        });

        await expect(promise).rejects.toThrow(
            'Docker execution failed: OCI runtime create failed'
        );
    });

    it('rejects when memory limit is invalid', async () => {
        const { sandbox, spawnMock } = createHarness();

        await expect(
            sandbox.execute('/tmp/workspace', '/workspace/main', [], '', {
                ...defaultOptions,
                memoryMb: 0
            })
        ).rejects.toThrow('Invalid sandbox memory limit');

        expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects when timeout is invalid', async () => {
        const { sandbox, spawnMock } = createHarness();

        await expect(
            sandbox.execute('/tmp/workspace', '/workspace/main', [], '', {
                ...defaultOptions,
                timeoutMs: -1
            })
        ).rejects.toThrow('Invalid sandbox timeout');

        expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects when Docker cannot create a container', async () => {
        const spawnMock = vi.fn((...spawnArgs: unknown[]) => {
            const args = spawnArgs[1] as string[];
            const child = new FakeChild();

            queueMicrotask(() => {
                if (args[0] === 'create') {
                    child.stderr.emit(
                        'data',
                        Buffer.from('Docker daemon unavailable')
                    );

                    child.emit('close', 1);
                    return;
                }

                child.emit('close', 0);
            });

            return child;
        });

        const sandbox = new DockerSandbox(
            spawnMock as unknown as typeof nodeSpawn
        );

        await expect(
            sandbox.execute(
                '/tmp/workspace',
                '/workspace/main',
                [],
                '',
                defaultOptions
            )
        ).rejects.toThrow('Docker command failed (1)');

        expect(
            spawnMock.mock.calls.some(
                ([, args]) => (args as string[])[0] === 'start'
            )
        ).toBe(false);
    });
});
