-- AlterTable
ALTER TABLE "finished_goods" ADD COLUMN     "subBatchId" TEXT;

-- CreateIndex
CREATE INDEX "finished_goods_subBatchId_idx" ON "finished_goods"("subBatchId");

-- AddForeignKey
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_subBatchId_fkey" FOREIGN KEY ("subBatchId") REFERENCES "sub_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
