-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimelineEvent" ADD VALUE 'SUB_BATCH_APPROVED';
ALTER TYPE "TimelineEvent" ADD VALUE 'SUB_BATCH_REJECTED';

-- AlterTable
ALTER TABLE "sewing_results" ADD COLUMN     "sewingTaskId" TEXT;

-- AddForeignKey
ALTER TABLE "sewing_results" ADD CONSTRAINT "sewing_results_sewingTaskId_fkey" FOREIGN KEY ("sewingTaskId") REFERENCES "sewing_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
