import 'dotenv/config';
import * as path from 'path';
import { PostgreSqlDriver, type Options } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { __prod__ } from '../common/constants/index.js';

const config: Options = {
    driver: PostgreSqlDriver,
    clientUrl: process.env.DATABASE_URL!,

    entities: ['./dist/**/*.model.js'],
    entitiesTs: ['./src/**/*.model.ts'],

    metadataProvider: TsMorphMetadataProvider,

    migrations: {
        path: path.join(process.cwd(), 'dist/migrations'),
        pathTs: path.join(process.cwd(), 'src/migrations'),
        glob: '!(*.d).{js,ts}',
        snapshot: false
    },

    debug: !__prod__,
    highlighter: new SqlHighlighter()
};

export default config;
