-- AlterTable
ALTER TABLE "finishing_tasks" ADD COLUMN     "subBatchId" TEXT;

-- AlterTable
ALTER TABLE "sub_batches" ADD COLUMN     "finishingTaskId" TEXT;

-- AddForeignKey
ALTER TABLE "finishing_tasks" ADD CONSTRAINT "finishing_tasks_subBatchId_fkey" FOREIGN KEY ("subBatchId") REFERENCES "sub_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
