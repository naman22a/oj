import { MikroORM } from '@mikro-orm/postgresql';
import config from './mikro-orm.config.js';

async function main() {
    const orm = await MikroORM.init(config);

    try {
        await orm.getMigrator().up();
        console.log('Database migrations completed successfully.');
    } finally {
        await orm.close(true);
    }
}

main().catch((error) => {
    console.error('Database migration failed:', error);
    process.exit(1);
});
