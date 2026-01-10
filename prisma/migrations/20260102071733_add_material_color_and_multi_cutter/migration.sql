/*
  Warnings:

  - You are about to drop the column `currentStock` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `meterPerRoll` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `minimumStock` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `materials` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "materials_currentStock_idx";

-- DropIndex
DROP INDEX "materials_minimumStock_idx";

-- AlterTable
ALTER TABLE "materials" DROP COLUMN "currentStock",
DROP COLUMN "meterPerRoll",
DROP COLUMN "minimumStock",
DROP COLUMN "price";

-- CreateTable
CREATE TABLE "product_color_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_color_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_color_variants" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorCode" TEXT,
    "stock" DECIMAL(15,3) NOT NULL,
    "minimumStock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_color_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_material_color_allocations" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "materialColorVariantId" TEXT NOT NULL,
    "rollQuantity" INTEGER NOT NULL,
    "allocatedQty" DECIMAL(15,3) NOT NULL,
    "meterPerRoll" DECIMAL(15,3) NOT NULL DEFAULT 95,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_material_color_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_color_variants_productId_idx" ON "product_color_variants"("productId");

-- CreateIndex
CREATE INDEX "product_color_variants_colorName_idx" ON "product_color_variants"("colorName");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_variants_productId_colorName_key" ON "product_color_variants"("productId", "colorName");

-- CreateIndex
CREATE INDEX "material_color_variants_materialId_idx" ON "material_color_variants"("materialId");

-- CreateIndex
CREATE INDEX "material_color_variants_colorName_idx" ON "material_color_variants"("colorName");

-- CreateIndex
CREATE UNIQUE INDEX "material_color_variants_materialId_colorName_key" ON "material_color_variants"("materialId", "colorName");

-- CreateIndex
CREATE INDEX "batch_material_color_allocations_batchId_idx" ON "batch_material_color_allocations"("batchId");

-- CreateIndex
CREATE INDEX "batch_material_color_allocations_materialColorVariantId_idx" ON "batch_material_color_allocations"("materialColorVariantId");

-- AddForeignKey
ALTER TABLE "product_color_variants" ADD CONSTRAINT "product_color_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_color_variants" ADD CONSTRAINT "material_color_variants_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_material_color_allocations" ADD CONSTRAINT "batch_material_color_allocations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_material_color_allocations" ADD CONSTRAINT "batch_material_color_allocations_materialColorVariantId_fkey" FOREIGN KEY ("materialColorVariantId") REFERENCES "material_color_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
