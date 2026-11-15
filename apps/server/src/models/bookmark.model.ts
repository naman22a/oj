import {
    Entity,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    type Rel
} from '@mikro-orm/core';
import { Problem } from './problem.model.js';

@Entity({ tableName: 'bookmarks', schema: 'problems' })
export class Bookmark {
    [PrimaryKeyProp]?: ['userId', 'problem'];

    @Property({ fieldName: 'userId', primary: true })
    userId!: number;

    @ManyToOne('Problem', { primary: true, onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @Property({ columnType: 'text', nullable: true })
    notes?: string;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();
}
