import dotenv from 'dotenv';

dotenv.config({
    path: '.env.test',
    override: true
});

if (process.env.NODE_ENV !== 'test') {
    throw new Error('Integration tests must run with NODE_ENV=test');
}

if (!process.env.DATABASE_URL?.includes('oj_test')) {
    throw new Error('Refusing to run tests against a non-test database');
}
