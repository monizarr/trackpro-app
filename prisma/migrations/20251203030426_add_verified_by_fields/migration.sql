-- AlterTable
ALTER TABLE "cutting_tasks" ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "finishing_tasks" ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "sewing_tasks" ADD COLUMN     "verifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "cutting_tasks" ADD CONSTRAINT "cutting_tasks_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sewing_tasks" ADD CONSTRAINT "sewing_tasks_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finishing_tasks" ADD CONSTRAINT "finishing_tasks_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
