-- AlterTable
ALTER TABLE "material_color_variants" ADD COLUMN     "minimumStock" DECIMAL(15,3) NOT NULL DEFAULT 0;

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
CREATE INDEX "batch_material_color_allocations_batchId_idx" ON "batch_material_color_allocations"("batchId");

-- CreateIndex
CREATE INDEX "batch_material_color_allocations_materialColorVariantId_idx" ON "batch_material_color_allocations"("materialColorVariantId");

-- AddForeignKey
ALTER TABLE "batch_material_color_allocations" ADD CONSTRAINT "batch_material_color_allocations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_material_color_allocations" ADD CONSTRAINT "batch_material_color_allocations_materialColorVariantId_fkey" FOREIGN KEY ("materialColorVariantId") REFERENCES "material_color_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
