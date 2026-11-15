import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Difficulty } from '../../models/enums.ts';
import { Problem } from '../../models/problem.model.ts';
import { Tag } from '../../models/tag.model.ts';
import { Company } from '../../models/company.model.ts';
import { TestCase } from '../../models/test-case.model.ts';
import { ProblemTag } from '../../models/problem-tag.model.ts';
import { ProblemCompany } from '../../models/problem-company.model.ts';
import { User } from '../../models/user.model.ts';

type TestCaseSeed = {
    input: string;
    expectedOutput: string;
    isSample: boolean;
    explanation?: string;
};

type ProblemSeed = {
    title: string;
    slug: string;
    description: string;
    difficulty: Difficulty;
    constraints: string;
    hints: string[];
    tags: string[];
    companies: Array<{ slug: string; frequency: number }>;
    testCases: TestCaseSeed[];
};

const problems: ProblemSeed[] = [
    {
        title: 'Two Sum',
        slug: 'two-sum',
        description:
            'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        difficulty: Difficulty.EASY,
        constraints:
            '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
        hints: ['Try using a hash map to store complements'],
        tags: ['array', 'hash-table'],
        companies: [
            { slug: 'google', frequency: 95 },
            { slug: 'amazon', frequency: 88 }
        ],
        testCases: [
            {
                input: '4\n2 7 11 15\n9',
                expectedOutput: '0 1',
                isSample: true,
                explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
            },
            {
                input: '3\n3 2 4\n6',
                expectedOutput: '1 2',
                isSample: true,
                explanation: 'nums[1] + nums[2] = 2 + 4 = 6'
            },
            { input: '2\n3 3\n6', expectedOutput: '0 1', isSample: false },
            { input: '5\n1 2 3 4 5\n9', expectedOutput: '3 4', isSample: false }
        ]
    },
    {
        title: 'Valid Anagram',
        slug: 'valid-anagram',
        description:
            'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
        difficulty: Difficulty.EASY,
        constraints:
            '1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.',
        hints: ['Try sorting both strings', 'Or use a frequency counter'],
        tags: ['string', 'hash-table', 'sorting'],
        companies: [{ slug: 'amazon', frequency: 72 }],
        testCases: [
            {
                input: '"anagram"\n"nagaram"',
                expectedOutput: 'true',
                isSample: true
            },
            { input: '"rat"\n"car"', expectedOutput: 'false', isSample: true },
            { input: '"a"\n"a"', expectedOutput: 'true', isSample: false }
        ]
    },
    {
        title: 'Climbing Stairs',
        slug: 'climbing-stairs',
        description:
            'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
        difficulty: Difficulty.EASY,
        constraints: '1 <= n <= 45',
        hints: ['Think about Fibonacci', 'dp[i] = dp[i-1] + dp[i-2]'],
        tags: ['dynamic-programming', 'math', 'recursion'],
        companies: [
            { slug: 'amazon', frequency: 60 },
            { slug: 'google', frequency: 55 },
            { slug: 'adobe', frequency: 40 }
        ],
        testCases: [
            {
                input: '2',
                expectedOutput: '2',
                isSample: true,
                explanation: '1+1, 2'
            },
            {
                input: '3',
                expectedOutput: '3',
                isSample: true,
                explanation: '1+1+1, 1+2, 2+1'
            },
            { input: '5', expectedOutput: '8', isSample: false },
            { input: '10', expectedOutput: '89', isSample: false }
        ]
    },
    {
        title: 'Best Time to Buy and Sell Stock',
        slug: 'best-time-to-buy-and-sell-stock',
        description:
            'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.',
        difficulty: Difficulty.EASY,
        constraints: '1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4',
        hints: ['Track the minimum price seen so far'],
        tags: ['array', 'dynamic-programming', 'sliding-window'],
        companies: [
            { slug: 'amazon', frequency: 80 },
            { slug: 'flipkart', frequency: 65 }
        ],
        testCases: [
            {
                input: '6\n7 1 5 3 6 4',
                expectedOutput: '5',
                isSample: true,
                explanation: 'Buy on day 2, sell on day 5'
            },
            {
                input: '5\n7 6 4 3 1',
                expectedOutput: '0',
                isSample: true,
                explanation: 'No profit possible'
            },
            { input: '3\n2 4 1', expectedOutput: '2', isSample: false }
        ]
    },
    {
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating-characters',
        description:
            'Given a string `s`, find the length of the longest substring without repeating characters.',
        difficulty: Difficulty.MEDIUM,
        constraints:
            '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
        hints: ['Use a sliding window with a set'],
        tags: ['string', 'hash-table', 'sliding-window', 'two-pointers'],
        companies: [
            { slug: 'amazon', frequency: 85 },
            { slug: 'microsoft', frequency: 75 },
            { slug: 'google', frequency: 70 }
        ],
        testCases: [
            {
                input: '"abcabcbb"',
                expectedOutput: '3',
                isSample: true,
                explanation: 'abc'
            },
            {
                input: '"bbbbb"',
                expectedOutput: '1',
                isSample: true,
                explanation: 'b'
            },
            {
                input: '"pwwkew"',
                expectedOutput: '3',
                isSample: true,
                explanation: 'wke'
            },
            { input: '""', expectedOutput: '0', isSample: false }
        ]
    }
];

export class ProblemSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const admin = await em.findOneOrFail(User, {
            email: 'admin@gmail.com'
        });

        for (const data of problems) {
            // Slug is unique. If already present, leave the existing problem and its
            // related rows untouched; this prevents duplicate test cases and joins.
            const existing = await em.findOne(Problem, { slug: data.slug });
            if (existing) continue;

            const problem = em.create(Problem, {
                title: data.title,
                slug: data.slug,
                description: data.description,
                difficulty: data.difficulty,
                constraints: data.constraints,
                hints: data.hints,
                createdById: admin.id
            });
            await em.flush();

            for (const slug of data.tags) {
                const tag = await em.findOneOrFail(Tag, { slug });
                em.create(ProblemTag, { problem, tag });
            }

            for (const { slug, frequency } of data.companies) {
                const company = await em.findOneOrFail(Company, { slug });
                em.create(ProblemCompany, { problem, company, frequency });
            }

            for (const testCase of data.testCases) {
                em.create(TestCase, { problem, ...testCase });
            }

            await em.flush();
            console.log(`Seeded problem: ${data.title}`);
        }
    }
}
