-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'KEPALA_GUDANG', 'KEPALA_PRODUKSI', 'PEMOTONG', 'PENJAHIT', 'FINISHING');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('METER', 'YARD', 'KILOGRAM', 'GRAM', 'PIECE', 'ROLL', 'BOX');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'MATERIAL_REQUESTED', 'MATERIAL_ALLOCATED', 'ASSIGNED_TO_CUTTER', 'IN_CUTTING', 'CUTTING_COMPLETED', 'CUTTING_VERIFIED', 'IN_SEWING', 'SEWING_COMPLETED', 'SEWING_VERIFIED', 'IN_FINISHING', 'FINISHING_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ALLOCATED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QualityCheckStage" AS ENUM ('CUTTING', 'SEWING', 'FINISHING', 'FINAL');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PASSED', 'FAILED', 'NEED_REWORK');

-- CreateEnum
CREATE TYPE "TimelineEvent" AS ENUM ('BATCH_CREATED', 'MATERIAL_REQUESTED', 'MATERIAL_ALLOCATED', 'ASSIGNED_TO_CUTTER', 'CUTTING_STARTED', 'CUTTING_COMPLETED', 'CUTTING_VERIFIED', 'ASSIGNED_TO_SEWER', 'SEWING_STARTED', 'SEWING_COMPLETED', 'SEWING_VERIFIED', 'ASSIGNED_TO_FINISHING', 'FINISHING_STARTED', 'FINISHING_COMPLETED', 'BATCH_COMPLETED', 'BATCH_CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'BATCH_ASSIGNMENT', 'VERIFICATION_NEEDED', 'DEADLINE_APPROACHING', 'TASK_COMPLETED', 'MATERIAL_REQUEST');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "images" TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" "MaterialUnit" NOT NULL,
    "currentStock" DECIMAL(15,3) NOT NULL,
    "minimumStock" DECIMAL(15,3) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_materials" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" "MaterialUnit" NOT NULL,

    CONSTRAINT "product_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_transactions" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" "MaterialUnit" NOT NULL,
    "notes" TEXT,
    "batchId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "batchSku" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "targetQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_material_allocations" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "requestedQty" DECIMAL(15,3) NOT NULL,
    "allocatedQty" DECIMAL(15,3),
    "status" "AllocationStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_material_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_tasks" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "materialReceived" DECIMAL(15,3) NOT NULL,
    "piecesCompleted" INTEGER NOT NULL DEFAULT 0,
    "rejectPieces" INTEGER NOT NULL DEFAULT 0,
    "wasteQty" DECIMAL(15,3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sewing_tasks" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "piecesReceived" INTEGER NOT NULL,
    "piecesCompleted" INTEGER NOT NULL DEFAULT 0,
    "rejectPieces" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sewing_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finishing_tasks" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "piecesReceived" INTEGER NOT NULL,
    "piecesCompleted" INTEGER NOT NULL DEFAULT 0,
    "rejectPieces" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finishing_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "stage" "QualityCheckStage" NOT NULL,
    "status" "QualityStatus" NOT NULL,
    "passedQty" INTEGER NOT NULL,
    "failedQty" INTEGER NOT NULL,
    "reworkQty" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_timeline" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "event" "TimelineEvent" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_createdById_idx" ON "products"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_code_idx" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_currentStock_idx" ON "materials"("currentStock");

-- CreateIndex
CREATE INDEX "materials_minimumStock_idx" ON "materials"("minimumStock");

-- CreateIndex
CREATE UNIQUE INDEX "product_materials_productId_materialId_key" ON "product_materials"("productId", "materialId");

-- CreateIndex
CREATE INDEX "material_transactions_materialId_idx" ON "material_transactions"("materialId");

-- CreateIndex
CREATE INDEX "material_transactions_type_idx" ON "material_transactions"("type");

-- CreateIndex
CREATE INDEX "material_transactions_createdAt_idx" ON "material_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "material_transactions_batchId_idx" ON "material_transactions"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_batchSku_key" ON "production_batches"("batchSku");

-- CreateIndex
CREATE INDEX "production_batches_batchSku_idx" ON "production_batches"("batchSku");

-- CreateIndex
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");

-- CreateIndex
CREATE INDEX "production_batches_productId_idx" ON "production_batches"("productId");

-- CreateIndex
CREATE INDEX "production_batches_createdAt_idx" ON "production_batches"("createdAt");

-- CreateIndex
CREATE INDEX "batch_material_allocations_batchId_idx" ON "batch_material_allocations"("batchId");

-- CreateIndex
CREATE INDEX "batch_material_allocations_status_idx" ON "batch_material_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cutting_tasks_batchId_key" ON "cutting_tasks"("batchId");

-- CreateIndex
CREATE INDEX "cutting_tasks_status_idx" ON "cutting_tasks"("status");

-- CreateIndex
CREATE INDEX "cutting_tasks_assignedToId_idx" ON "cutting_tasks"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "sewing_tasks_batchId_key" ON "sewing_tasks"("batchId");

-- CreateIndex
CREATE INDEX "sewing_tasks_status_idx" ON "sewing_tasks"("status");

-- CreateIndex
CREATE INDEX "sewing_tasks_assignedToId_idx" ON "sewing_tasks"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "finishing_tasks_batchId_key" ON "finishing_tasks"("batchId");

-- CreateIndex
CREATE INDEX "finishing_tasks_status_idx" ON "finishing_tasks"("status");

-- CreateIndex
CREATE INDEX "finishing_tasks_assignedToId_idx" ON "finishing_tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "quality_checks_batchId_idx" ON "quality_checks"("batchId");

-- CreateIndex
CREATE INDEX "quality_checks_stage_idx" ON "quality_checks"("stage");

-- CreateIndex
CREATE INDEX "batch_timeline_batchId_idx" ON "batch_timeline"("batchId");

-- CreateIndex
CREATE INDEX "batch_timeline_createdAt_idx" ON "batch_timeline"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_material_allocations" ADD CONSTRAINT "batch_material_allocations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_material_allocations" ADD CONSTRAINT "batch_material_allocations_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_tasks" ADD CONSTRAINT "cutting_tasks_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_tasks" ADD CONSTRAINT "cutting_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sewing_tasks" ADD CONSTRAINT "sewing_tasks_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sewing_tasks" ADD CONSTRAINT "sewing_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finishing_tasks" ADD CONSTRAINT "finishing_tasks_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finishing_tasks" ADD CONSTRAINT "finishing_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_timeline" ADD CONSTRAINT "batch_timeline_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
