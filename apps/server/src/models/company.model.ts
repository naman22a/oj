import {
    Collection,
    Entity,
    OneToMany,
    OptionalProps,
    Property,
    Unique
} from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';
import { ProblemCompany } from './problem-company.model.js';

@Entity({ tableName: 'companies', schema: 'problems' })
export class Company extends NumericIdEntity {
    [OptionalProps]?: 'logoUrl' | 'createdAt';

    @Property({ length: 100 })
    @Unique()
    name!: string;

    @Property({ length: 100 })
    @Unique()
    slug!: string;

    @Property({ fieldName: 'logoUrl', length: 500, nullable: true })
    logoUrl?: string;

    @Property({ defaultRaw: 'now()' })
    createdAt = new Date();

    @OneToMany(() => ProblemCompany, (x) => x.company)
    problemCompanies = new Collection<ProblemCompany>(this);
}
