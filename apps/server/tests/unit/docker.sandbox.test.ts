import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn as nodeSpawn } from 'node:child_process';

import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';

class FakeChild extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();

    stdin = Object.assign(new EventEmitter(), {
        end: vi.fn()
    });
}

function createHarness(inspectOutput = 'false') {
    const mainChild = new FakeChild();

    const spawnMock = vi.fn((...spawnArgs: unknown[]) => {
        const args = spawnArgs[1] as string[];

        if (args[0] === 'run') {
            return mainChild;
        }

        const child = new FakeChild();

        queueMicrotask(() => {
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
        mainChild
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

    child.emit('close', options.exitCode ?? 0);
}

const defaultOptions = {
    timeoutMs: 2000,
    memoryMb: 256,
    writable: false
};

describe('DockerSandbox', () => {
    beforeEach(() => {
        vi.spyOn(process, 'getuid').mockReturnValue(1000);
        vi.spyOn(process, 'getgid').mockReturnValue(1000);
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('constructs Docker command with security restrictions', async () => {
        const { sandbox, spawnMock, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            'g++',
            ['main.cpp', '-o', 'main'],
            '',
            defaultOptions
        );

        const dockerArgs = spawnMock.mock.calls[0]?.[1] as string[];

        expect(spawnMock.mock.calls[0]?.[0]).toBe('docker');

        expect(dockerArgs).toContain('run');
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

        finishExecution(mainChild);

        await promise;
    });

    it('forwards stdin to the container process', async () => {
        const { sandbox, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            'hello world',
            defaultOptions
        );

        expect(mainChild.stdin.end).toHaveBeenCalledWith('hello world');

        finishExecution(mainChild);

        await promise;
    });

    it('uses a writable workspace mount when requested', async () => {
        const { sandbox, spawnMock, mainChild } = createHarness();

        const promise = sandbox.execute('/tmp/workspace', 'g++', [], '', {
            ...defaultOptions,
            writable: true
        });

        const dockerArgs = spawnMock.mock.calls[0]?.[1] as string[];

        const mountIndex = dockerArgs.indexOf('--mount');
        const mount = dockerArgs[mountIndex + 1];

        expect(mount).toBe('type=bind,source=/tmp/workspace,target=/workspace');

        finishExecution(mainChild);

        await promise;
    });

    it('parses execution metrics from stderr', async () => {
        const { sandbox, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/usr/bin/time',
            [],
            '',
            defaultOptions
        );

        finishExecution(mainChild, {
            stderr: 'program warning\n__OJ_METRICS__0.12 2048'
        });

        const result = await promise;

        expect(result.timeMs).toBe(120);
        expect(result.memoryKb).toBe(2048);
        expect(result.stderr).toBe('program warning');
    });

    it('detects OOM termination', async () => {
        const { sandbox, mainChild } = createHarness('true');

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        finishExecution(mainChild, { exitCode: 137 });

        const result = await promise;

        expect(result.memoryExceeded).toBe(true);
    });

    it('enforces the output size limit', async () => {
        const { sandbox, spawnMock, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        mainChild.stdout.emit('data', Buffer.alloc(1024 * 1024 + 1));

        expect(
            spawnMock.mock.calls.some(
                ([, args]) => (args as string[])[0] === 'kill'
            )
        ).toBe(true);

        finishExecution(mainChild, { exitCode: 137 });

        const result = await promise;

        expect(result.outputExceeded).toBe(true);
        expect(result.stdout).toBe('');
    });

    it('kills the container when execution times out', async () => {
        vi.useFakeTimers();

        const { sandbox, spawnMock, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            { ...defaultOptions, timeoutMs: 100 }
        );

        await vi.advanceTimersByTimeAsync(100);

        expect(
            spawnMock.mock.calls.some(
                ([, args]) => (args as string[])[0] === 'kill'
            )
        ).toBe(true);

        finishExecution(mainChild, { exitCode: 137 });

        const result = await promise;

        expect(result.timedOut).toBe(true);
    });

    it.each([125, 126, 127])(
        'rejects when Docker itself exits with code %i',
        async (exitCode) => {
            const { sandbox, mainChild } = createHarness();

            const promise = sandbox.execute(
                '/tmp/workspace',
                '/workspace/main',
                [],
                '',
                defaultOptions
            );

            finishExecution(mainChild, {
                exitCode,
                stderr: 'Docker error'
            });

            await expect(promise).rejects.toThrow(
                `Docker execution failed with exit code ${exitCode}`
            );
        }
    );

    it('rejects when Docker cannot be started', async () => {
        const { sandbox, mainChild } = createHarness();

        const promise = sandbox.execute(
            '/tmp/workspace',
            '/workspace/main',
            [],
            '',
            defaultOptions
        );

        const error = new Error('Docker not found');

        mainChild.emit('error', error);

        await expect(promise).rejects.toThrow('Docker not found');
    });

    it('rejects when memory limit is invalid', async () => {
        const { sandbox, spawnMock } = createHarness();

        await expect(
            sandbox.execute('/tmp/workspace', '/workspace/main', [], '', {
                ...defaultOptions,
                memoryMb: 0
            })
        ).rejects.toThrow('Invalid memory limit: 0');

        expect(spawnMock).not.toHaveBeenCalled();
    });

    it('rejects when timeout is invalid', async () => {
        const { sandbox, spawnMock } = createHarness();

        await expect(
            sandbox.execute('/tmp/workspace', '/workspace/main', [], '', {
                ...defaultOptions,
                timeoutMs: -1
            })
        ).rejects.toThrow('Invalid timeout: -1');

        expect(spawnMock).not.toHaveBeenCalled();
    });
});
