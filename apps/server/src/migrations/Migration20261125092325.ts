import { Migration } from '@mikro-orm/migrations';

export class Migration20261125092325 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'alter table "problems"."problems" add column "timeLimitMs" int not null default 2000, add column "memoryLimitMb" int not null default 256;'
        );
        this.addSql(
            'alter table "problems"."problems" alter column "acceptanceRate" type numeric(5,2) using ("acceptanceRate"::numeric(5,2));'
        );
        this.addSql(
            'alter table "problems"."problems" alter column "acceptanceRate" set default \'0.00\';'
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            'alter table "problems"."problems" alter column "acceptanceRate" type numeric(5,2) using ("acceptanceRate"::numeric(5,2));'
        );
        this.addSql(
            'alter table "problems"."problems" alter column "acceptanceRate" set default 0.00;'
        );
        this.addSql(
            'alter table "problems"."problems" drop column "timeLimitMs";'
        );
        this.addSql(
            'alter table "problems"."problems" drop column "memoryLimitMb";'
        );
    }
}
