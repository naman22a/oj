import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Tag } from '../../models/tag.model.ts';

const tags = [
    ['Array', 'array'],
    ['String', 'string'],
    ['Hash Table', 'hash-table'],
    ['Dynamic Programming', 'dynamic-programming'],
    ['Math', 'math'],
    ['Sorting', 'sorting'],
    ['Greedy', 'greedy'],
    ['Depth-First Search', 'depth-first-search'],
    ['Breadth-First Search', 'breadth-first-search'],
    ['Binary Search', 'binary-search'],
    ['Tree', 'tree'],
    ['Graph', 'graph'],
    ['Two Pointers', 'two-pointers'],
    ['Sliding Window', 'sliding-window'],
    ['Backtracking', 'backtracking'],
    ['Stack', 'stack'],
    ['Linked List', 'linked-list'],
    ['Heap', 'heap'],
    ['Bit Manipulation', 'bit-manipulation'],
    ['Recursion', 'recursion']
] as const;

export class TagSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        for (const [name, slug] of tags) {
            await em.upsert(
                Tag,
                { name, slug },
                { onConflictFields: ['slug'], onConflictAction: 'ignore' }
            );
        }
        console.log(`Seeded ${tags.length} tags`);
    }
}
