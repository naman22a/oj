import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { ExecutionService } from '../../src/workers/execution/execution.service.js';
import { CppCompiler } from '../../src/workers/execution/compiler/cpp.compiler.js';
import { DockerSandbox } from '../../src/workers/execution/sandbox/docker.sandbox.js';
import { images } from '../../src/workers/execution/config/images.ts';

const sandbox = new DockerSandbox();
const compiler = new CppCompiler(sandbox);
const executionService = new ExecutionService(compiler, sandbox);

const executionOptions = {
    timeLimitMs: 2000,
    memoryLimitMb: 256
};

function getSandboxContainerIds(): string[] {
    const output = execFileSync(
        'docker',
        ['ps', '-aq', '--filter', `ancestor=${images.cpp}`],
        { encoding: 'utf-8' }
    ).trim();

    return output ? output.split('\n') : [];
}

describe('C++ execution pipeline', () => {
    it('accepts a correct C++ solution', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << '\\n';
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [
                {
                    input: '2 3',
                    expectedOutput: '5'
                },
                {
                    input: '10 20',
                    expectedOutput: '30'
                },
                {
                    input: '-5 8',
                    expectedOutput: '3'
                }
            ],
            executionOptions
        );

        expect(result.verdict).toBe('ACCEPTED');
        expect(result.testCasesPassed).toBe(3);
        expect(result.totalTestCases).toBe(3);
        expect(result.results).toHaveLength(3);
        expect(result.errorMessage).toBeUndefined();
    }, 60_000);

    it('returns WRONG_ANSWER for an incorrect solution', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b << '\\n';
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [
                {
                    input: '10 5',
                    expectedOutput: '15'
                }
            ],
            executionOptions
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
        expect(result.testCasesPassed).toBe(0);
        expect(result.totalTestCases).toBe(1);
        expect(result.results).toHaveLength(1);
    }, 60_000);

    it('returns COMPILE_ERROR for invalid C++ source', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World"
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [
                {
                    input: '',
                    expectedOutput: 'Hello World'
                }
            ],
            executionOptions
        );

        expect(result.verdict).toBe('COMPILE_ERROR');
        expect(result.testCasesPassed).toBe(0);
        expect(result.totalTestCases).toBe(1);
        expect(result.errorMessage).toBeTruthy();
        expect(result.runtime).toBeGreaterThanOrEqual(0);
    }, 60_000);

    it('returns TIME_LIMIT_EXCEEDED for an infinite loop', async () => {
        const sourceCode = `
int main() {
    while (true) {}
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 1000,
                memoryLimitMb: 256
            }
        );

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
        expect(result.testCasesPassed).toBe(0);
    }, 60_000);

    it('returns RUNTIME_ERROR for a segmentation fault', async () => {
        const sourceCode = `
int main() {
    int* ptr = nullptr;
    *ptr = 42;
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            executionOptions
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.testCasesPassed).toBe(0);
    }, 60_000);

    it('returns RUNTIME_ERROR for a non-zero exit code', async () => {
        const sourceCode = `
int main() {
    return 1;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            executionOptions
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.testCasesPassed).toBe(0);
    }, 60_000);

    it('returns RUNTIME_ERROR when output limit is exceeded', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    while (true) {
        cout << "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    }
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            executionOptions
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.errorMessage).toBe('Output limit exceeded');
        expect(result.testCasesPassed).toBe(0);
    }, 60_000);

    it('returns MEMORY_LIMIT_EXCEEDED when memory limit is exceeded', async () => {
        const sourceCode = `
#include <cstddef>

int main() {
    constexpr std::size_t size = 512ULL * 1024 * 1024;

    volatile char* memory = new char[size];

    for (std::size_t i = 0; i < size; i += 4096) {
        memory[i] = 1;
    }

    delete[] memory;
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            {
                timeLimitMs: 10_000,
                memoryLimitMb: 64
            }
        );

        expect(result.verdict).toBe('MEMORY_LIMIT_EXCEEDED');
        expect(result.testCasesPassed).toBe(0);
    }, 60_000);

    it('removes the Docker container after successful execution', async () => {
        const containersBefore = getSandboxContainerIds();

        const result = await executionService.execute(
            `
#include <iostream>

int main() {
    std::cout << "OK";
    return 0;
}
`,
            [{ input: '', expectedOutput: 'OK' }],
            executionOptions
        );

        expect(result.verdict).toBe('ACCEPTED');

        const containersAfter = getSandboxContainerIds();

        expect(containersAfter).toEqual(containersBefore);
    }, 60_000);

    it('removes the Docker container after failed execution', async () => {
        const containersBefore = getSandboxContainerIds();

        const result = await executionService.execute(
            `
int main() {
    int* ptr = nullptr;
    *ptr = 42;
    return 0;
}
`,
            [{ input: '', expectedOutput: '' }],
            executionOptions
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');

        const containersAfter = getSandboxContainerIds();

        expect(containersAfter).toEqual(containersBefore);
    }, 60_000);

    it('handles empty stdin correctly', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World\\n";
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: 'Hello World' }],
            executionOptions
        );

        expect(result.verdict).toBe('ACCEPTED');
        expect(result.testCasesPassed).toBe(1);
    }, 60_000);

    it('returns WRONG_ANSWER when a later test case fails', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    cout << n << '\\n';
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [
                { input: '10', expectedOutput: '10' },
                { input: '20', expectedOutput: '999' },
                { input: '30', expectedOutput: '30' }
            ],
            executionOptions
        );

        expect(result.verdict).toBe('WRONG_ANSWER');
        expect(result.testCasesPassed).toBe(1);
        expect(result.totalTestCases).toBe(3);
        expect(result.results).toHaveLength(2);
    }, 60_000);

    it('returns TIME_LIMIT_EXCEEDED when a later test case times out', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;

    if (n == 2) {
        while (true) {}
    }

    cout << n << '\\n';
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [
                { input: '1', expectedOutput: '1' },
                { input: '2', expectedOutput: '2' }
            ],
            {
                timeLimitMs: 1000,
                memoryLimitMb: 256
            }
        );

        expect(result.verdict).toBe('TIME_LIMIT_EXCEEDED');
        expect(result.testCasesPassed).toBe(1);
        expect(result.totalTestCases).toBe(2);
        expect(result.results).toHaveLength(2);
    }, 60_000);

    it('does not treat stderr output as a runtime error when exit code is zero', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "OK\\n";
    cerr << "Debug information\\n";
    return 0;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: 'OK' }],
            executionOptions
        );

        expect(result.verdict).toBe('ACCEPTED');
        expect(result.testCasesPassed).toBe(1);
    }, 60_000);

    it('preserves stderr when a program exits with a non-zero code', async () => {
        const sourceCode = `
#include <iostream>
using namespace std;

int main() {
    cerr << "Something went wrong\\n";
    return 1;
}
`;

        const result = await executionService.execute(
            sourceCode,
            [{ input: '', expectedOutput: '' }],
            executionOptions
        );

        expect(result.verdict).toBe('RUNTIME_ERROR');
        expect(result.testCasesPassed).toBe(0);
        expect(result.errorMessage).toContain('Something went wrong');
    }, 60_000);
});
