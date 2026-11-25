import 'dotenv/config';

import { buildApp } from './app.ts';
import { getORM } from './db/index.ts';
import { initializeSocket } from './infrastructure/socket/index.ts';
import { __prod__ } from './common/constants/index.ts';

const port = Number.parseInt(process.env.PORT || '', 10) || 5000;

async function start() {
    const app = await buildApp();

    try {
        const orm = await getORM();
        await orm.connect();

        await initializeSocket(app.server);

        await app.listen({
            port,
            host: __prod__ ? '0.0.0.0' : '127.0.0.1'
        });
    } catch (error) {
        app.log.error(error);
        await app.close();
        process.exit(1);
    }
}

start();
