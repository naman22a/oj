export function outputsMatch(actual: string, expected: string): boolean {
    const normalize = (value: string) =>
        value.replace(/\r\n/g, '\n').trim().split(/\s+/).join(' ');

    return normalize(actual) === normalize(expected);
}
