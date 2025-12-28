-- AlterTable
ALTER TABLE "material_transactions" ADD COLUMN     "meterPerRoll" DECIMAL(15,3),
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchaseNotes" TEXT,
ADD COLUMN     "purchaseOrderNumber" TEXT,
ADD COLUMN     "rollQuantity" DECIMAL(15,3),
ADD COLUMN     "supplier" TEXT;

-- CreateIndex
CREATE INDEX "material_transactions_purchaseOrderNumber_idx" ON "material_transactions"("purchaseOrderNumber");
