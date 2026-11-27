import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',

    ...(process.env.NODE_ENV === 'test'
        ? { level: 'silent' }
        : process.env.NODE_ENV !== 'production'
          ? {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname'
                    }
                }
            }
          : {})
});
