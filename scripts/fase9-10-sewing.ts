/**
 * FASE 9-10: SEWING WORKFLOW
 *
 * Fase 9: Penjahit - Process sewing
 * Fase 10: Kepala Produksi - Verify sewing
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

async function completeSewingWorkflow() {
  console.log("🪡 FASE 9-10: SEWING WORKFLOW");
  console.log("==============================\n");

  try {
    // ======================
    // FASE 9: PENJAHIT - PROCESS SEWING
    // ======================
    console.log("📋 FASE 9: PENJAHIT - PROSES PENJAHITAN\n");

    const penjahitUser = await prisma.user.findFirst({
      where: { role: "PENJAHIT" },
    });

    if (!penjahitUser) {
      throw new Error("User penjahit tidak ditemukan");
    }

    console.log(`👤 User: ${penjahitUser.name} (@${penjahitUser.username})\n`);

    // Get assigned sewing tasks
    const sewingTasks = await prisma.sewingTask.findMany({
      where: {
        assignedToId: penjahitUser.id,
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

    console.log(`📦 Found ${sewingTasks.length} sewing tasks to process\n`);

    for (const task of sewingTasks) {
      console.log(`\n🪡 Processing: ${task.batch.batchSku}`);
      console.log(`   Product: ${task.batch.product.name}`);
      console.log(`   Pieces Received: ${task.piecesReceived}`);

      // Step 9.2: Start task
      console.log("\n   ▶️  Starting sewing process...");
      await prisma.sewingTask.update({
        where: { id: task.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      console.log("   ✅ Status: PENDING → IN_PROGRESS\n");

      // Step 9.3: Simulate sewing progress (3 updates)
      const piecesReceived = task.piecesReceived;

      // Progress 1: 30%
      console.log("   📊 Progress Update 1: 30%");
      await prisma.sewingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(piecesReceived * 0.3),
          rejectPieces: 0,
        },
      });

      // Progress 2: 70%
      console.log("   📊 Progress Update 2: 70%");
      await prisma.sewingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(piecesReceived * 0.7),
          rejectPieces: 0,
        },
      });

      // Step 9.4: Complete task
      // Simulate 1 reject during sewing
      const finalCompleted = piecesReceived - 1;
      const finalReject = 1;

      console.log("   📊 Final Update: 100%");
      await prisma.sewingTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          piecesCompleted: finalCompleted,
          rejectPieces: finalReject,
          completedAt: new Date(),
          notes: `Penjahitan selesai - ${finalReject} piece reject karena jahitan tidak rapi`,
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "SEWING_COMPLETED" },
      });

      console.log(`\n   ✅ Sewing Completed!`);
      console.log(`      Pieces Completed: ${finalCompleted}`);
      console.log(`      Reject Pieces: ${finalReject}`);
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
            title: "Sewing Task Selesai",
            message: `Task penjahitan ${task.batch.batchSku} telah selesai. Pieces: ${finalCompleted}, Reject: ${finalReject}. Menunggu verifikasi.`,
            isRead: false,
          },
        });
      }
    }

    // ======================
    // FASE 10: VERIFY SEWING
    // ======================
    console.log("\n\n✅ FASE 10: KEPALA PRODUKSI - VERIFIKASI PENJAHITAN\n");

    const produksiUser = await prisma.user.findFirst({
      where: { role: "KEPALA_PRODUKSI" },
    });

    console.log(
      `👤 User: ${produksiUser?.name} (@${produksiUser?.username})\n`
    );

    // Get completed sewing tasks
    const completedTasks = await prisma.sewingTask.findMany({
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

      // Approve task
      await prisma.sewingTask.update({
        where: { id: task.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedById: produksiUser?.id,
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "SEWING_VERIFIED" },
      });

      console.log(`   ✅ Approved! Status: COMPLETED → VERIFIED\n`);
    }

    // ======================
    // VERIFICATION
    // ======================
    console.log("\n\n📊 VERIFICATION SUMMARY");
    console.log("=======================\n");

    const verifiedSewingTasks = await prisma.sewingTask.count({
      where: { status: "VERIFIED" },
    });

    const sewingVerifiedBatches = await prisma.productionBatch.count({
      where: { status: "SEWING_VERIFIED" },
    });

    const allVerifiedTasks = await prisma.sewingTask.findMany({
      where: { status: "VERIFIED" },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`✅ Verified Sewing Tasks: ${verifiedSewingTasks}`);
    console.log(`✅ Batches SEWING_VERIFIED: ${sewingVerifiedBatches}\n`);

    console.log("🪡 Sewing Results:\n");
    for (const task of allVerifiedTasks) {
      console.log(`   - ${task.batch.batchSku}: ${task.batch.product.name}`);
      console.log(`     Pieces Completed: ${task.piecesCompleted}`);
      console.log(`     Reject: ${task.rejectPieces}`);
      console.log(`     Status: ${task.status}\n`);
    }

    // Calculate total reject across all stages
    console.log("\n📊 Cumulative Reject Analysis:\n");

    for (const task of allVerifiedTasks) {
      const batch = task.batch;

      // Get cutting task for this batch
      const cuttingTask = await prisma.cuttingTask.findUnique({
        where: { batchId: batch.id },
      });

      const cuttingReject = cuttingTask?.rejectPieces || 0;
      const sewingReject = task.rejectPieces;
      const totalReject = cuttingReject + sewingReject;

      console.log(`   ${batch.batchSku}:`);
      console.log(`     Target: ${batch.targetQuantity}`);
      console.log(`     Cutting Reject: ${cuttingReject}`);
      console.log(`     Sewing Reject: ${sewingReject}`);
      console.log(`     Total Reject: ${totalReject}`);
      console.log(`     Available for Finishing: ${task.piecesCompleted}\n`);
    }

    console.log("✅ FASE 9-10 COMPLETED SUCCESSFULLY!");
    console.log("\n🎯 Next: FASE 11 - Assign to Finishing\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  completeSewingWorkflow();
}

export default completeSewingWorkflow;
