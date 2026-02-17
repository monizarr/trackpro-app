-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VERIFY_SEWING_SUB_BATCH';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT_SEWING_SUB_BATCH';
ALTER TYPE "AuditAction" ADD VALUE 'FORWARD_TO_FINISHING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimelineEvent" ADD VALUE 'SEWING_SUB_BATCH_VERIFIED';
ALTER TYPE "TimelineEvent" ADD VALUE 'SEWING_SUB_BATCH_REJECTED';
ALTER TYPE "TimelineEvent" ADD VALUE 'SEWING_SUB_BATCH_FORWARDED';
