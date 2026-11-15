import { Entity, ManyToOne, PrimaryKeyProp, type Rel } from '@mikro-orm/core';
import { Problem } from './problem.model.js';
import { Tag } from './tag.model.js';

@Entity({ tableName: 'problem_tags', schema: 'problems' })
export class ProblemTag {
    [PrimaryKeyProp]?: ['problem', 'tag'];

    @ManyToOne('Problem', { primary: true, onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @ManyToOne('Tag', { primary: true, onDelete: 'cascade' })
    tag!: Rel<Tag>;
}
