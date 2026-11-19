import {
    Collection,
    Entity,
    Enum,
    Index,
    OneToMany,
    OptionalProps,
    Property,
    Unique
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { SubmissionLanguage, SubmissionStatus } from './enums.js';
import { UserProblemStatus } from './user-problem-status.model.js';

@Entity({ tableName: 'submissions', schema: 'submissions' })
@Index({ properties: ['userId', 'problemId'] })
@Index({ properties: ['status'] })
@Unique({ properties: ['userId', 'idempotencyKey'] })
export class Submission extends NumericIdEntity {
    [OptionalProps]?:
        | 'runtime'
        | 'memory'
        | 'testCasesPassed'
        | 'totalTestCases'
        | 'errorMessage'
        | 'idempotencyKey'
        | 'submittedAt';

    @Property({ fieldName: 'userId' })
    userId!: number;

    @Property({ fieldName: 'problemId' })
    problemId!: number;

    @Enum(() => SubmissionLanguage)
    language!: SubmissionLanguage;

    @Property({ columnType: 'text' })
    code!: string;

    @Enum(() => SubmissionStatus)
    status!: SubmissionStatus;

    @Property({ nullable: true })
    runtime?: number;

    @Property({ nullable: true })
    memory?: number;

    @Property({ fieldName: 'testCasesPassed', default: 0 })
    testCasesPassed = 0;

    @Property({ fieldName: 'totalTestCases', default: 0 })
    totalTestCases = 0;

    @Property({ fieldName: 'errorMessage', columnType: 'text', nullable: true })
    errorMessage?: string;

    @Property({ fieldName: 'submittedAt', defaultRaw: 'now()' })
    submittedAt = new Date();

    @Property({ fieldName: 'idempotencyKey', nullable: true })
    idempotencyKey?: string;

    @OneToMany(() => UserProblemStatus, (x) => x.lastSubmission)
    userProblemStatuses = new Collection<UserProblemStatus>(this);
}
