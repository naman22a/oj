import { Entity, ManyToOne, Property, type Rel } from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { Problem } from './problem.model.js';

@Entity({ tableName: 'editorials', schema: 'problems' })
export class Editorial extends NumericIdEntity {
    @ManyToOne('Problem', { onDelete: 'cascade' })
    problem!: Rel<Problem>;

    @Property({ length: 255 })
    title!: string;

    @Property({ length: 100, nullable: true })
    approach?: string;

    @Property({ columnType: 'text' })
    content!: string;

    @Property({ columnType: 'jsonb', nullable: true })
    codeSnippets?: Record<string, unknown>;

    @Property({ fieldName: 'timeComplexity', length: 100, nullable: true })
    timeComplexity?: string;

    @Property({ fieldName: 'spaceComplexity', length: 100, nullable: true })
    spaceComplexity?: string;

    @Property({ fieldName: 'isOfficial', default: true })
    isOfficial = true;

    // No User FK was declared in the source Prisma model.
    @Property({ fieldName: 'createdById' })
    createdById!: number;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();

    @Property({ onUpdate: () => new Date(), defaultRaw: 'now()' })
    updatedAt = new Date();
}
