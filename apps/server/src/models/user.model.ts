import { Entity, OptionalProps, Property, Unique } from '@mikro-orm/core';
import { NumericIdEntity } from './base.model.js';

@Entity({ tableName: 'users', schema: 'users' })
export class User extends NumericIdEntity {
    [OptionalProps]?:
        | 'emailVerified'
        | 'tokenVersion'
        | 'isAdmin'
        | 'createdAt'
        | 'updatedAt';

    @Property({ length: 255 })
    @Unique()
    username!: string;

    @Property({ length: 255 })
    @Unique()
    email!: string;

    @Property({ fieldName: 'password', hidden: true })
    passwordHash!: string;

    @Property({ fieldName: 'email_verified', default: false, hidden: true })
    emailVerified = false;

    @Property({ fieldName: 'token_version', default: 0, hidden: true })
    tokenVersion = 0;

    @Property({ fieldName: 'full_name', nullable: true })
    fullName?: string;

    @Property({ fieldName: 'avatar_url', nullable: true })
    avatarUrl?: string;

    @Property({ nullable: true, columnType: 'text' })
    bio?: string;

    @Property({ fieldName: 'github_url', nullable: true })
    githubUrl?: string;

    @Property({ fieldName: 'linkedin_url', nullable: true })
    linkedinUrl?: string;

    @Property({ fieldName: 'website_url', nullable: true })
    websiteUrl?: string;

    @Property({ fieldName: 'is_admin', default: false })
    isAdmin = false;

    @Property({ fieldName: 'created_at', defaultRaw: 'now()' })
    createdAt = new Date();

    @Property({
        fieldName: 'updated_at',
        onUpdate: () => new Date(),
        defaultRaw: 'now()'
    })
    updatedAt = new Date();
}
