-- CreateTable
CREATE TABLE "product_size_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_size_variants_pkey" PRIMARY KEY ("id")
);

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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_color_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_size_variants_productId_idx" ON "product_size_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_variants_productId_sizeName_key" ON "product_size_variants"("productId", "sizeName");

-- CreateIndex
CREATE INDEX "product_color_variants_productId_idx" ON "product_color_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_variants_productId_colorName_key" ON "product_color_variants"("productId", "colorName");

-- CreateIndex
CREATE INDEX "material_color_variants_materialId_idx" ON "material_color_variants"("materialId");

-- CreateIndex
CREATE INDEX "material_color_variants_colorName_idx" ON "material_color_variants"("colorName");

-- CreateIndex
CREATE UNIQUE INDEX "material_color_variants_materialId_colorName_key" ON "material_color_variants"("materialId", "colorName");

-- AddForeignKey
ALTER TABLE "product_size_variants" ADD CONSTRAINT "product_size_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color_variants" ADD CONSTRAINT "product_color_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_color_variants" ADD CONSTRAINT "material_color_variants_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
