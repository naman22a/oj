import {
    Entity,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    type Rel
} from '@mikro-orm/core';
import { Contest } from './contest.model.js';

@Entity({ tableName: 'contest_problems', schema: 'contests' })
export class ContestProblem {
    [PrimaryKeyProp]?: ['contest', 'problemId'];

    @ManyToOne(() => Contest, { primary: true, onDelete: 'cascade' })
    contest!: Rel<Contest>;

    @Property({ fieldName: 'problemId', primary: true })
    problemId!: number;

    @Property({ fieldName: 'problemOrder' })
    problemOrder!: number;

    @Property({ default: 100 })
    points = 100;
}
