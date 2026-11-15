import { Entity, Index, ManyToOne, Property, type Rel } from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { Problem } from './problem.model.js';

@Entity({ tableName: 'test_cases', schema: 'problems' })
@Index({ properties: ['problem'] })
export class TestCase extends NumericIdEntity {
    @ManyToOne('Problem', { onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @Property({ columnType: 'text' })
    input!: string;

    @Property({ columnType: 'text' })
    expectedOutput!: string;

    @Property({ fieldName: 'isSample', default: false })
    isSample = false;

    @Property({ fieldName: 'isActive', default: true })
    isActive = true;

    @Property({ nullable: true, columnType: 'text' })
    explanation?: string;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();
}
