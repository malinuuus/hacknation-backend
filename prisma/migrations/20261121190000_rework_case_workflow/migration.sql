-- An extended deadline is no longer a status: it is `extended_due_at` being set.
-- Cases in EXTENDED go back to SENT_TO_DEPARTMENTS; history entries that moved a
-- case to EXTENDED become same-status entries that keep the extension comment.
UPDATE "case_status_changes"
SET "to_status" = CASE WHEN "from_status" IS NULL OR "from_status" = 'EXTENDED' THEN 'SENT_TO_DEPARTMENTS'::"case_status" ELSE "from_status" END
WHERE "to_status" = 'EXTENDED';

UPDATE "case_status_changes" SET "from_status" = 'SENT_TO_DEPARTMENTS' WHERE "from_status" = 'EXTENDED';

UPDATE "cases" SET "status" = 'SENT_TO_DEPARTMENTS' WHERE "status" = 'EXTENDED';

-- AlterEnum
CREATE TYPE "case_status_new" AS ENUM ('NEW', 'SENT_TO_DEPARTMENTS', 'RESPONSE_PREPARED', 'RESPONSE_SENT');
ALTER TABLE "cases" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cases" ALTER COLUMN "status" TYPE "case_status_new" USING ("status"::text::"case_status_new");
ALTER TABLE "case_status_changes" ALTER COLUMN "from_status" TYPE "case_status_new" USING ("from_status"::text::"case_status_new");
ALTER TABLE "case_status_changes" ALTER COLUMN "to_status" TYPE "case_status_new" USING ("to_status"::text::"case_status_new");
ALTER TYPE "case_status" RENAME TO "case_status_old";
ALTER TYPE "case_status_new" RENAME TO "case_status";
DROP TYPE "case_status_old";
ALTER TABLE "cases" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "cases" ADD COLUMN "request_text" TEXT;
ALTER TABLE "cases" ADD COLUMN "effective_due_at" DATE;
UPDATE "cases" SET "effective_due_at" = COALESCE("extended_due_at", "due_at");
ALTER TABLE "cases" ALTER COLUMN "effective_due_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "cases_year_effective_due_at_idx" ON "cases"("year", "effective_due_at");
