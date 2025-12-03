/**
 * RESET DATABASE TO FASE 3 STATE
 * Delete all OUT transactions and restore stock to Fase 2 levels
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

async function resetToFase3() {
  console.log("🔄 RESETTING DATABASE TO FASE 3 STATE\n");

  try {
    // 1. Delete all OUT transactions
    const outTransactions = await prisma.materialTransaction.deleteMany({
      where: { type: "OUT" },
    });

    console.log(`✅ Deleted ${outTransactions.count} OUT transactions\n`);

    // 2. Reset all batch allocations to REQUESTED
    const allocations = await prisma.batchMaterialAllocation.updateMany({
      where: { status: "ALLOCATED" },
      data: {
        status: "REQUESTED",
        allocatedQty: null,
      },
    });

    console.log(`✅ Reset ${allocations.count} allocations to REQUESTED\n`);

    // 3. Reset batch statuses to PENDING
    const batches = await prisma.productionBatch.updateMany({
      where: { status: "MATERIAL_ALLOCATED" },
      data: { status: "PENDING" },
    });

    console.log(`✅ Reset ${batches.count} batches to PENDING\n`);

    // 4. Restore stock levels to Fase 2 expected values
    const stockUpdates = [
      { code: "MAT-KAIN-001", stock: 600 },
      { code: "MAT-KAIN-002", stock: 80 },
      { code: "MAT-BENANG-001", stock: 90 },
      { code: "MAT-KANCING-001", stock: 1500 },
      { code: "MAT-RESLETING-001", stock: 200 },
      { code: "MAT-LABEL-001", stock: 300 },
    ];

    console.log("📦 Restoring stock levels:\n");

    for (const update of stockUpdates) {
      await prisma.material.update({
        where: { code: update.code },
        data: { currentStock: update.stock },
      });

      console.log(`   ✅ ${update.code}: ${update.stock}`);
    }

    // 5. Delete old seed batches (PROD-* format)
    console.log("\n🧹 Cleaning up old seed batches...\n");
    const oldBatches = await prisma.productionBatch.findMany({
      where: { batchSku: { startsWith: "PROD-" } },
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
    }

    // Verification
    console.log("\n\n📊 VERIFICATION\n");

    const materials = await prisma.material.findMany({
      select: { code: true, name: true, currentStock: true, unit: true },
    });

    console.log("Stock Levels:");
    materials.forEach((m) => {
      console.log(`   ${m.code}: ${m.currentStock} ${m.unit} - ${m.name}`);
    });

    const pendingBatches = await prisma.productionBatch.findMany({
      where: { status: "PENDING" },
      select: { batchSku: true, product: { select: { name: true } } },
    });

    console.log(`\n✅ ${pendingBatches.length} batches with PENDING status:`);
    pendingBatches.forEach((b) => {
      console.log(`   - ${b.batchSku}: ${b.product.name}`);
    });

    const requestedAllocations = await prisma.batchMaterialAllocation.count({
      where: { status: "REQUESTED" },
    });

    console.log(`✅ ${requestedAllocations} allocations with REQUESTED status`);

    console.log("\n✅ Database reset to FASE 3 state successfully!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  resetToFase3();
}

export default resetToFase3;
