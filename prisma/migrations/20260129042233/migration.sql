-- CreateTable
CREATE TABLE "sewing_results" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productSize" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "actualPieces" INTEGER NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sewing_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sewing_results_batchId_idx" ON "sewing_results"("batchId");

-- CreateIndex
CREATE INDEX "sewing_results_isConfirmed_idx" ON "sewing_results"("isConfirmed");

-- AddForeignKey
ALTER TABLE "sewing_results" ADD CONSTRAINT "sewing_results_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sewing_results" ADD CONSTRAINT "sewing_results_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
