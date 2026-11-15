import {
    Collection,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    Property,
    type Rel
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { Problem } from './problem.model.js';
import { DiscussionVote } from './discussion-vote.model.js';

@Entity({ tableName: 'comments', schema: 'problems' })
@Index({ properties: ['problem'] })
@Index({ properties: ['userId'] })
export class Comment extends NumericIdEntity {
    @ManyToOne('Problem', { onDelete: 'cascade' })
    problem!: Rel<Problem>;

    // Source schema stores userId as a scalar without a User relation/FK.
    @Property({ fieldName: 'userId' })
    userId!: number;

    @ManyToOne(() => Comment, {
        fieldName: 'parentId',
        nullable: true,
        onDelete: 'cascade'
    })
    parent?: Rel<Comment>;

    @OneToMany(() => Comment, (x) => x.parent)
    replies = new Collection<Comment>(this);

    @Property({ length: 255, nullable: true })
    title?: string;

    @Property({ columnType: 'text' })
    content!: string;

    @Property({ fieldName: 'isSolution', default: false })
    isSolution = false;

    @Property({ length: 50, nullable: true })
    language?: string;

    @Property({ default: 0 })
    upvotes = 0;

    @Property({ default: 0 })
    downvotes = 0;

    @Property({ fieldName: 'isPinned', default: false })
    isPinned = false;

    @Property({ fieldName: 'isDeleted', default: false })
    isDeleted = false;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();

    @Property({ onUpdate: () => new Date(), defaultRaw: 'now()' })
    updatedAt = new Date();

    @OneToMany('DiscussionVote', 'comment')
    discussionVotes = new Collection<DiscussionVote>(this);
}
