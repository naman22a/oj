import { Migration } from '@mikro-orm/migrations';

export class Migration20261120065419 extends Migration {
    async up(): Promise<void> {
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
    }
}
