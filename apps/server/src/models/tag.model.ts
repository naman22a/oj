import {
    Collection,
    Entity,
    OneToMany,
    Property,
    Unique
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { ProblemTag } from './problem-tag.model.js';

@Entity({ tableName: 'tags', schema: 'problems' })
export class Tag extends NumericIdEntity {
    @Property({ length: 50 })
    @Unique()
    name!: string;

    @Property({ length: 50 })
    @Unique()
    slug!: string;

    @Property({ nullable: true, columnType: 'text' })
    description?: string;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();

    @OneToMany(() => ProblemTag, (x) => x.tag)
    problemTags = new Collection<ProblemTag>(this);
}
