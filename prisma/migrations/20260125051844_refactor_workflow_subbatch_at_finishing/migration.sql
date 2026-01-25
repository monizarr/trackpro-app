/*
  Warnings:

  - The values [ASSIGNED_TO_SEWER,IN_SEWING,SEWING_COMPLETED,ASSIGNED_TO_FINISHING,IN_FINISHING,FINISHING_COMPLETED] on the enum `SubBatchStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUB_BATCHES_CREATED,ALL_SUB_BATCHES_COMPLETED] on the enum `TimelineEvent` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `rejectPieces` on the `cutting_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `rejectPieces` on the `finishing_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `rejectPieces` on the `sewing_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `finishingOutput` on the `sub_batch_items` table. All the data in the column will be lost.
  - You are about to drop the column `piecesAssigned` on the `sub_batch_items` table. All the data in the column will be lost.
  - You are about to drop the column `sewingOutput` on the `sub_batch_items` table. All the data in the column will be lost.
  - You are about to drop the column `assignedFinisherId` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `assignedSewerId` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `finishingCompletedAt` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `finishingConfirmedAt` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `finishingOutput` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `finishingReject` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `finishingStartedAt` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `piecesAssigned` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `sewingCompletedAt` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `sewingConfirmedAt` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `sewingOutput` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `sewingReject` on the `sub_batches` table. All the data in the column will be lost.
  - You are about to drop the column `sewingStartedAt` on the `sub_batches` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FinishingDefectType" AS ENUM ('KOTOR', 'SOBEK', 'RUSAK_JAHIT');

-- AlterEnum
ALTER TYPE "BatchStatus" ADD VALUE 'ASSIGNED_TO_FINISHING';

-- AlterEnum
BEGIN;
CREATE TYPE "SubBatchStatus_new" AS ENUM ('CREATED', 'SUBMITTED_TO_WAREHOUSE', 'WAREHOUSE_VERIFIED', 'COMPLETED');
ALTER TABLE "public"."sub_batches" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sub_batches" ALTER COLUMN "status" TYPE "SubBatchStatus_new" USING ("status"::text::"SubBatchStatus_new");
ALTER TYPE "SubBatchStatus" RENAME TO "SubBatchStatus_old";
ALTER TYPE "SubBatchStatus_new" RENAME TO "SubBatchStatus";
DROP TYPE "public"."SubBatchStatus_old";
ALTER TABLE "sub_batches" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TimelineEvent_new" AS ENUM ('BATCH_CREATED', 'MATERIAL_REQUESTED', 'MATERIAL_ALLOCATED', 'ASSIGNED_TO_CUTTER', 'CUTTING_STARTED', 'CUTTING_COMPLETED', 'CUTTING_VERIFIED', 'ASSIGNED_TO_SEWER', 'SEWING_STARTED', 'SEWING_COMPLETED', 'SEWING_VERIFIED', 'ASSIGNED_TO_FINISHING', 'FINISHING_STARTED', 'FINISHING_COMPLETED', 'SUB_BATCH_CREATED', 'SUB_BATCH_SUBMITTED_TO_WAREHOUSE', 'SUB_BATCH_WAREHOUSE_VERIFIED', 'WAREHOUSE_VERIFIED', 'BATCH_COMPLETED', 'BATCH_CANCELLED');
ALTER TABLE "batch_timeline" ALTER COLUMN "event" TYPE "TimelineEvent_new" USING ("event"::text::"TimelineEvent_new");
ALTER TYPE "TimelineEvent" RENAME TO "TimelineEvent_old";
ALTER TYPE "TimelineEvent_new" RENAME TO "TimelineEvent";
DROP TYPE "public"."TimelineEvent_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "sub_batches" DROP CONSTRAINT "sub_batches_assignedFinisherId_fkey";

-- DropForeignKey
ALTER TABLE "sub_batches" DROP CONSTRAINT "sub_batches_assignedSewerId_fkey";

-- DropIndex
DROP INDEX "sub_batches_assignedFinisherId_idx";

-- DropIndex
DROP INDEX "sub_batches_assignedSewerId_idx";

-- AlterTable
ALTER TABLE "cutting_tasks" DROP COLUMN "rejectPieces";

-- AlterTable
ALTER TABLE "finishing_tasks" DROP COLUMN "rejectPieces",
ADD COLUMN     "rejectKotor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectRusakJahit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectSobek" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sewing_tasks" DROP COLUMN "rejectPieces";

-- AlterTable
ALTER TABLE "sub_batch_items" DROP COLUMN "finishingOutput",
DROP COLUMN "piecesAssigned",
DROP COLUMN "sewingOutput",
ADD COLUMN     "goodQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectKotor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectRusakJahit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectSobek" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sub_batches" DROP COLUMN "assignedFinisherId",
DROP COLUMN "assignedSewerId",
DROP COLUMN "finishingCompletedAt",
DROP COLUMN "finishingConfirmedAt",
DROP COLUMN "finishingOutput",
DROP COLUMN "finishingReject",
DROP COLUMN "finishingStartedAt",
DROP COLUMN "piecesAssigned",
DROP COLUMN "sewingCompletedAt",
DROP COLUMN "sewingConfirmedAt",
DROP COLUMN "sewingOutput",
DROP COLUMN "sewingReject",
DROP COLUMN "sewingStartedAt",
ADD COLUMN     "finishingGoodOutput" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectKotor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectRusakJahit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectSobek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedByProdAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'CREATED';
