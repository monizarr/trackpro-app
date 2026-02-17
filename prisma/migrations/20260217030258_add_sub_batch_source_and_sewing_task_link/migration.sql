-- CreateEnum
CREATE TYPE "SubBatchSource" AS ENUM ('SEWING', 'FINISHING');

-- AlterTable
ALTER TABLE "sub_batches" ADD COLUMN     "sewingTaskId" TEXT,
ADD COLUMN     "source" "SubBatchSource" NOT NULL DEFAULT 'FINISHING';

-- CreateIndex
CREATE INDEX "sub_batches_source_idx" ON "sub_batches"("source");

-- AddForeignKey
ALTER TABLE "sub_batches" ADD CONSTRAINT "sub_batches_sewingTaskId_fkey" FOREIGN KEY ("sewingTaskId") REFERENCES "sewing_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
