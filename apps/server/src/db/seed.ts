import { MikroORM } from '@mikro-orm/postgresql';
import config from '../config/mikro-orm.config.js';
import { DatabaseSeeder } from './seeders/DatabaseSeeder.js';

async function main() {
    const orm = await MikroORM.init(config);

    try {
        await orm.getSeeder().seed(DatabaseSeeder);
        console.log('Database seeding completed successfully.');
    } finally {
        await orm.close(true);
    }
}

main().catch((error) => {
    console.error('Database seeding failed:', error);
    process.exit(1);
});
