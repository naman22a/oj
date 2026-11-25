import { describe, expect, it } from 'vitest';
import { outputsMatch } from '../../src/workers/execution/utils/output-comparator.js';

describe('outputsMatch', () => {
    it('matches identical outputs', () => {
        expect(outputsMatch('42', '42')).toBe(true);
    });

    it('ignores leading and trailing whitespace', () => {
        expect(outputsMatch('  42  \n', '42')).toBe(true);
    });

    it('normalizes multiple spaces', () => {
        expect(outputsMatch('1    2     3', '1 2 3')).toBe(true);
    });

    it('normalizes tabs and newlines', () => {
        expect(outputsMatch('1\t2\n3', '1 2 3')).toBe(true);
    });

    it('handles Windows line endings', () => {
        expect(outputsMatch('1\r\n2\r\n3', '1\n2\n3')).toBe(true);
    });

    it('returns false for different values', () => {
        expect(outputsMatch('42', '43')).toBe(false);
    });

    it('returns false when the number of tokens differs', () => {
        expect(outputsMatch('1 2 3', '1 2')).toBe(false);
    });

    it('handles empty outputs', () => {
        expect(outputsMatch('', '')).toBe(true);
    });

    it('handles whitespace-only outputs', () => {
        expect(outputsMatch('   \n\t', '')).toBe(true);
    });

    it('does not ignore differences in token order', () => {
        expect(outputsMatch('1 2 3', '3 2 1')).toBe(false);
    });

    it('does not ignore differences in case', () => {
        expect(outputsMatch('Accepted', 'accepted')).toBe(false);
    });
});
