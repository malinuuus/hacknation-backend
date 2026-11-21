-- CreateEnum
CREATE TYPE "department_kind" AS ENUM ('DEPARTMENT', 'OFFICE');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "kind" "department_kind" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_departments" (
    "case_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "requested_at" DATE NOT NULL,
    "answered_at" DATE,

    CONSTRAINT "case_departments_pkey" PRIMARY KEY ("case_id","department_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_symbol_key" ON "departments"("symbol");

-- CreateIndex
CREATE INDEX "case_departments_department_id_idx" ON "case_departments"("department_id");

-- AddForeignKey
ALTER TABLE "case_departments" ADD CONSTRAINT "case_departments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_departments" ADD CONSTRAINT "case_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
