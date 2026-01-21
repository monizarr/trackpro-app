-- CreateEnum
CREATE TYPE "VariantUnit" AS ENUM ('YARD', 'KILOGRAM');

-- AlterTable
ALTER TABLE "material_color_variants" ADD COLUMN     "unit" "VariantUnit" NOT NULL DEFAULT 'YARD';
