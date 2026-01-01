/*
  Warnings:

  - You are about to drop the `product_size_variants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_size_variants" DROP CONSTRAINT "product_size_variants_productId_fkey";

-- DropTable
DROP TABLE "product_size_variants";

-- CreateIndex
CREATE INDEX "product_color_variants_colorName_idx" ON "product_color_variants"("colorName");
