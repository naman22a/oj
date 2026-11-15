import {
    Entity,
    Enum,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    type Rel
} from '@mikro-orm/core';
import { ProblemStatus } from './enums.js';
import { Submission } from './submission.model.js';

@Entity({ tableName: 'user_problem_status', schema: 'submissions' })
export class UserProblemStatus {
    [PrimaryKeyProp]?: ['userId', 'problemId'];

    @Property({ fieldName: 'userId', primary: true })
    userId!: number;

    @Property({ fieldName: 'problemId', primary: true })
    problemId!: number;

    @Enum(() => ProblemStatus)
    status!: ProblemStatus;

    @Property({ fieldName: 'lastAttemptedAt', nullable: true })
    lastAttemptedAt?: Date;

    @Property({ fieldName: 'solvedAt', nullable: true })
    solvedAt?: Date;

    @Property({ default: 0 })
    attempts = 0;

    @ManyToOne('Submission', {
        fieldName: 'lastSubmissionId',
        nullable: true
    })
    lastSubmission?: Rel<Submission>;
}
