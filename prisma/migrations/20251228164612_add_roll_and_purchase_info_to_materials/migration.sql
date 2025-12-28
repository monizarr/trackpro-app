-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "meterPerRoll" DECIMAL(15,3),
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchaseNotes" TEXT,
ADD COLUMN     "purchaseOrderNumber" TEXT,
ADD COLUMN     "rollQuantity" DECIMAL(15,3),
ADD COLUMN     "supplier" TEXT,
ALTER COLUMN "unit" SET DEFAULT 'METER';

-- AlterTable
ALTER TABLE "product_materials" ADD COLUMN     "color" TEXT;

-- CreateIndex
CREATE INDEX "materials_purchaseOrderNumber_idx" ON "materials"("purchaseOrderNumber");
