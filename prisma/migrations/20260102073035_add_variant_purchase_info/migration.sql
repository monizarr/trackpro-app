-- AlterTable
ALTER TABLE "material_color_variants" ADD COLUMN     "meterPerRoll" DECIMAL(15,3),
ADD COLUMN     "price" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchaseNotes" TEXT,
ADD COLUMN     "purchaseOrderNumber" TEXT,
ADD COLUMN     "rollQuantity" DECIMAL(15,3),
ADD COLUMN     "supplier" TEXT;
