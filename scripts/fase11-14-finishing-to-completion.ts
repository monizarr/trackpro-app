/**
 * FASE 11-14: FINISHING TO COMPLETION WORKFLOW
 *
 * Fase 11: Kepala Produksi - Assign to finishing
 * Fase 12: Finishing - Process finishing
 * Fase 13: Kepala Produksi - Final verification
 * Fase 14: Owner - View reports
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

async function completeFinishingWorkflow() {
  console.log("🎨 FASE 11-14: FINISHING TO COMPLETION WORKFLOW");
  console.log("==============================================\n");

  try {
    // ======================
    // FASE 11: KEPALA PRODUKSI - ASSIGN TO FINISHING
    // ======================
    console.log("📋 FASE 11: KEPALA PRODUKSI - ASSIGN TO FINISHING\n");

    const produksiUser = await prisma.user.findFirst({
      where: { role: "KEPALA_PRODUKSI" },
    });

    const finishingUser = await prisma.user.findFirst({
      where: { role: "FINISHING" },
    });

    if (!produksiUser || !finishingUser) {
      throw new Error("Users not found");
    }

    console.log(
      `👤 Kepala Produksi: ${produksiUser.name} (@${produksiUser.username})`
    );
    console.log(
      `👤 Finishing Staff: ${finishingUser.name} (@${finishingUser.username})\n`
    );

    // Get batches with status SEWING_VERIFIED
    const sewingVerifiedBatches = await prisma.productionBatch.findMany({
      where: {
        status: "SEWING_VERIFIED",
      },
      include: {
        product: true,
        sewingTask: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(
      `📦 Found ${sewingVerifiedBatches.length} batches ready for finishing\n`
    );

    for (const batch of sewingVerifiedBatches) {
      const sewingTask = batch.sewingTask;
      if (!sewingTask) continue;
      const piecesFromSewing = sewingTask.piecesCompleted;

      console.log(`\n🎨 Assigning: ${batch.batchSku}`);
      console.log(`   Product: ${batch.product.name}`);
      console.log(`   Pieces from Sewing: ${piecesFromSewing}`);

      // Create finishing task
      await prisma.finishingTask.create({
        data: {
          batchId: batch.id,
          assignedToId: finishingUser.id,
          piecesReceived: piecesFromSewing,
          piecesCompleted: 0,
          rejectPieces: 0,
          status: "PENDING",
          notes: "Pastikan kualitas finishing sempurna",
        },
      });

      await prisma.productionBatch.update({
        where: { id: batch.id },
        data: { status: "IN_FINISHING" },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: finishingUser.id,
          type: "BATCH_ASSIGNMENT",
          title: "Finishing Task Baru",
          message: `Batch ${batch.batchSku} (${batch.product.name}) telah ditugaskan untuk finishing. Pieces: ${piecesFromSewing}`,
          isRead: false,
        },
      });

      console.log(`   ✅ Assigned to ${finishingUser.name}`);
      console.log(`   Status: SEWING_VERIFIED → IN_FINISHING\n`);
    }

    // ======================
    // FASE 12: FINISHING - PROCESS FINISHING
    // ======================
    console.log("\n\n🎨 FASE 12: FINISHING - PROSES FINISHING\n");

    console.log(
      `👤 User: ${finishingUser.name} (@${finishingUser.username})\n`
    );

    // Get assigned finishing tasks
    const finishingTasks = await prisma.finishingTask.findMany({
      where: {
        assignedToId: finishingUser.id,
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

    console.log(
      `📦 Found ${finishingTasks.length} finishing tasks to process\n`
    );

    for (const task of finishingTasks) {
      console.log(`\n🎨 Processing: ${task.batch.batchSku}`);
      console.log(`   Product: ${task.batch.product.name}`);
      console.log(`   Pieces Received: ${task.piecesReceived}`);

      // Step 12.2: Start task
      console.log("\n   ▶️  Starting finishing process...");
      await prisma.finishingTask.update({
        where: { id: task.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      console.log("   ✅ Status: PENDING → IN_PROGRESS\n");

      // Step 12.3: Simulate finishing progress (3 updates)
      const piecesReceived = task.piecesReceived;

      // Progress 1: 40%
      console.log("   📊 Progress Update 1: 40%");
      await prisma.finishingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(piecesReceived * 0.4),
          rejectPieces: 0,
        },
      });

      // Progress 2: 75%
      console.log("   📊 Progress Update 2: 75%");
      await prisma.finishingTask.update({
        where: { id: task.id },
        data: {
          piecesCompleted: Math.floor(piecesReceived * 0.75),
          rejectPieces: 0,
        },
      });

      // Step 12.4: Complete task
      // Simulate 0-1 reject during final QC
      const finalReject = task.batch.batchSku.includes("001") ? 1 : 0; // Batch 1 has 1 reject, Batch 2 has 0
      const finalCompleted = piecesReceived - finalReject;

      console.log("   📊 Final Update: 100%");
      await prisma.finishingTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          piecesCompleted: finalCompleted,
          rejectPieces: finalReject,
          completedAt: new Date(),
          notes:
            finalReject > 0
              ? `Finishing selesai - ${finalReject} piece reject QC final`
              : "Finishing selesai - semua pieces lolos QC",
        },
      });

      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: { status: "FINISHING_COMPLETED" },
      });

      console.log(`\n   ✅ Finishing Completed!`);
      console.log(`      Pieces Completed: ${finalCompleted}`);
      console.log(`      Reject Pieces: ${finalReject}`);
      console.log(`      Status: IN_PROGRESS → COMPLETED\n`);

      // Create notification for production head
      await prisma.notification.create({
        data: {
          userId: produksiUser.id,
          type: "TASK_COMPLETED",
          title: "Finishing Task Selesai",
          message: `Task finishing ${task.batch.batchSku} telah selesai. Pieces: ${finalCompleted}, Reject: ${finalReject}. Menunggu verifikasi final.`,
          isRead: false,
        },
      });
    }

    // ======================
    // FASE 13: FINAL VERIFICATION & COMPLETION
    // ======================
    console.log(
      "\n\n✅ FASE 13: KEPALA PRODUKSI - VERIFIKASI FINAL & COMPLETION\n"
    );

    console.log(`👤 User: ${produksiUser.name} (@${produksiUser.username})\n`);

    // Get completed finishing tasks
    const completedTasks = await prisma.finishingTask.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        batch: {
          include: {
            product: true,
            cuttingTask: true,
            sewingTask: true,
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
      `📋 Found ${completedTasks.length} tasks pending final verification\n`
    );

    for (const task of completedTasks) {
      const batch = task.batch;

      console.log(`\n✅ Final Verification: ${batch.batchSku}`);
      console.log(`   Product: ${batch.product.name}`);
      console.log(`   Worker: ${task.assignedTo.name}`);
      console.log(`   Completed: ${task.piecesCompleted} pieces`);
      console.log(`   Reject: ${task.rejectPieces} pieces`);

      // Calculate total rejects from all stages
      const cuttingReject = batch.cuttingTask?.rejectPieces || 0;
      const sewingReject = batch.sewingTask?.rejectPieces || 0;
      const finishingReject = task.rejectPieces;
      const totalReject = cuttingReject + sewingReject + finishingReject;

      console.log(`\n   📊 Reject Summary:`);
      console.log(`      Cutting: ${cuttingReject}`);
      console.log(`      Sewing: ${sewingReject}`);
      console.log(`      Finishing: ${finishingReject}`);
      console.log(`      Total: ${totalReject}`);

      // Approve task
      await prisma.finishingTask.update({
        where: { id: task.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedById: produksiUser.id,
        },
      });

      // Complete batch with final quantities
      await prisma.productionBatch.update({
        where: { id: task.batchId },
        data: {
          status: "COMPLETED",
          actualQuantity: task.piecesCompleted,
          rejectQuantity: totalReject,
          completedDate: new Date(),
        },
      });

      console.log(`\n   ✅ Batch COMPLETED!`);
      console.log(`      Target: ${batch.targetQuantity}`);
      console.log(`      Actual: ${task.piecesCompleted}`);
      console.log(`      Total Reject: ${totalReject}`);
      console.log(
        `      Efficiency: ${(
          (task.piecesCompleted / batch.targetQuantity) *
          100
        ).toFixed(2)}%\n`
      );
    }

    // ======================
    // FASE 14: OWNER - VIEW REPORTS
    // ======================
    console.log("\n\n📊 FASE 14: OWNER - PRODUCTION REPORTS\n");

    const ownerUser = await prisma.user.findFirst({
      where: { role: "OWNER" },
    });

    console.log(`👤 User: ${ownerUser?.name} (@${ownerUser?.username})\n`);

    // Get all completed batches
    const completedBatches = await prisma.productionBatch.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        product: true,
        cuttingTask: true,
        sewingTask: true,
        finishingTask: true,
        materialAllocations: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { completedDate: "desc" },
    });

    console.log("🏭 PRODUCTION SUMMARY REPORT");
    console.log("===========================\n");

    let totalTarget = 0;
    let totalActual = 0;
    let totalReject = 0;

    for (const batch of completedBatches) {
      totalTarget += batch.targetQuantity;
      totalActual += batch.actualQuantity || 0;
      totalReject += batch.rejectQuantity || 0;

      console.log(`📦 ${batch.batchSku} - ${batch.product.name}`);
      console.log(`   Created: ${batch.createdAt.toLocaleDateString()}`);
      console.log(`   Completed: ${batch.completedDate?.toLocaleDateString()}`);
      console.log(`   Target: ${batch.targetQuantity} pieces`);
      console.log(`   Actual: ${batch.actualQuantity} pieces`);
      console.log(`   Reject: ${batch.rejectQuantity} pieces`);
      console.log(
        `   Efficiency: ${(
          (batch.actualQuantity! / batch.targetQuantity) *
          100
        ).toFixed(2)}%`
      );

      // Stage breakdown
      const cutting = batch.cuttingTask;
      const sewing = batch.sewingTask;
      const finishing = batch.finishingTask;

      console.log(`\n   📋 Stage Details:`);
      console.log(
        `      Cutting: ${cutting?.piecesCompleted || 0} completed, ${
          cutting?.rejectPieces || 0
        } reject`
      );
      console.log(
        `      Sewing: ${sewing?.piecesCompleted || 0} completed, ${
          sewing?.rejectPieces || 0
        } reject`
      );
      console.log(
        `      Finishing: ${finishing?.piecesCompleted || 0} completed, ${
          finishing?.rejectPieces || 0
        } reject`
      );

      // Material usage
      console.log(`\n   📦 Material Usage:`);
      for (const alloc of batch.materialAllocations) {
        console.log(
          `      ${alloc.material.name}: ${alloc.allocatedQty} ${alloc.material.unit}`
        );
      }
      console.log("");
    }

    console.log("\n📈 OVERALL STATISTICS");
    console.log("====================\n");
    console.log(`Total Batches Completed: ${completedBatches.length}`);
    console.log(`Total Target: ${totalTarget} pieces`);
    console.log(`Total Produced: ${totalActual} pieces`);
    console.log(`Total Reject: ${totalReject} pieces`);
    console.log(
      `Overall Efficiency: ${((totalActual / totalTarget) * 100).toFixed(2)}%`
    );
    console.log(
      `Reject Rate: ${((totalReject / totalTarget) * 100).toFixed(2)}%\n`
    );

    // Material stock status
    console.log("\n📦 CURRENT MATERIAL STOCK");
    console.log("========================\n");

    const materials = await prisma.material.findMany({
      orderBy: { name: "asc" },
    });

    for (const material of materials) {
      const stockValue = Number(material.currentStock);
      const minValue = Number(material.minStock);
      const status = stockValue <= minValue ? "⚠️ LOW" : "✅ OK";

      console.log(`${status} ${material.name}: ${stockValue} ${material.unit}`);
    }

    console.log("\n\n✅ FASE 11-14 COMPLETED SUCCESSFULLY!");
    console.log("\n🎉 FULL PRODUCTION WORKFLOW COMPLETED!");
    console.log("=====================================");
    console.log("✅ Fase 1-2: Master data & stock setup");
    console.log("✅ Fase 3-5: Batch creation & material allocation");
    console.log("✅ Fase 6-8: Cutting workflow");
    console.log("✅ Fase 9-10: Sewing workflow");
    console.log("✅ Fase 11-14: Finishing & completion");
    console.log("=====================================\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  completeFinishingWorkflow();
}

export default completeFinishingWorkflow;
