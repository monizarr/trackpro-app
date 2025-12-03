/**
 * FASE 5: ASSIGN BATCHES TO CUTTER
 *
 * Login sebagai Kepala Produksi dan assign batches yang sudah allocated ke Pemotong.
 * Untuk setiap batch dengan status MATERIAL_ALLOCATED:
 * 1. Create cutting_task
 * 2. Set status PENDING
 * 3. Set materialReceived sesuai kebutuhan fabric
 * 4. Update batch status ke ASSIGNED_TO_CUTTER
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

async function assignToCutter() {
  console.log("✂️  FASE 5: ASSIGN BATCHES TO CUTTER");
  console.log("====================================\n");

  try {
    // Get Kepala Produksi user
    const produksiUser = await prisma.user.findFirst({
      where: { username: "produksi" },
    });

    if (!produksiUser) {
      throw new Error("User produksi tidak ditemukan");
    }

    // Get Pemotong user
    const pemotongUser = await prisma.user.findFirst({
      where: { role: "PEMOTONG" },
    });

    if (!pemotongUser) {
      throw new Error("User pemotong tidak ditemukan");
    }

    console.log("👤 User: Kepala Produksi (produksi)");
    console.log("👷 Target Worker: Pemotong (pemotong)");
    console.log("📋 Task: Assign cutting tasks\n");

    // Get all batches with MATERIAL_ALLOCATED status
    const allocatedBatches = await prisma.productionBatch.findMany({
      where: { status: "MATERIAL_ALLOCATED" },
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

    console.log(
      `📦 Found ${allocatedBatches.length} batches ready for assignment\n`
    );

    if (allocatedBatches.length === 0) {
      console.log("⚠️  No batches with MATERIAL_ALLOCATED status found.");
      console.log("   Make sure to run fase4-allocate-materials.ts first!\n");
      return;
    }

    let totalTasks = 0;

    // Process each batch
    for (const batch of allocatedBatches) {
      console.log(`\n📦 Batch: ${batch.batchSku}`);
      console.log(`   Product: ${batch.product.name}`);
      console.log(`   Quantity: ${batch.targetQuantity} ${batch.product.unit}`);
      console.log(`   Current Status: ${batch.status}\n`);

      // Calculate total fabric needed (sum of all fabric materials in METER)
      const fabricAllocations = batch.materialAllocations.filter(
        (a) => a.material.unit === "METER" && a.status === "ALLOCATED"
      );

      const totalFabric = fabricAllocations.reduce(
        (sum, a) => sum + a.allocatedQty,
        0
      );

      console.log(`   📏 Total Fabric to Cut: ${totalFabric} METER`);

      if (fabricAllocations.length > 0) {
        console.log("   Materials:");
        fabricAllocations.forEach((a) => {
          console.log(
            `      - ${a.material.name}: ${a.allocatedQty} ${a.material.unit}`
          );
        });
      }

      // Create cutting task
      const cuttingTask = await prisma.cuttingTask.create({
        data: {
          batchId: batch.id,
          assignedToId: pemotongUser.id,
          status: "PENDING",
          materialReceived: totalFabric,
        },
      });

      console.log(`\n   ✅ Cutting Task Created:`);
      console.log(`      ID: ${cuttingTask.id}`);
      console.log(`      Status: ${cuttingTask.status}`);
      console.log(
        `      Material Received: ${cuttingTask.materialReceived} METER`
      );
      console.log(
        `      Assigned To: ${pemotongUser.name} (${pemotongUser.username})`
      );
      console.log(`      Created At: ${cuttingTask.createdAt.toISOString()}`);

      // Update batch status to ASSIGNED_TO_CUTTER
      await prisma.productionBatch.update({
        where: { id: batch.id },
        data: {
          status: "ASSIGNED_TO_CUTTER",
          updatedAt: new Date(),
        },
      });

      console.log(
        `   📊 Batch status updated: MATERIAL_ALLOCATED → ASSIGNED_TO_CUTTER`
      );

      totalTasks++;
    }

    // Verification
    console.log("\n\n📊 VERIFICATION");
    console.log("================\n");

    const pendingCuttingTasks = await prisma.cuttingTask.count({
      where: { status: "PENDING" },
    });

    const assignedToCutterBatches = await prisma.productionBatch.count({
      where: { status: "ASSIGNED_TO_CUTTER" },
    });

    const allCuttingTasks = await prisma.cuttingTask.findMany({
      include: {
        batch: {
          include: {
            product: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`✅ Cutting tasks created: ${totalTasks}`);
    console.log(`✅ Pending cutting tasks: ${pendingCuttingTasks}`);
    console.log(
      `✅ Batches with ASSIGNED_TO_CUTTER status: ${assignedToCutterBatches}`
    );

    // Show all cutting tasks
    console.log("\n✂️  All Cutting Tasks:");
    console.log("=====================\n");

    for (const task of allCuttingTasks) {
      console.log(`Task ID: ${task.id}`);
      console.log(`  Batch: ${task.batch.batchSku}`);
      console.log(
        `  Product: ${task.batch.product.name} (${task.batch.targetQuantity} pcs)`
      );
      console.log(
        `  Assigned To: ${task.assignedTo.name} (@${task.assignedTo.username})`
      );
      console.log(`  Status: ${task.status}`);
      console.log(`  Material Received: ${task.materialReceived} METER`);
      console.log(`  Created At: ${task.createdAt.toISOString()}\n`);
    }

    console.log("\n✅ FASE 5 COMPLETED SUCCESSFULLY!");
    console.log("\n📋 Summary:");
    console.log(`   - Cutting tasks created: ${totalTasks}`);
    console.log(`   - Batches assigned to cutter: ${assignedToCutterBatches}`);
    console.log(
      `   - Worker: ${pemotongUser.name} (@${pemotongUser.username})`
    );
    console.log("\n🎯 Next: Pemotong can start cutting process (Fase 6)\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  assignToCutter();
}

export default assignToCutter;
