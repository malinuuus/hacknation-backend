-- CreateEnum
CREATE TYPE "case_status" AS ENUM ('NEW', 'SENT_TO_DEPARTMENTS', 'EXTENDED', 'RESPONSE_PREPARED', 'RESPONSE_SENT');

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "case_number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "received_at" DATE NOT NULL,
    "due_at" DATE NOT NULL,
    "extended_due_at" DATE,
    "extension_reason" TEXT,
    "responded_at" DATE,
    "status" "case_status" NOT NULL DEFAULT 'NEW',
    "handler_initials" TEXT,
    "requester_name" TEXT,
    "requester_email" TEXT,
    "requester_address" TEXT,
    "notes" TEXT,
    "assignee_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_changes" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "from_status" "case_status",
    "to_status" "case_status" NOT NULL,
    "comment" TEXT,
    "changed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_case_number_key" ON "cases"("case_number");

-- CreateIndex
CREATE INDEX "cases_year_received_at_idx" ON "cases"("year", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "cases_year_sequence_number_key" ON "cases"("year", "sequence_number");

-- CreateIndex
CREATE INDEX "case_status_changes_case_id_created_at_idx" ON "case_status_changes"("case_id", "created_at");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_changes" ADD CONSTRAINT "case_status_changes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_changes" ADD CONSTRAINT "case_status_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
