-- CreateEnum
CREATE TYPE "SubBatchStatus" AS ENUM ('ASSIGNED_TO_SEWER', 'IN_SEWING', 'SEWING_COMPLETED', 'ASSIGNED_TO_FINISHING', 'IN_FINISHING', 'FINISHING_COMPLETED', 'SUBMITTED_TO_WAREHOUSE', 'WAREHOUSE_VERIFIED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimelineEvent" ADD VALUE 'SUB_BATCHES_CREATED';
ALTER TYPE "TimelineEvent" ADD VALUE 'ALL_SUB_BATCHES_COMPLETED';

-- CreateTable
CREATE TABLE "sub_batches" (
    "id" TEXT NOT NULL,
    "subBatchSku" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignedSewerId" TEXT NOT NULL,
    "assignedFinisherId" TEXT,
    "warehouseVerifiedById" TEXT,
    "piecesAssigned" INTEGER NOT NULL,
    "sewingOutput" INTEGER NOT NULL DEFAULT 0,
    "sewingReject" INTEGER NOT NULL DEFAULT 0,
    "finishingOutput" INTEGER NOT NULL DEFAULT 0,
    "finishingReject" INTEGER NOT NULL DEFAULT 0,
    "status" "SubBatchStatus" NOT NULL DEFAULT 'ASSIGNED_TO_SEWER',
    "notes" TEXT,
    "sewingStartedAt" TIMESTAMP(3),
    "sewingCompletedAt" TIMESTAMP(3),
    "sewingConfirmedAt" TIMESTAMP(3),
    "finishingStartedAt" TIMESTAMP(3),
    "finishingCompletedAt" TIMESTAMP(3),
    "finishingConfirmedAt" TIMESTAMP(3),
    "submittedToWarehouseAt" TIMESTAMP(3),
    "warehouseVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_batch_items" (
    "id" TEXT NOT NULL,
    "subBatchId" TEXT NOT NULL,
    "productSize" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "piecesAssigned" INTEGER NOT NULL,
    "sewingOutput" INTEGER NOT NULL DEFAULT 0,
    "finishingOutput" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_batch_timeline" (
    "id" TEXT NOT NULL,
    "subBatchId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_batch_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_batches_subBatchSku_key" ON "sub_batches"("subBatchSku");

-- CreateIndex
CREATE INDEX "sub_batches_batchId_idx" ON "sub_batches"("batchId");

-- CreateIndex
CREATE INDEX "sub_batches_status_idx" ON "sub_batches"("status");

-- CreateIndex
CREATE INDEX "sub_batches_assignedSewerId_idx" ON "sub_batches"("assignedSewerId");

-- CreateIndex
CREATE INDEX "sub_batches_assignedFinisherId_idx" ON "sub_batches"("assignedFinisherId");

-- CreateIndex
CREATE INDEX "sub_batch_items_subBatchId_idx" ON "sub_batch_items"("subBatchId");

-- CreateIndex
CREATE INDEX "sub_batch_timeline_subBatchId_idx" ON "sub_batch_timeline"("subBatchId");

-- CreateIndex
CREATE INDEX "sub_batch_timeline_createdAt_idx" ON "sub_batch_timeline"("createdAt");

-- AddForeignKey
ALTER TABLE "sub_batches" ADD CONSTRAINT "sub_batches_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_batches" ADD CONSTRAINT "sub_batches_assignedSewerId_fkey" FOREIGN KEY ("assignedSewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_batches" ADD CONSTRAINT "sub_batches_assignedFinisherId_fkey" FOREIGN KEY ("assignedFinisherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_batches" ADD CONSTRAINT "sub_batches_warehouseVerifiedById_fkey" FOREIGN KEY ("warehouseVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_batch_items" ADD CONSTRAINT "sub_batch_items_subBatchId_fkey" FOREIGN KEY ("subBatchId") REFERENCES "sub_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_batch_timeline" ADD CONSTRAINT "sub_batch_timeline_subBatchId_fkey" FOREIGN KEY ("subBatchId") REFERENCES "sub_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
