import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converts the schema to NRI Shaadi matrimony:
 * - matrimony / NRI profile columns + partner preferences
 * - 30-day free trial (existing members get a fresh 30 days from today)
 * - shortlists and profile_views tables
 *
 * Legacy dating columns (role, turnOns, turnOffs, allowance, accommodation) are left in place
 * and simply no longer used, so this migration is non-destructive.
 */
export class NriShaadiMatrimony1717600000000 implements MigrationInterface {
  name = 'NriShaadiMatrimony1717600000000';

  private readonly textColumns = [
    'profileCreatedBy', 'maritalStatus', 'hasChildren',
    'religion', 'community', 'subCommunity', 'gotra', 'motherTongue',
    'manglik', 'birthTime', 'birthPlace', 'rashi',
    'state', 'citizenship', 'residencyStatus', 'grewUpIn', 'nativeState', 'nativeCity', 'willingToRelocate',
    'educationLevel', 'educationField', 'college', 'occupation', 'employer', 'workSector', 'annualIncome',
    'diet', 'smoking', 'drinking',
    'familyType', 'familyValues', 'familyStatus', 'fatherOccupation', 'motherOccupation', 'familyLocation',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of this.textColumns) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col}" character varying`);
    }
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateOfBirth" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "heightCm" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "brothers" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sisters" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "casteNoBar" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aboutFamily" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hobbies" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "partnerPreferences" jsonb`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showContactToConnections" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dailyInterestCount" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dailyInterestResetAt" date`);

    await queryRunner.query(`UPDATE "users" SET "trialEndsAt" = now() + interval '30 days' WHERE "trialEndsAt" IS NULL`);

    // Old dating profiles lack the required matrimony fields — send them back through onboarding.
    await queryRunner.query(`UPDATE "users" SET "profileStage" = 0 WHERE "profileStage" > 0 AND "religion" IS NULL`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_country" ON "users" ("country")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_religion" ON "users" ("religion")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_gender" ON "users" ("gender")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shortlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "shortlistedId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shortlists_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_shortlists_pair" UNIQUE ("userId", "shortlistedId"),
        CONSTRAINT "FK_shortlists_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shortlists_target" FOREIGN KEY ("shortlistedId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_shortlists_userId" ON "shortlists" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_shortlists_shortlistedId" ON "shortlists" ("shortlistedId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "viewerId" uuid NOT NULL,
        "viewedId" uuid NOT NULL,
        "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_profile_views_pair" UNIQUE ("viewerId", "viewedId"),
        CONSTRAINT "FK_profile_views_viewer" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_profile_views_viewed" FOREIGN KEY ("viewedId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_views_viewerId" ON "profile_views" ("viewerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_views_viewedId" ON "profile_views" ("viewedId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_views"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shortlists"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_gender"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_religion"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_country"`);
    for (const col of [
      ...this.textColumns,
      'dateOfBirth', 'heightCm', 'brothers', 'sisters', 'casteNoBar', 'aboutFamily', 'hobbies',
      'partnerPreferences', 'showContactToConnections', 'trialEndsAt',
      'dailyInterestCount', 'dailyInterestResetAt',
    ]) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "${col}"`);
    }
  }
}
