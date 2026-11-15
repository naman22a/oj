import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TagSeeder } from './TagSeeder.ts';
import { CompanySeeder } from './CompanySeeder.ts';
import { UserSeeder } from './UserSeeder.ts';
import { ProblemSeeder } from './ProblemSeeder.ts';

export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        await this.call(em, [
            TagSeeder,
            CompanySeeder,
            UserSeeder,
            ProblemSeeder
        ]);
    }
}
