import { Migration } from '@mikro-orm/migrations';

export class Migration20261115083026 extends Migration {
    async up(): Promise<void> {
        this.addSql('create schema if not exists "problems";');

        this.addSql('create schema if not exists "contests";');

        this.addSql('create schema if not exists "submissions";');

        this.addSql('create schema if not exists "users";');

        this.addSql(
            'create table "problems"."companies" ("id" serial primary key, "name" varchar(100) not null, "slug" varchar(100) not null, "logoUrl" varchar(500) null, "created_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'alter table "problems"."companies" add constraint "companies_name_unique" unique ("name");'
        );
        this.addSql(
            'alter table "problems"."companies" add constraint "companies_slug_unique" unique ("slug");'
        );

        this.addSql(
            'create table "contests"."contests" ("id" serial primary key, "title" varchar(255) not null, "slug" varchar(255) not null, "description" text null, "startTime" timestamptz(0) not null, "endTime" timestamptz(0) not null, "duration" int not null, "isPublic" boolean not null default true, "createdById" int not null, "createdAt" timestamptz(0) not null default now());'
        );
        this.addSql(
            'alter table "contests"."contests" add constraint "contests_slug_unique" unique ("slug");'
        );
        this.addSql(
            'create index "contests_startTime_index" on "contests"."contests" ("startTime");'
        );

        this.addSql(
            'create table "contests"."contest_participants" ("id" serial primary key, "contest_id" int not null, "userId" int not null, "score" int not null default 0, "rank" int null, "finishTime" timestamptz(0) null, "registeredAt" timestamptz(0) not null default now());'
        );
        this.addSql(
            'create index "contest_participants_userId_index" on "contests"."contest_participants" ("userId");'
        );
        this.addSql(
            'alter table "contests"."contest_participants" add constraint "contest_participants_contest_id_userId_unique" unique ("contest_id", "userId");'
        );

        this.addSql(
            'create table "contests"."contest_problems" ("contest_id" int not null, "problemId" int not null, "problemOrder" int not null, "points" int not null default 100, constraint "contest_problems_pkey" primary key ("contest_id", "problemId"));'
        );

        this.addSql(
            'create table "problems"."problems" ("id" serial primary key, "title" varchar(255) not null, "slug" varchar(255) not null, "description" text not null, "difficulty" text check ("difficulty" in (\'Easy\', \'Medium\', \'Hard\')) not null, "acceptanceRate" numeric(5,2) not null default \'0.00\', "totalSubmissions" int not null default 0, "totalAccepted" int not null default 0, "likes" int not null default 0, "dislikes" int not null default 0, "constraints" text null, "hints" text[] not null default \'{}\', "similarProblems" int[] not null default \'{}\', "createdById" int not null, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'alter table "problems"."problems" add constraint "problems_slug_unique" unique ("slug");'
        );

        this.addSql(
            'create table "problems"."editorials" ("id" serial primary key, "problem_id" int not null, "title" varchar(255) not null, "approach" varchar(100) null, "content" text not null, "code_snippets" jsonb null, "timeComplexity" varchar(100) null, "spaceComplexity" varchar(100) null, "isOfficial" boolean not null default true, "createdById" int not null, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now());'
        );

        this.addSql(
            'create table "problems"."comments" ("id" serial primary key, "problem_id" int not null, "userId" int not null, "parentId" int null, "title" varchar(255) null, "content" text not null, "isSolution" boolean not null default false, "language" varchar(50) null, "upvotes" int not null default 0, "downvotes" int not null default 0, "isPinned" boolean not null default false, "isDeleted" boolean not null default false, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'create index "comments_userId_index" on "problems"."comments" ("userId");'
        );
        this.addSql(
            'create index "comments_problem_id_index" on "problems"."comments" ("problem_id");'
        );

        this.addSql(
            'create table "problems"."discussion_votes" ("userId" int not null, "comment_id" int not null, "vote_type" text check ("vote_type" in (\'Upvote\', \'Downvote\')) not null, "created_at" timestamptz(0) not null default now(), constraint "discussion_votes_pkey" primary key ("userId", "comment_id"));'
        );

        this.addSql(
            'create table "problems"."bookmarks" ("userId" int not null, "problem_id" int not null, "notes" text null, "created_at" timestamptz(0) not null default now(), constraint "bookmarks_pkey" primary key ("userId", "problem_id"));'
        );

        this.addSql(
            'create table "problems"."problem_companies" ("problem_id" int not null, "company_id" int not null, "frequency" int not null default 1, "lastAskedDate" date null, constraint "problem_companies_pkey" primary key ("problem_id", "company_id"));'
        );

        this.addSql(
            'create table "problems"."problem_likes" ("userId" int not null, "problem_id" int not null, "isLike" boolean not null, "created_at" timestamptz(0) not null default now(), constraint "problem_likes_pkey" primary key ("userId", "problem_id"));'
        );

        this.addSql(
            "create table \"submissions\".\"submissions\" (\"id\" serial primary key, \"userId\" int not null, \"problemId\" int not null, \"language\" text check (\"language\" in ('cpp', 'java', 'javascript', 'python', 'go', 'rust', 'csharp', 'ruby', 'swift', 'php', 'kotlin', 'dart', 'R', 'perl', 'typescript', 'haskell')) not null, \"code\" text not null, \"status\" text check (\"status\" in ('Accepted', 'WrongAnswer', 'TimeLimitExceeded', 'MemoryLimitExceeded', 'RuntimeError', 'CompileError', 'Pending')) not null, \"runtime\" int null, \"memory\" int null, \"testCasesPassed\" int not null default 0, \"totalTestCases\" int not null default 0, \"errorMessage\" text null, \"submittedAt\" timestamptz(0) not null default now(), \"idempotencyKey\" varchar(255) null);"
        );
        this.addSql(
            'create index "submissions_status_index" on "submissions"."submissions" ("status");'
        );
        this.addSql(
            'create index "submissions_userId_problemId_index" on "submissions"."submissions" ("userId", "problemId");'
        );
        this.addSql(
            'alter table "submissions"."submissions" add constraint "submissions_userId_idempotencyKey_unique" unique ("userId", "idempotencyKey");'
        );

        this.addSql(
            'create table "problems"."tags" ("id" serial primary key, "name" varchar(50) not null, "slug" varchar(50) not null, "description" text null, "created_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'alter table "problems"."tags" add constraint "tags_name_unique" unique ("name");'
        );
        this.addSql(
            'alter table "problems"."tags" add constraint "tags_slug_unique" unique ("slug");'
        );

        this.addSql(
            'create table "problems"."problem_tags" ("problem_id" int not null, "tag_id" int not null, constraint "problem_tags_pkey" primary key ("problem_id", "tag_id"));'
        );

        this.addSql(
            'create table "problems"."test_cases" ("id" serial primary key, "problem_id" int not null, "input" text not null, "expected_output" text not null, "isSample" boolean not null default false, "isActive" boolean not null default true, "explanation" text null, "created_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'create index "test_cases_problem_id_index" on "problems"."test_cases" ("problem_id");'
        );

        this.addSql(
            'create table "users"."users" ("id" serial primary key, "username" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "email_verified" boolean not null default false, "token_version" int not null default 0, "full_name" varchar(255) null, "avatar_url" varchar(255) null, "bio" text null, "github_url" varchar(255) null, "linkedin_url" varchar(255) null, "website_url" varchar(255) null, "is_admin" boolean not null default false, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now());'
        );
        this.addSql(
            'alter table "users"."users" add constraint "users_username_unique" unique ("username");'
        );
        this.addSql(
            'alter table "users"."users" add constraint "users_email_unique" unique ("email");'
        );

        this.addSql(
            'create table "submissions"."user_problem_status" ("userId" int not null, "problemId" int not null, "status" text check ("status" in (\'Solved\', \'Attempted\', \'Todo\')) not null, "lastAttemptedAt" timestamptz(0) null, "solvedAt" timestamptz(0) null, "attempts" int not null default 0, "lastSubmissionId" int null, constraint "user_problem_status_pkey" primary key ("userId", "problemId"));'
        );

        this.addSql(
            'alter table "contests"."contest_participants" add constraint "contest_participants_contest_id_foreign" foreign key ("contest_id") references "contests"."contests" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "contests"."contest_problems" add constraint "contest_problems_contest_id_foreign" foreign key ("contest_id") references "contests"."contests" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."editorials" add constraint "editorials_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."comments" add constraint "comments_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );
        this.addSql(
            'alter table "problems"."comments" add constraint "comments_parentId_foreign" foreign key ("parentId") references "problems"."comments" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."discussion_votes" add constraint "discussion_votes_comment_id_foreign" foreign key ("comment_id") references "problems"."comments" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."bookmarks" add constraint "bookmarks_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."problem_companies" add constraint "problem_companies_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );
        this.addSql(
            'alter table "problems"."problem_companies" add constraint "problem_companies_company_id_foreign" foreign key ("company_id") references "problems"."companies" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."problem_likes" add constraint "problem_likes_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."problem_tags" add constraint "problem_tags_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );
        this.addSql(
            'alter table "problems"."problem_tags" add constraint "problem_tags_tag_id_foreign" foreign key ("tag_id") references "problems"."tags" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "problems"."test_cases" add constraint "test_cases_problem_id_foreign" foreign key ("problem_id") references "problems"."problems" ("id") on update cascade on delete cascade;'
        );

        this.addSql(
            'alter table "submissions"."user_problem_status" add constraint "user_problem_status_lastSubmissionId_foreign" foreign key ("lastSubmissionId") references "submissions"."submissions" ("id") on update cascade on delete set null;'
        );

        this.addSql('drop table if exists "flyway_schema_history" cascade;');
    }

    override async down(): Promise<void> {
        this.addSql(
            'alter table "problems"."problem_companies" drop constraint "problem_companies_company_id_foreign";'
        );

        this.addSql(
            'alter table "contests"."contest_participants" drop constraint "contest_participants_contest_id_foreign";'
        );

        this.addSql(
            'alter table "contests"."contest_problems" drop constraint "contest_problems_contest_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."editorials" drop constraint "editorials_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."comments" drop constraint "comments_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."bookmarks" drop constraint "bookmarks_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."problem_companies" drop constraint "problem_companies_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."problem_likes" drop constraint "problem_likes_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."problem_tags" drop constraint "problem_tags_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."test_cases" drop constraint "test_cases_problem_id_foreign";'
        );

        this.addSql(
            'alter table "problems"."comments" drop constraint "comments_parentId_foreign";'
        );

        this.addSql(
            'alter table "problems"."discussion_votes" drop constraint "discussion_votes_comment_id_foreign";'
        );

        this.addSql(
            'alter table "submissions"."user_problem_status" drop constraint "user_problem_status_lastSubmissionId_foreign";'
        );

        this.addSql(
            'alter table "problems"."problem_tags" drop constraint "problem_tags_tag_id_foreign";'
        );

        this.addSql(
            'create table "flyway_schema_history" ("installed_rank" int4 not null default null, "version" varchar(50) null default null, "description" varchar(200) not null default null, "type" varchar(20) not null default null, "script" varchar(1000) not null default null, "checksum" int4 null default null, "installed_by" varchar(100) not null default null, "installed_on" timestamp(6) not null default now(), "execution_time" int4 not null default null, "success" bool not null default null, constraint "flyway_schema_history_pk" primary key ("installed_rank"));'
        );
        this.addSql(
            'create index "flyway_schema_history_s_idx" on "flyway_schema_history" ("success");'
        );

        this.addSql('drop table if exists "problems"."companies" cascade;');

        this.addSql('drop table if exists "contests"."contests" cascade;');

        this.addSql(
            'drop table if exists "contests"."contest_participants" cascade;'
        );

        this.addSql(
            'drop table if exists "contests"."contest_problems" cascade;'
        );

        this.addSql('drop table if exists "problems"."problems" cascade;');

        this.addSql('drop table if exists "problems"."editorials" cascade;');

        this.addSql('drop table if exists "problems"."comments" cascade;');

        this.addSql(
            'drop table if exists "problems"."discussion_votes" cascade;'
        );

        this.addSql('drop table if exists "problems"."bookmarks" cascade;');

        this.addSql(
            'drop table if exists "problems"."problem_companies" cascade;'
        );

        this.addSql('drop table if exists "problems"."problem_likes" cascade;');

        this.addSql(
            'drop table if exists "submissions"."submissions" cascade;'
        );

        this.addSql('drop table if exists "problems"."tags" cascade;');

        this.addSql('drop table if exists "problems"."problem_tags" cascade;');

        this.addSql('drop table if exists "problems"."test_cases" cascade;');

        this.addSql('drop table if exists "users"."users" cascade;');

        this.addSql(
            'drop table if exists "submissions"."user_problem_status" cascade;'
        );

        this.addSql('drop schema "problems";');

        this.addSql('drop schema "contests";');

        this.addSql('drop schema "submissions";');

        this.addSql('drop schema "users";');
    }
}
