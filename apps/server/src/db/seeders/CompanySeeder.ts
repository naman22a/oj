import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Company } from '../../models/company.model.ts';

const companies = [
    ['Google', 'google'],
    ['Amazon', 'amazon'],
    ['Microsoft', 'microsoft'],
    ['Meta', 'meta'],
    ['Apple', 'apple'],
    ['Netflix', 'netflix'],
    ['Uber', 'uber'],
    ['Flipkart', 'flipkart'],
    ['Adobe', 'adobe'],
    ['Goldman Sachs', 'goldman-sachs']
] as const;

export class CompanySeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        for (const [name, slug] of companies) {
            await em.upsert(
                Company,
                { name, slug },
                { onConflictFields: ['slug'], onConflictAction: 'ignore' }
            );
        }
        console.log(`Seeded ${companies.length} companies`);
    }
}
