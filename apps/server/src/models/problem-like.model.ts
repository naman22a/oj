import {
    Entity,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    type Rel
} from '@mikro-orm/core';
import { Problem } from './problem.model.js';

@Entity({ tableName: 'problem_likes', schema: 'problems' })
export class ProblemLike {
    [PrimaryKeyProp]?: ['userId', 'problem'];

    @Property({ fieldName: 'userId', primary: true })
    userId!: number;

    @ManyToOne('Problem', { primary: true, onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @Property({ fieldName: 'isLike' })
    isLike!: boolean;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();
}
