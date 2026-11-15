import { PrimaryKey, Property } from '@mikro-orm/core';

export abstract class NumericIdEntity {
    @PrimaryKey()
    id!: number;
}

export abstract class CreatedAtEntity {
    @Property({ fieldName: 'created_at', defaultRaw: 'now()' })
    createdAt: Date = new Date();
}
