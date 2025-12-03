/**
 * FASE 4: WAREHOUSE MATERIAL ALLOCATION
 *
 * Login sebagai Kepala Gudang dan approve semua material allocation requests.
 * Untuk setiap allocation yang REQUESTED:
 * 1. Update status ke ALLOCATED
 * 2. Create OUT transaction
 * 3. Deduct dari currentStock
 * 4. Update batch status ke MATERIAL_ALLOCATED
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function allocateMaterials() {
  console.log("🏭 FASE 4: WAREHOUSE MATERIAL ALLOCATION");
  console.log("=========================================\n");

  try {
    // Get Kepala Gudang user
    const gudangUser = await prisma.user.findFirst({
      where: { username: "gudang" },
    });

    if (!gudangUser) {
      throw new Error("User gudang tidak ditemukan");
    }

    console.log("👤 User: Kepala Gudang (gudang)");
    console.log("📋 Task: Approve material allocations\n");

    // Clean up old seed batches (they have wrong SKU format PROD-*)
    console.log("🧹 Cleaning up old seed batches...\n");
    const oldBatches = await prisma.productionBatch.findMany({
      where: {
        batchSku: { startsWith: "PROD-" },
      },
      select: { id: true, batchSku: true },
    });

    if (oldBatches.length > 0) {
      // Delete allocations first
      for (const batch of oldBatches) {
        await prisma.batchMaterialAllocation.deleteMany({
          where: { batchId: batch.id },
        });
      }

      // Then delete batches
      await prisma.productionBatch.deleteMany({
        where: { batchSku: { startsWith: "PROD-" } },
      });

      console.log(`   ✅ Deleted ${oldBatches.length} old seed batches:`);
      oldBatches.forEach((b) => console.log(`      - ${b.batchSku}`));
      console.log();
    }

    // Get all batches with PENDING status (should be only BATCH-20251203-001 and 002)
    const pendingBatches = await prisma.productionBatch.findMany({
      where: { status: "PENDING" },
      include: {
        product: true,
        materialAllocations: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { batchSku: "asc" },
    });

    console.log(`📦 Found ${pendingBatches.length} batches pending approval\n`);

    let totalAllocated = 0;
    let totalTransactions = 0;

    // Process each batch
    for (const batch of pendingBatches) {
      console.log(`\n📦 Batch: ${batch.batchSku}`);
      console.log(
        `   Product: ${batch.product.name} (${batch.targetQuantity} ${batch.product.unit})`
      );
      console.log(
        `   Allocations: ${batch.materialAllocations.length} materials\n`
      );

      const allocationsToProcess = batch.materialAllocations.filter(
        (a) => a.status === "REQUESTED"
      );

      if (allocationsToProcess.length === 0) {
        console.log("   ⚠️  No REQUESTED allocations found, skipping...");
        continue;
      }

      // Process each allocation
      for (const allocation of allocationsToProcess) {
        const requestedQty = allocation.requestedQty;

        // Fetch fresh material data to get current stock
        const material = await prisma.material.findUnique({
          where: { id: allocation.materialId },
        });

        if (!material) {
          console.log(`   ❌ Material not found: ${allocation.materialId}`);
          continue;
        }

        console.log(`   📤 Processing: ${material.name}`);
        console.log(`      Requested: ${requestedQty} ${material.unit}`);
        console.log(
          `      Current Stock: ${material.currentStock} ${material.unit}`
        );

        // Check stock availability (convert Decimals to numbers for comparison)
        const currentStock = Number(material.currentStock);
        const requested = Number(requestedQty);

        if (currentStock < requested) {
          console.log(
            `      ❌ Insufficient stock! (need ${requested}, have ${currentStock})`
          );
          continue;
        }

        // 1. Create OUT transaction
        const transaction = await prisma.materialTransaction.create({
          data: {
            materialId: material.id,
            type: "OUT",
            quantity: requestedQty,
            unit: material.unit,
            batchId: batch.id,
            notes: `Alokasi material untuk ${batch.batchSku} - ${batch.product.name}`,
            userId: gudangUser.id,
          },
        });

        // 2. Update stock
        const newStock = material.currentStock - requestedQty;
        await prisma.material.update({
          where: { id: material.id },
          data: { currentStock: newStock },
        });

        // 3. Update allocation status
        await prisma.batchMaterialAllocation.update({
          where: { id: allocation.id },
          data: {
            status: "ALLOCATED",
            allocatedQty: requestedQty,
          },
        });

        console.log(`      ✅ Allocated: ${requestedQty} ${material.unit}`);
        console.log(`      📊 New Stock: ${newStock} ${material.unit}`);
        console.log(`      📝 Transaction ID: ${transaction.id}\n`);

        totalAllocated++;
        totalTransactions++;
      }

      // Update batch status to MATERIAL_ALLOCATED
      await prisma.productionBatch.update({
        where: { id: batch.id },
        data: { status: "MATERIAL_ALLOCATED" },
      });

      console.log(
        `   ✅ Batch ${batch.batchSku} status updated to MATERIAL_ALLOCATED`
      );
    }

    // Verification
    console.log("\n\n📊 VERIFICATION");
    console.log("================\n");

    const allocatedCount = await prisma.batchMaterialAllocation.count({
      where: { status: "ALLOCATED" },
    });

    const outTransactions = await prisma.materialTransaction.count({
      where: {
        type: "OUT",
        batchId: { not: null },
      },
    });

    const materialAllocatedBatches = await prisma.productionBatch.count({
      where: { status: "MATERIAL_ALLOCATED" },
    });

    console.log(`✅ Allocations with ALLOCATED status: ${allocatedCount}`);
    console.log(`✅ OUT transactions created: ${outTransactions}`);
    console.log(
      `✅ Batches with MATERIAL_ALLOCATED status: ${materialAllocatedBatches}`
    );

    // Show updated stock levels
    console.log("\n📦 Updated Stock Levels:");
    console.log("========================\n");

    const materials = await prisma.material.findMany({
      orderBy: { name: "asc" },
    });

    for (const material of materials) {
      const stockStatus =
        material.currentStock <= material.minStock
          ? "⚠️  LOW STOCK"
          : material.currentStock <= material.minStock * 2
          ? "⚡ MODERATE"
          : "✅ GOOD";

      console.log(`${stockStatus} ${material.name}`);
      console.log(`   Current: ${material.currentStock} ${material.unit}`);
      console.log(`   Min: ${material.minStock} ${material.unit}`);
      console.log(`   Max: ${material.maxStock} ${material.unit}\n`);
    }

    console.log("\n✅ FASE 4 COMPLETED SUCCESSFULLY!");
    console.log("\n📋 Summary:");
    console.log(`   - Materials allocated: ${totalAllocated}`);
    console.log(`   - Transactions created: ${totalTransactions}`);
    console.log(
      `   - Batches ready for production: ${materialAllocatedBatches}`
    );
    console.log("\n🎯 Next: FASE 5 - Assign batches to cutter\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  allocateMaterials();
}

export default allocateMaterials;
