import { describe, expect, it } from 'vitest';

import { JavaCompiler } from '../../src/workers/execution/compiler/java.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';

describe('Java execution integration', () => {
    it('compiles and executes a Java submission with stdin', async () => {
        const sandbox = new DockerSandbox();
        const compiler = new JavaCompiler(sandbox);

        const sourceCode = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int a = scanner.nextInt();
        int b = scanner.nextInt();

        System.out.println(a + b);
    }
}
`;

        const workspace = `/tmp/java-integration-${crypto.randomUUID()}`;

        const { mkdir, rm } = await import('node:fs/promises');

        await mkdir(workspace, { recursive: true });

        try {
            const compilation = await compiler.compile(sourceCode, workspace);

            expect(compilation.success).toBe(true);
            expect(compilation.command).toBe('java');

            const execution = await sandbox.execute(
                workspace,
                compilation.command!,
                compilation.args ?? [],
                '10 20',
                {
                    timeoutMs: 2_000,
                    memoryMb: 256,
                    writable: false,
                    image: 'oj-java:local'
                }
            );

            expect(execution.exitCode).toBe(0);
            expect(execution.timedOut).toBe(false);
            expect(execution.memoryExceeded).toBe(false);
            expect(execution.outputExceeded).toBe(false);
            expect(execution.stdout.trim()).toBe('30');
        } finally {
            await rm(workspace, { recursive: true, force: true });
        }
    });
});
