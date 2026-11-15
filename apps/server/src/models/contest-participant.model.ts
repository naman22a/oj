import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { Contest } from './contest.model.js';

@Entity({ tableName: 'contest_participants', schema: 'contests' })
@Unique({ properties: ['contest', 'userId'] })
@Index({ properties: ['userId'] })
export class ContestParticipant extends NumericIdEntity {
    @ManyToOne(() => Contest, { onDelete: 'cascade' })
    contest!: Contest;

    @Property({ fieldName: 'userId' })
    userId!: number;

    @Property({ default: 0 })
    score = 0;

    @Property({ nullable: true })
    rank?: number;

    @Property({ fieldName: 'finishTime', nullable: true })
    finishTime?: Date;

    @Property({ fieldName: 'registeredAt', defaultRaw: 'now()' })
    registeredAt = new Date();
}
