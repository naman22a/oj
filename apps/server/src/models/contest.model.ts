import {
    Collection,
    Entity,
    Index,
    OneToMany,
    Property,
    Unique
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { ContestProblem } from './contest-problem.model.js';
import { ContestParticipant } from './contest-participant.model.js';

@Entity({ tableName: 'contests', schema: 'contests' })
@Index({ properties: ['startTime'] })
export class Contest extends NumericIdEntity {
    @Property({ length: 255 })
    title!: string;

    @Property({ length: 255 })
    @Unique()
    slug!: string;

    @Property({ columnType: 'text', nullable: true })
    description?: string;

    @Property({ fieldName: 'startTime' })
    startTime!: Date;

    @Property({ fieldName: 'endTime' })
    endTime!: Date;

    @Property()
    duration!: number;

    @Property({ fieldName: 'isPublic', default: true })
    isPublic = true;

    @Property({ fieldName: 'createdById' })
    createdById!: number;

    @Property({ fieldName: 'createdAt', defaultRaw: 'now()' })
    createdAt = new Date();

    @OneToMany(() => ContestProblem, (x) => x.contest)
    contestProblems = new Collection<ContestProblem>(this);

    @OneToMany(() => ContestParticipant, (x) => x.contest)
    contestParticipants = new Collection<ContestParticipant>(this);
}
