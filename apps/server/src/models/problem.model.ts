import {
    Collection,
    Entity,
    Enum,
    OneToMany,
    OptionalProps,
    Property,
    Unique
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { Difficulty } from './enums.js';
import { ProblemTag } from './problem-tag.model.js';
import { ProblemCompany } from './problem-company.model.js';
import { TestCase } from './test-case.model.js';
import { Editorial } from './editorial.model.js';
import { Comment } from './comment.model.js';
import { Bookmark } from './bookmark.model.js';
import { ProblemLike } from './problem-like.model.js';

@Entity({ tableName: 'problems', schema: 'problems' })
export class Problem extends NumericIdEntity {
    [OptionalProps]?:
        | 'acceptanceRate'
        | 'totalSubmissions'
        | 'totalAccepted'
        | 'likes'
        | 'dislikes'
        | 'similarProblems'
        | 'createdAt'
        | 'updatedAt'
        | 'timeLimitMs'
        | 'memoryLimitMb';

    @Property({ length: 255 })
    title!: string;

    @Property({ length: 255 })
    @Unique()
    slug!: string;

    @Property({ columnType: 'text' })
    description!: string;

    @Enum(() => Difficulty)
    difficulty!: Difficulty;

    @Property({
        fieldName: 'acceptanceRate',
        columnType: 'numeric(5,2)',
        default: '0.00'
    })
    acceptanceRate = '0.00';

    @Property({ fieldName: 'totalSubmissions', default: 0 })
    totalSubmissions = 0;

    @Property({ fieldName: 'totalAccepted', default: 0 })
    totalAccepted = 0;

    @Property({ default: 0 })
    likes = 0;

    @Property({ default: 0 })
    dislikes = 0;

    @Property({ nullable: true, columnType: 'text' })
    constraints?: string;

    @Property({ type: 'array', columnType: 'text[]', default: [] })
    hints: string[] = [];

    @Property({
        type: 'array',
        columnType: 'int[]',
        fieldName: 'similarProblems',
        default: []
    })
    similarProblems: number[] = [];

    // The source schema has createdById but no declared User relation/FK.
    @Property({ fieldName: 'createdById' })
    createdById!: number;

    @Property({ fieldName: 'timeLimitMs', default: 2000 })
    timeLimitMs = 2000;

    @Property({ fieldName: 'memoryLimitMb', default: 256 })
    memoryLimitMb = 256;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();

    @Property({ onUpdate: () => new Date(), defaultRaw: 'now()' })
    updatedAt = new Date();

    @OneToMany('ProblemTag', 'problem')
    problemTags = new Collection<ProblemTag>(this);

    @OneToMany('ProblemCompany', 'problem')
    problemCompanies = new Collection<ProblemCompany>(this);

    @OneToMany('TestCase', 'problem')
    testCases = new Collection<TestCase>(this);

    @OneToMany('Editorial', 'problem')
    editorials = new Collection<Editorial>(this);

    @OneToMany('Comment', 'problem')
    comments = new Collection<Comment>(this);

    @OneToMany('Bookmark', 'problem')
    bookmarks = new Collection<Bookmark>(this);

    @OneToMany('ProblemLike', 'problem')
    problemLikes = new Collection<ProblemLike>(this);
}
