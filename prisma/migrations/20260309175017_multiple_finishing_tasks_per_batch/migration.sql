-- DropIndex
DROP INDEX "finishing_tasks_batchId_key";

-- CreateIndex
CREATE INDEX "finishing_tasks_batchId_idx" ON "finishing_tasks"("batchId");
