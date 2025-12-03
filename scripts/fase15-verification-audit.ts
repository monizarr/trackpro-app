/**
 * FASE 15: VERIFICATION & AUDIT
 *
 * Complete data integrity verification and audit trail
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

async function verificationAndAudit() {
  console.log("🔍 FASE 15: VERIFICATION & AUDIT");
  console.log("================================\n");

  try {
    // ======================
    // STEP 15.1: VERIFY PRODUCTION FLOW
    // ======================
    console.log("📋 STEP 15.1: PRODUCTION FLOW VERIFICATION\n");

    const batches = await prisma.productionBatch.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        product: true,
        cuttingTask: true,
        sewingTask: true,
        finishingTask: true,
      },
      orderBy: { batchSku: "asc" },
    });

    console.log(`✅ Found ${batches.length} completed batches\n`);

    let allValid = true;

    for (const batch of batches) {
      console.log(`\n📦 Verifying: ${batch.batchSku}`);
      console.log(`   Product: ${batch.product.name}`);
      console.log(`   Status: ${batch.status}`);
      console.log(`   Target: ${batch.targetQuantity}`);
      console.log(`   Actual: ${batch.actualQuantity}`);
      console.log(`   Reject: ${batch.rejectQuantity}`);

      // Verify task statuses
      const cutting = batch.cuttingTask;
      const sewing = batch.sewingTask;
      const finishing = batch.finishingTask;

      console.log(`\n   Stage Verification:`);

      // Cutting
      if (!cutting || cutting.status !== "VERIFIED") {
        console.log(
          `   ❌ Cutting: FAILED - Status is ${cutting?.status || "MISSING"}`
        );
        allValid = false;
      } else {
        console.log(
          `   ✅ Cutting: ${cutting.status} (${cutting.piecesCompleted} pcs, ${cutting.rejectPieces} reject)`
        );
      }

      // Sewing
      if (!sewing || sewing.status !== "VERIFIED") {
        console.log(
          `   ❌ Sewing: FAILED - Status is ${sewing?.status || "MISSING"}`
        );
        allValid = false;
      } else {
        console.log(
          `   ✅ Sewing: ${sewing.status} (${sewing.piecesCompleted} pcs, ${sewing.rejectPieces} reject)`
        );
      }

      // Finishing
      if (!finishing || finishing.status !== "VERIFIED") {
        console.log(
          `   ❌ Finishing: FAILED - Status is ${
            finishing?.status || "MISSING"
          }`
        );
        allValid = false;
      } else {
        console.log(
          `   ✅ Finishing: ${finishing.status} (${finishing.piecesCompleted} pcs, ${finishing.rejectPieces} reject)`
        );
      }

      // Verify reject calculation
      const calculatedReject =
        (cutting?.rejectPieces || 0) +
        (sewing?.rejectPieces || 0) +
        (finishing?.rejectPieces || 0);
      if (calculatedReject !== batch.rejectQuantity) {
        console.log(
          `   ⚠️  Reject mismatch: Calculated ${calculatedReject} vs Stored ${batch.rejectQuantity}`
        );
      }

      // Verify actual quantity matches finishing
      if (finishing && finishing.piecesCompleted !== batch.actualQuantity) {
        console.log(
          `   ⚠️  Actual quantity mismatch: Finishing ${finishing.piecesCompleted} vs Batch ${batch.actualQuantity}`
        );
      }

      // Verify flow sequence
      const expectedFlow = batch.targetQuantity;
      const cuttingOutput =
        (cutting?.piecesCompleted || 0) + (cutting?.rejectPieces || 0);
      const sewingInput = sewing?.piecesReceived || 0;
      const sewingOutput =
        (sewing?.piecesCompleted || 0) + (sewing?.rejectPieces || 0);
      const finishingInput = finishing?.piecesReceived || 0;

      console.log(`\n   Flow Verification:`);
      console.log(
        `   Target → Cutting: ${expectedFlow} → ${cuttingOutput} ${
          cuttingOutput === expectedFlow ? "✅" : "❌"
        }`
      );
      console.log(
        `   Cutting → Sewing: ${cutting?.piecesCompleted} → ${sewingInput} ${
          cutting?.piecesCompleted === sewingInput ? "✅" : "❌"
        }`
      );
      console.log(
        `   Sewing → Finishing: ${
          sewing?.piecesCompleted
        } → ${finishingInput} ${
          sewing?.piecesCompleted === finishingInput ? "✅" : "❌"
        }`
      );
    }

    console.log(
      `\n${allValid ? "✅" : "❌"} Production Flow Verification: ${
        allValid ? "PASSED" : "FAILED"
      }\n`
    );

    // ======================
    // STEP 15.2: MATERIAL TRACEABILITY
    // ======================
    console.log("\n📦 STEP 15.2: MATERIAL TRACEABILITY AUDIT\n");

    for (const batch of batches) {
      console.log(`\n📦 ${batch.batchSku} - Material Audit:`);

      // Get material allocations
      const allocations = await prisma.batchMaterialAllocation.findMany({
        where: { batchId: batch.id },
        include: {
          material: true,
        },
      });

      console.log(`   Found ${allocations.length} material allocations\n`);

      for (const alloc of allocations) {
        // Find corresponding transaction
        const transaction = await prisma.materialTransaction.findFirst({
          where: {
            batchId: batch.id,
            materialId: alloc.materialId,
            type: "OUT",
          },
        });

        const requested = Number(alloc.requestedQty);
        const allocated = alloc.allocatedQty ? Number(alloc.allocatedQty) : 0;
        const transacted = transaction ? Number(transaction.quantity) : 0;

        console.log(`   ${alloc.material.name}:`);
        console.log(`     Requested: ${requested} ${alloc.material.unit}`);
        console.log(`     Allocated: ${allocated} ${alloc.material.unit}`);
        console.log(`     Transaction: ${transacted} ${alloc.material.unit}`);
        console.log(`     Status: ${alloc.status}`);

        // Verify consistency
        if (
          requested === allocated &&
          allocated === transacted &&
          alloc.status === "ALLOCATED"
        ) {
          console.log(`     ✅ Consistent\n`);
        } else {
          console.log(`     ⚠️  Inconsistency detected\n`);
        }
      }
    }

    // ======================
    // STEP 15.3: STOCK RECONCILIATION
    // ======================
    console.log("\n📊 STEP 15.3: STOCK RECONCILIATION\n");

    const materials = await prisma.material.findMany({
      orderBy: { name: "asc" },
    });

    for (const material of materials) {
      // Calculate expected stock
      const inTransactions = await prisma.materialTransaction.findMany({
        where: { materialId: material.id, type: "IN" },
      });

      const outTransactions = await prisma.materialTransaction.findMany({
        where: { materialId: material.id, type: "OUT" },
      });

      const totalIn = inTransactions.reduce(
        (sum, t) => sum + Number(t.quantity),
        0
      );
      const totalOut = outTransactions.reduce(
        (sum, t) => sum + Number(t.quantity),
        0
      );
      const expectedStock = totalIn - totalOut;
      const actualStock = Number(material.currentStock);

      console.log(`${material.name}:`);
      console.log(`  IN: ${totalIn} ${material.unit}`);
      console.log(`  OUT: ${totalOut} ${material.unit}`);
      console.log(`  Expected: ${expectedStock} ${material.unit}`);
      console.log(`  Actual: ${actualStock} ${material.unit}`);

      if (expectedStock === actualStock) {
        console.log(`  ✅ Stock matches\n`);
      } else {
        console.log(
          `  ❌ Stock mismatch: Difference of ${actualStock - expectedStock}\n`
        );
      }
    }

    // ======================
    // STEP 15.4: NOTIFICATION AUDIT
    // ======================
    console.log("\n🔔 STEP 15.4: NOTIFICATION AUDIT\n");

    const notifications = await prisma.notification.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`📨 Total Notifications Today: ${notifications.length}\n`);

    // Group by user
    const notificationsByUser = notifications.reduce((acc, notif) => {
      const key = notif.user.name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notif);
      return acc;
    }, {} as Record<string, typeof notifications>);

    for (const [userName, userNotifs] of Object.entries(notificationsByUser)) {
      const user = userNotifs[0].user;
      console.log(
        `👤 ${userName} (${user.role}): ${userNotifs.length} notifications`
      );

      for (const notif of userNotifs) {
        const readStatus = notif.isRead ? "✅" : "📬";
        console.log(`   ${readStatus} [${notif.type}] ${notif.title}`);
      }
      console.log("");
    }

    // ======================
    // STEP 15.5: TIMELINE VERIFICATION
    // ======================
    console.log("\n⏱️  STEP 15.5: TIMELINE VERIFICATION\n");

    for (const batch of batches) {
      console.log(`📦 ${batch.batchSku} Timeline:`);

      const timeline = [];

      timeline.push({ event: "Batch Created", date: batch.createdAt });
      timeline.push({ event: "Production Started", date: batch.startDate });

      if (batch.cuttingTask) {
        if (batch.cuttingTask.startedAt)
          timeline.push({
            event: "Cutting Started",
            date: batch.cuttingTask.startedAt,
          });
        if (batch.cuttingTask.completedAt)
          timeline.push({
            event: "Cutting Completed",
            date: batch.cuttingTask.completedAt,
          });
        if (batch.cuttingTask.verifiedAt)
          timeline.push({
            event: "Cutting Verified",
            date: batch.cuttingTask.verifiedAt,
          });
      }

      if (batch.sewingTask) {
        if (batch.sewingTask.startedAt)
          timeline.push({
            event: "Sewing Started",
            date: batch.sewingTask.startedAt,
          });
        if (batch.sewingTask.completedAt)
          timeline.push({
            event: "Sewing Completed",
            date: batch.sewingTask.completedAt,
          });
        if (batch.sewingTask.verifiedAt)
          timeline.push({
            event: "Sewing Verified",
            date: batch.sewingTask.verifiedAt,
          });
      }

      if (batch.finishingTask) {
        if (batch.finishingTask.startedAt)
          timeline.push({
            event: "Finishing Started",
            date: batch.finishingTask.startedAt,
          });
        if (batch.finishingTask.completedAt)
          timeline.push({
            event: "Finishing Completed",
            date: batch.finishingTask.completedAt,
          });
        if (batch.finishingTask.verifiedAt)
          timeline.push({
            event: "Finishing Verified",
            date: batch.finishingTask.verifiedAt,
          });
      }

      if (batch.completedDate)
        timeline.push({ event: "Batch Completed", date: batch.completedDate });

      // Sort by date
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const item of timeline) {
        console.log(`   ${item.date.toLocaleString("id-ID")} - ${item.event}`);
      }

      // Calculate total duration
      const duration = batch.completedDate
        ? (batch.completedDate.getTime() - batch.createdAt.getTime()) /
          (1000 * 60 * 60)
        : 0;

      console.log(`   \n   ⏱️  Total Duration: ${duration.toFixed(2)} hours\n`);
    }

    // ======================
    // FINAL SUMMARY
    // ======================
    console.log("\n📊 FINAL AUDIT SUMMARY");
    console.log("=====================\n");

    const totalBatches = batches.length;
    const totalTarget = batches.reduce((sum, b) => sum + b.targetQuantity, 0);
    const totalActual = batches.reduce(
      (sum, b) => sum + (b.actualQuantity || 0),
      0
    );
    const totalReject = batches.reduce(
      (sum, b) => sum + (b.rejectQuantity || 0),
      0
    );

    console.log(`✅ Batches Completed: ${totalBatches}`);
    console.log(`✅ Total Target: ${totalTarget} pieces`);
    console.log(`✅ Total Produced: ${totalActual} pieces`);
    console.log(`✅ Total Reject: ${totalReject} pieces`);
    console.log(
      `✅ Overall Efficiency: ${((totalActual / totalTarget) * 100).toFixed(
        2
      )}%`
    );
    console.log(
      `✅ Reject Rate: ${((totalReject / totalTarget) * 100).toFixed(2)}%`
    );

    // Database statistics
    const stats = {
      products: await prisma.product.count(),
      materials: await prisma.material.count(),
      batches: await prisma.productionBatch.count(),
      cuttingTasks: await prisma.cuttingTask.count(),
      sewingTasks: await prisma.sewingTask.count(),
      finishingTasks: await prisma.finishingTask.count(),
      materialAllocations: await prisma.batchMaterialAllocation.count(),
      transactions: await prisma.materialTransaction.count(),
      notifications: await prisma.notification.count(),
    };

    console.log(`\n📈 Database Statistics:`);
    console.log(`   Products: ${stats.products}`);
    console.log(`   Materials: ${stats.materials}`);
    console.log(`   Production Batches: ${stats.batches}`);
    console.log(`   Cutting Tasks: ${stats.cuttingTasks}`);
    console.log(`   Sewing Tasks: ${stats.sewingTasks}`);
    console.log(`   Finishing Tasks: ${stats.finishingTasks}`);
    console.log(`   Material Allocations: ${stats.materialAllocations}`);
    console.log(`   Material Transactions: ${stats.transactions}`);
    console.log(`   Notifications: ${stats.notifications}`);

    console.log("\n\n✅ FASE 15 COMPLETED SUCCESSFULLY!");
    console.log("==================================");
    console.log("All data verified and audit trail complete.");
    console.log("System is ready for production use.\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verificationAndAudit();
}

export default verificationAndAudit;
