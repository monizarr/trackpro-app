-- CreateEnum
CREATE TYPE "GoodType" AS ENUM ('FINISHED', 'REJECT');

-- AlterEnum
ALTER TYPE "BatchStatus" ADD VALUE 'WAREHOUSE_VERIFIED';

-- AlterEnum
ALTER TYPE "TimelineEvent" ADD VALUE 'WAREHOUSE_VERIFIED';

-- CreateTable
CREATE TABLE "finished_goods" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "GoodType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "verifiedById" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finished_goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finished_goods_batchId_idx" ON "finished_goods"("batchId");

-- CreateIndex
CREATE INDEX "finished_goods_productId_idx" ON "finished_goods"("productId");

-- CreateIndex
CREATE INDEX "finished_goods_type_idx" ON "finished_goods"("type");

-- CreateIndex
CREATE INDEX "finished_goods_verifiedAt_idx" ON "finished_goods"("verifiedAt");

-- AddForeignKey
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
