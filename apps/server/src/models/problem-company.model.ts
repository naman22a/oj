import {
    Entity,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    type Rel
} from '@mikro-orm/core';
import { Problem } from './problem.model.js';
import { Company } from './company.model.js';

@Entity({ tableName: 'problem_companies', schema: 'problems' })
export class ProblemCompany {
    [PrimaryKeyProp]?: ['problem', 'company'];

    @ManyToOne('Problem', { primary: true, onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @ManyToOne('Company', { primary: true, onDelete: 'cascade' })
    company!: Rel<Company>;

    @Property({ default: 1 })
    frequency = 1;

    @Property({
        fieldName: 'lastAskedDate',
        columnType: 'date',
        nullable: true
    })
    lastAskedDate?: Date;
}
