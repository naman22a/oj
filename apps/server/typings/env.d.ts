declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test' | 'provision';
            PORT: string;
            CLIENT_URL: string;
            SERVER_URL: string;
            DATABASE_URL: string;
            RESEND_API_KEY: string;
            REDIS_URL: string;
        }
    }
}

export {};
