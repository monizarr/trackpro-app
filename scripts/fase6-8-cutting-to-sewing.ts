/**
 * FASE 6-8: COMPLETE CUTTING TO SEWING WORKFLOW
 *
 * Step 6: Pemotong - Process cutting
 * Step 7: Kepala Produksi - Verify cutting
 * Step 8: Kepala Produksi - Assign to tailor
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

async function completeCuttingWorkflow() {
  console.log("✂️  FASE 6-8: CUTTING TO SEWING WORKFLOW");
  console.log("=========================================\n");

  try {
    // ======================
    // FASE 6: PEMOTONG - PROCESS CUTTING
    // ======================
    console.log("📋 FASE 6: PEMOTONG - PROSES PEMOTONGAN\n");

    const pemotongUser = await prisma.user.findFirst({
      where: { role: "PEMOTONG" },
    });

    if (!pemotongUser) {
      throw new Error("User pemotong tidak ditemukan");
    }

    console.log(`👤 User: ${pemotongUser.name} (@${pemotongUser.username})\n`);

    // Get assigned cutting tasks
    const cuttingTasks = await prisma.cuttingTask.findMany({
      where: {
        assignedToId: pemotongUser.id,
        status: "PENDING",
      },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`📦 Found ${cuttingTasks.length} cutting tasks to process\n`);

    for (const task of cuttingTasks) {
      console.log(`\n✂️  Processing: ${task.batch.batchSku}`);
      console.log(`   Product: ${task.batch.product.name}`);
      console.log(`   Target: ${task.batch.targetQuantity} pieces`);
      console.log(`   Material Received: ${task.materialReceived} METER\n`);

      // Step 6.3: Start task
      console.log("   ▶️  Starting cutting process...");
      await prisma.cuttingTask.update({
        where: { id: task.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "IN_CUTTING" },
      });

      console.log("   ✅ Status: PENDING → IN_PROGRESS\n");

      // Step 6.4: Simulate cutting progress (3 updates)
      const targetQty = task.batch.targetQuantity;

      // Progress 1: 40%
      console.log("   📊 Progress Update 1: 40%");
      await prisma.cuttingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(targetQty * 0.4),
          rejectPieces: 0,
          wasteQty: Number(task.materialReceived) * 0.02,
        },
      });

      // Progress 2: 80%
      console.log("   📊 Progress Update 2: 80%");
      await prisma.cuttingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(targetQty * 0.8),
          rejectPieces: 1,
          wasteQty: Number(task.materialReceived) * 0.04,
        },
      });

      // Step 6.5: Complete task
      const finalCompleted = targetQty - 2; // 2 reject total
      const finalReject = 2;
      const finalWaste = Number(task.materialReceived) * 0.065; // 6.5% waste

      console.log("   📊 Final Update: 100%");
      await prisma.cuttingTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          piecesCompleted: finalCompleted,
          rejectPieces: finalReject,
          wasteQty: finalWaste,
          completedAt: new Date(),
          notes: `Pemotongan selesai - ${finalReject} pieces reject karena cacat bahan`,
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "CUTTING_COMPLETED" },
      });

      console.log(`\n   ✅ Cutting Completed!`);
      console.log(`      Pieces Completed: ${finalCompleted}`);
      console.log(`      Reject Pieces: ${finalReject}`);
      console.log(`      Waste: ${finalWaste.toFixed(2)} METER`);
      console.log(`      Status: IN_PROGRESS → COMPLETED\n`);

      // Create notification for production head
      const produksiUser = await prisma.user.findFirst({
        where: { role: "KEPALA_PRODUKSI" },
      });

      if (produksiUser) {
        await prisma.notification.create({
          data: {
            userId: produksiUser.id,
            type: "TASK_COMPLETED",
            title: "Cutting Task Selesai",
            message: `Task pemotongan ${task.batch.batchSku} telah selesai. Pieces: ${finalCompleted}, Reject: ${finalReject}. Menunggu verifikasi.`,
            isRead: false,
          },
        });
      }
    }

    // ======================
    // FASE 7: VERIFY CUTTING
    // ======================
    console.log("\n\n✅ FASE 7: KEPALA PRODUKSI - VERIFIKASI PEMOTONGAN\n");

    const produksiUser = await prisma.user.findFirst({
      where: { role: "KEPALA_PRODUKSI" },
    });

    console.log(
      `👤 User: ${produksiUser?.name} (@${produksiUser?.username})\n`
    );

    // Get completed cutting tasks
    const completedTasks = await prisma.cuttingTask.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(
      `📋 Found ${completedTasks.length} tasks pending verification\n`
    );

    for (const task of completedTasks) {
      console.log(`\n✅ Verifying: ${task.batch.batchSku}`);
      console.log(`   Product: ${task.batch.product.name}`);
      console.log(`   Worker: ${task.assignedTo.name}`);
      console.log(`   Completed: ${task.piecesCompleted} pieces`);
      console.log(`   Reject: ${task.rejectPieces} pieces`);
      console.log(`   Waste: ${task.wasteQty} METER`);

      // Approve task
      await prisma.cuttingTask.update({
        where: { id: task.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedById: produksiUser?.id,
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "CUTTING_VERIFIED" },
      });

      console.log(`   ✅ Approved! Status: COMPLETED → VERIFIED\n`);
    }

    // ======================
    // FASE 8: ASSIGN TO TAILOR
    // ======================
    console.log("\n\n🧵 FASE 8: KEPALA PRODUKSI - ASSIGN KE PENJAHIT\n");

    const penjahitUser = await prisma.user.findFirst({
      where: { role: "PENJAHIT" },
    });

    if (!penjahitUser) {
      throw new Error("User penjahit tidak ditemukan");
    }

    console.log(
      `👷 Target Worker: ${penjahitUser.name} (@${penjahitUser.username})\n`
    );

    // Get verified batches
    const verifiedBatches = await prisma.productionBatch.findMany({
      where: {
        status: "CUTTING_VERIFIED",
      },
      include: {
        product: true,
        cuttingTask: true,
      },
    });

    console.log(
      `📦 Found ${verifiedBatches.length} batches ready for sewing\n`
    );

    for (const batch of verifiedBatches) {
      const cuttingTask = batch.cuttingTask!;
      const piecesForSewing = cuttingTask.piecesCompleted;

      console.log(`\n🪡 Assigning: ${batch.batchSku}`);
      console.log(`   Product: ${batch.product.name}`);
      console.log(`   Pieces to Sew: ${piecesForSewing}`);

      // Create sewing task
      const sewingTask = await prisma.sewingTask.create({
        data: {
          batchId: batch.id,
          assignedToId: penjahitUser.id,
          piecesReceived: piecesForSewing,
          status: "PENDING",
          notes: batch.notes || "Prioritas normal",
        },
      });

      // Update batch status
      await prisma.productionBatch.update({
        where: { id: batch.id },
        data: { status: "IN_SEWING" },
      });

      console.log(`   ✅ Sewing Task Created:`);
      console.log(`      Task ID: ${sewingTask.id}`);
      console.log(`      Status: PENDING`);
      console.log(`      Pieces Received: ${piecesForSewing}`);
      console.log(`      Assigned To: ${penjahitUser.name}`);

      // Create notification
      await prisma.notification.create({
        data: {
          userId: penjahitUser.id,
          type: "BATCH_ASSIGNMENT",
          title: "Task Penjahitan Baru",
          message: `Anda mendapat task penjahitan untuk batch ${batch.batchSku}. Pieces: ${piecesForSewing}`,
          isRead: false,
        },
      });

      console.log(`      Batch Status: CUTTING_VERIFIED → IN_SEWING\n`);
    }

    // ======================
    // VERIFICATION
    // ======================
    console.log("\n\n📊 VERIFICATION SUMMARY");
    console.log("=======================\n");

    const verifiedCuttingTasks = await prisma.cuttingTask.count({
      where: { status: "VERIFIED" },
    });

    const sewingTasks = await prisma.sewingTask.findMany({
      where: { status: "PENDING" },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    });

    const inSewingBatches = await prisma.productionBatch.count({
      where: { status: "IN_SEWING" },
    });

    console.log(`✅ Verified Cutting Tasks: ${verifiedCuttingTasks}`);
    console.log(`✅ Pending Sewing Tasks: ${sewingTasks.length}`);
    console.log(`✅ Batches IN_SEWING: ${inSewingBatches}\n`);

    console.log("🪡 Sewing Tasks Created:\n");
    for (const task of sewingTasks) {
      console.log(`   - ${task.batch.batchSku}: ${task.batch.product.name}`);
      console.log(`     Pieces: ${task.piecesReceived}`);
      console.log(`     Status: ${task.status}\n`);
    }

    console.log("✅ FASE 6-8 COMPLETED SUCCESSFULLY!");
    console.log("\n🎯 Next: FASE 9 - Penjahit dapat mulai proses penjahitan\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  completeCuttingWorkflow();
}

export default completeCuttingWorkflow;
