-- Simplify reject categories: 
-- rejectKotor -> rejectBS (Bad Stock - bisa dicuci)
-- rejectSobek + rejectRusakJahit -> rejectBSPermanent (BS Permanen - tidak bisa diperbaiki)

-- FinishingDefectType enum: KOTOR, SOBEK, RUSAK_JAHIT -> BS, BS_PERMANENT

-- 1. Update finishing_tasks table
ALTER TABLE "finishing_tasks" ADD COLUMN "rejectBS" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "finishing_tasks" ADD COLUMN "rejectBSPermanent" INTEGER NOT NULL DEFAULT 0;

UPDATE "finishing_tasks" SET 
  "rejectBS" = "rejectKotor",
  "rejectBSPermanent" = "rejectSobek" + "rejectRusakJahit";

ALTER TABLE "finishing_tasks" DROP COLUMN "rejectKotor";
ALTER TABLE "finishing_tasks" DROP COLUMN "rejectSobek";
ALTER TABLE "finishing_tasks" DROP COLUMN "rejectRusakJahit";

-- 2. Update sub_batches table
ALTER TABLE "sub_batches" ADD COLUMN "rejectBS" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sub_batches" ADD COLUMN "rejectBSPermanent" INTEGER NOT NULL DEFAULT 0;

UPDATE "sub_batches" SET 
  "rejectBS" = "rejectKotor",
  "rejectBSPermanent" = "rejectSobek" + "rejectRusakJahit";

ALTER TABLE "sub_batches" DROP COLUMN "rejectKotor";
ALTER TABLE "sub_batches" DROP COLUMN "rejectSobek";
ALTER TABLE "sub_batches" DROP COLUMN "rejectRusakJahit";

-- 3. Update sub_batch_items table
ALTER TABLE "sub_batch_items" ADD COLUMN "rejectBS" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sub_batch_items" ADD COLUMN "rejectBSPermanent" INTEGER NOT NULL DEFAULT 0;

UPDATE "sub_batch_items" SET 
  "rejectBS" = "rejectKotor",
  "rejectBSPermanent" = "rejectSobek" + "rejectRusakJahit";

ALTER TABLE "sub_batch_items" DROP COLUMN "rejectKotor";
ALTER TABLE "sub_batch_items" DROP COLUMN "rejectSobek";
ALTER TABLE "sub_batch_items" DROP COLUMN "rejectRusakJahit";

-- 4. Update FinishingDefectType enum
-- Replace old values with new values
ALTER TYPE "FinishingDefectType" ADD VALUE IF NOT EXISTS 'BS';
ALTER TYPE "FinishingDefectType" ADD VALUE IF NOT EXISTS 'BS_PERMANENT';

-- Note: PostgreSQL doesn't support removing enum values directly.
-- Old values (KOTOR, SOBEK, RUSAK_JAHIT) remain in the enum but won't be used.
-- If a clean enum is needed, a full recreation would be required.
