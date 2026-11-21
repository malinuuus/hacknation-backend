-- CreateEnum
CREATE TYPE "case_document_kind" AS ENUM ('REQUEST', 'DEPARTMENT_RESPONSE', 'DRAFT_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "text_extraction_status" AS ENUM ('EXTRACTED', 'NO_TEXT', 'UNSUPPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "case_documents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" "case_document_kind" NOT NULL,
    "department_id" UUID,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "extracted_text" TEXT,
    "text_extraction_status" "text_extraction_status" NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_documents_storage_key_key" ON "case_documents"("storage_key");

-- CreateIndex
CREATE INDEX "case_documents_case_id_created_at_idx" ON "case_documents"("case_id", "created_at");

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
