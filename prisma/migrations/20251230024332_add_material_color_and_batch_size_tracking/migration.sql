/*
  Warnings:

  - You are about to drop the column `targetQuantity` on the `production_batches` table. All the data in the column will be lost.
  - Added the required column `color` to the `batch_material_allocations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rollQuantity` to the `batch_material_allocations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "batch_material_allocations" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "rollQuantity" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "production_batches" DROP COLUMN "targetQuantity",
ADD COLUMN     "totalRolls" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "batch_size_color_requests" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productSize" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "requestedPieces" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_size_color_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_results" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productSize" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "actualPieces" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "batch_size_color_requests_batchId_idx" ON "batch_size_color_requests"("batchId");

-- CreateIndex
CREATE INDEX "cutting_results_batchId_idx" ON "cutting_results"("batchId");

-- CreateIndex
CREATE INDEX "cutting_results_isConfirmed_idx" ON "cutting_results"("isConfirmed");

-- CreateIndex
CREATE INDEX "materials_color_idx" ON "materials"("color");

-- AddForeignKey
ALTER TABLE "batch_size_color_requests" ADD CONSTRAINT "batch_size_color_requests_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
