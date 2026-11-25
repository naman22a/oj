const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim());
}

export function outputsMatch(actual: string, expected: string): boolean {
    const normalize = (value: string) =>
        value.replace(/\r\n/g, '\n').trim().split(/\s+/).join(' ');

    return normalize(actual) === normalize(expected);
}
