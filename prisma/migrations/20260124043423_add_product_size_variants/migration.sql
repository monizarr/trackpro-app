-- CreateTable
CREATE TABLE "product_size_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "sizeOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_size_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_size_variants_productId_idx" ON "product_size_variants"("productId");

-- CreateIndex
CREATE INDEX "product_size_variants_sizeName_idx" ON "product_size_variants"("sizeName");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_variants_productId_sizeName_key" ON "product_size_variants"("productId", "sizeName");

-- AddForeignKey
ALTER TABLE "product_size_variants" ADD CONSTRAINT "product_size_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
