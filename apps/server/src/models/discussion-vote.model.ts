import {
    Entity,
    ManyToOne,
    PrimaryKeyProp,
    Property,
    Enum,
    type Rel
} from '@mikro-orm/core';
import { Comment } from './comment.model.js';
import { VoteType } from './enums.js';

@Entity({ tableName: 'discussion_votes', schema: 'problems' })
export class DiscussionVote {
    [PrimaryKeyProp]?: ['userId', 'comment'];

    @Property({ fieldName: 'userId', primary: true })
    userId!: number;

    @ManyToOne(() => Comment, { primary: true, onDelete: 'cascade' })
    comment!: Rel<Comment>;

    @Enum(() => VoteType)
    voteType!: VoteType;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();
}
