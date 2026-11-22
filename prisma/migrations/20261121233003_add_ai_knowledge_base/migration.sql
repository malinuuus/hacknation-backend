-- pgvector: embeddings of knowledge base fragments
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "knowledge_category" AS ENUM ('LAW', 'RESPONSE', 'GUIDELINE');

-- CreateEnum
CREATE TYPE "knowledge_index_status" AS ENUM ('PENDING', 'INDEXED', 'NO_TEXT', 'FAILED');

-- CreateTable
CREATE TABLE "case_questions" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "department_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "knowledge_category" NOT NULL,
    "description" TEXT,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "extracted_text" TEXT,
    "text_extraction_status" "text_extraction_status" NOT NULL,
    "index_status" "knowledge_index_status" NOT NULL,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_questions_department_id_idx" ON "case_questions"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_questions_case_id_position_key" ON "case_questions"("case_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_storage_key_key" ON "knowledge_documents"("storage_key");

-- CreateIndex
CREATE INDEX "knowledge_documents_category_updated_at_idx" ON "knowledge_documents"("category", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_document_id_position_key" ON "knowledge_chunks"("document_id", "position");

-- AddForeignKey
ALTER TABLE "case_questions" ADD CONSTRAINT "case_questions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_questions" ADD CONSTRAINT "case_questions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
