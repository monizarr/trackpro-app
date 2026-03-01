/*
  Warnings:

  - The values [KOTOR,SOBEK,RUSAK_JAHIT] on the enum `FinishingDefectType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FinishedGoodTransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "FinishingDefectType_new" AS ENUM ('BS', 'BS_PERMANENT');
ALTER TYPE "FinishingDefectType" RENAME TO "FinishingDefectType_old";
ALTER TYPE "FinishingDefectType_new" RENAME TO "FinishingDefectType";
DROP TYPE "public"."FinishingDefectType_old";
COMMIT;

-- CreateTable
CREATE TABLE "finished_good_transactions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "FinishedGoodTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "destination" TEXT,
    "batchId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finished_good_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finished_good_transactions_productId_idx" ON "finished_good_transactions"("productId");

-- CreateIndex
CREATE INDEX "finished_good_transactions_type_idx" ON "finished_good_transactions"("type");

-- CreateIndex
CREATE INDEX "finished_good_transactions_date_idx" ON "finished_good_transactions"("date");

-- CreateIndex
CREATE INDEX "finished_good_transactions_userId_idx" ON "finished_good_transactions"("userId");

-- CreateIndex
CREATE INDEX "finished_good_transactions_reference_idx" ON "finished_good_transactions"("reference");

-- AddForeignKey
ALTER TABLE "finished_good_transactions" ADD CONSTRAINT "finished_good_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finished_good_transactions" ADD CONSTRAINT "finished_good_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finished_good_transactions" ADD CONSTRAINT "finished_good_transactions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
