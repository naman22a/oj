import { MikroORM } from '@mikro-orm/core';
import config from '../config/mikro-orm.config.js';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';

let ormInstance: MikroORM<PostgreSqlDriver> | null = null;

export const getORM = async () => {
    if (!ormInstance) {
        ormInstance = await MikroORM.init(config);
    }
    return ormInstance;
};

export const getEM = async () => {
    const orm = await getORM();
    return orm.em.fork();
};

export const closeORM = async () => {
    if (ormInstance) {
        await ormInstance.close(true);
        ormInstance = null;
    }
};
