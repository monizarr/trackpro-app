import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createBatches() {
  console.log("🏭 FASE 3: KEPALA PRODUKSI - BUAT BATCH PRODUKSI\n");

  // Get Kepala Produksi user
  const produksi = await prisma.user.findFirst({
    where: { username: "produksi" },
  });

  if (!produksi) {
    throw new Error("Kepala Produksi user not found");
  }

  console.log("✅ Kepala Produksi user found:", produksi.name);
  console.log("");

  // Get products
  const kemeja = await prisma.product.findFirst({
    where: { sku: "PROD-001" },
    include: {
      materials: {
        include: {
          material: true,
        },
      },
    },
  });

  const celana = await prisma.product.findFirst({
    where: { sku: "PROD-002" },
    include: {
      materials: {
        include: {
          material: true,
        },
      },
    },
  });

  if (!kemeja || !celana) {
    throw new Error("Products not found. Please run Fase 1 first.");
  }

  console.log("✅ Products found:");
  console.log(`   - ${kemeja.name} (${kemeja.sku})`);
  console.log(`   - ${celana.name} (${celana.sku})`);
  console.log("");

  // Check for existing batches today
  const today = new Date();
  const batchSkuPrefix = `BATCH-${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  const existingBatches = await prisma.productionBatch.findMany({
    where: {
      batchSku: {
        startsWith: batchSkuPrefix,
      },
    },
    include: {
      materialAllocations: true,
    },
  });

  // Check if we have the 2 batches we need (001 and 002)
  const batch001 = existingBatches.find(
    (b) => b.batchSku === `${batchSkuPrefix}-001`
  );
  const batch002 = existingBatches.find(
    (b) => b.batchSku === `${batchSkuPrefix}-002`
  );

  if (batch001 && batch002) {
    console.log("⚠️  WARNING: Batches already exist for today!");
    console.log(`   Found ${existingBatches.length} existing batches\n`);

    for (const batch of existingBatches) {
      const product = await prisma.product.findUnique({
        where: { id: batch.productId },
      });
      console.log(`   - ${batch.batchSku}: ${product?.name} (${batch.status})`);
      console.log(`     Target: ${batch.targetQuantity} pcs`);
      console.log(
        `     Allocations: ${batch.materialAllocations.length} materials`
      );
    }

    console.log("\n✅ FASE 3 Already Completed\n");
    return { batch1: batch001, batch2: batch002 };
  }

  // Delete old batches from seed if they exist
  if (existingBatches.length > 0) {
    console.log(
      `⚠️  Cleaning up ${existingBatches.length} old batch(es) from seed...\n`
    );
    for (const batch of existingBatches) {
      // Delete allocations first
      await prisma.batchMaterialAllocation.deleteMany({
        where: { batchId: batch.id },
      });
      // Delete batch
      await prisma.productionBatch.delete({
        where: { id: batch.id },
      });
      console.log(`   Deleted: ${batch.batchSku}`);
    }
    console.log("");
  }

  // Create Batch 1: Kemeja
  console.log("📦 Creating Batch 1: Kemeja (50 units)\n");

  const batch1Sku = `${batchSkuPrefix}-001`;
  const batch1 = await prisma.productionBatch.create({
    data: {
      batchSku: batch1Sku,
      productId: kemeja.id,
      targetQuantity: 50,
      status: "PENDING",
      notes: "Order dari client A - deadline 2 minggu",
      createdById: produksi.id,
    },
  });

  console.log(`   ✅ Batch created: ${batch1.batchSku}`);
  console.log(`      Product: ${kemeja.name}`);
  console.log(`      Target Quantity: ${batch1.targetQuantity} pieces`);
  console.log(`      Status: ${batch1.status}`);
  console.log("");

  // Calculate and create material allocations for Batch 1
  console.log("   📋 Auto-calculating material needs from BOM:");

  for (const pm of kemeja.materials) {
    const requiredQty = Number(pm.quantity) * batch1.targetQuantity;

    await prisma.batchMaterialAllocation.create({
      data: {
        batchId: batch1.id,
        materialId: pm.materialId,
        requestedQty: requiredQty,
        status: "REQUESTED",
      },
    });

    // Check stock availability
    const available = Number(pm.material.currentStock);
    const status = available >= requiredQty ? "✅" : "❌";

    console.log(
      `      ${status} ${
        pm.material.name
      }: ${requiredQty} ${pm.unit.toLowerCase()} (available: ${available})`
    );
  }
  console.log("");

  // Create Batch 2: Celana
  console.log("📦 Creating Batch 2: Celana (30 units)\n");

  const batch2Sku = `${batchSkuPrefix}-002`;
  const batch2 = await prisma.productionBatch.create({
    data: {
      batchSku: batch2Sku,
      productId: celana.id,
      targetQuantity: 30,
      status: "PENDING",
      notes: "Stock internal - tidak urgent",
      createdById: produksi.id,
    },
  });

  console.log(`   ✅ Batch created: ${batch2.batchSku}`);
  console.log(`      Product: ${celana.name}`);
  console.log(`      Target Quantity: ${batch2.targetQuantity} pieces`);
  console.log(`      Status: ${batch2.status}`);
  console.log("");

  // Calculate and create material allocations for Batch 2
  console.log("   📋 Auto-calculating material needs from BOM:");

  for (const pm of celana.materials) {
    const requiredQty = Number(pm.quantity) * batch2.targetQuantity;

    await prisma.batchMaterialAllocation.create({
      data: {
        batchId: batch2.id,
        materialId: pm.materialId,
        requestedQty: requiredQty,
        status: "REQUESTED",
      },
    });

    // Check stock availability
    const available = Number(pm.material.currentStock);
    const status = available >= requiredQty ? "✅" : "❌";

    console.log(
      `      ${status} ${
        pm.material.name
      }: ${requiredQty} ${pm.unit.toLowerCase()} (available: ${available})`
    );
  }
  console.log("");

  // Verification
  console.log("✅ VERIFICATION:\n");

  const batchCount = await prisma.productionBatch.count({
    where: {
      batchSku: {
        in: [batch1Sku, batch2Sku],
      },
    },
  });

  const allocationCount = await prisma.batchMaterialAllocation.count({
    where: {
      batchId: {
        in: [batch1.id, batch2.id],
      },
    },
  });

  console.log(`   ✓ Batches created: ${batchCount}/2`);
  console.log(`   ✓ Material allocations created: ${allocationCount}/8`);

  if (batchCount === 2 && allocationCount === 8) {
    console.log("\n🎉 FASE 3 COMPLETED SUCCESSFULLY!\n");
  } else {
    console.log("\n⚠️ Warning: Some data may be missing\n");
  }

  return { batch1, batch2 };
}

createBatches()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
