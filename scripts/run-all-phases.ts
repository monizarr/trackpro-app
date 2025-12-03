/**
 * RUN ALL PHASES - Complete Workflow Automation
 *
 * This script executes all 15 phases of the TrackPro production workflow
 * from start to finish in one go.
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

async function runAllPhases() {
  console.log("🚀 TRACKPRO - FULL WORKFLOW AUTOMATION");
  console.log("=====================================\n");
  console.log("Running all 15 phases sequentially...\n");

  try {
    // Note: Phases 1-2 are assumed to be complete (Products & Materials seeded)
    console.log("✅ Phase 1-2: Master Data (Already completed via seed)\n");

    // ======================
    // PHASE 3-5: BATCH CREATION
    // ======================
    console.log(
      "📦 Running Phase 3-5: Batch Creation & Material Allocation..."
    );
    await import("./fase3-create-batches");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await import("./fase4-allocate-materials");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await import("./fase5-assign-cutter");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ Phase 3-5 Complete\n");

    // ======================
    // PHASE 6-8: CUTTING
    // ======================
    console.log("✂️  Running Phase 6-8: Cutting Workflow...");
    await import("./fase6-8-cutting-to-sewing");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ Phase 6-8 Complete\n");

    // ======================
    // PHASE 9-10: SEWING
    // ======================
    console.log("🪡 Running Phase 9-10: Sewing Workflow...");
    await import("./fase9-10-sewing");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ Phase 9-10 Complete\n");

    // ======================
    // PHASE 11-14: FINISHING
    // ======================
    console.log("🎨 Running Phase 11-14: Finishing & Completion...");
    await import("./fase11-14-finishing-to-completion");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ Phase 11-14 Complete\n");

    // ======================
    // PHASE 15: VERIFICATION
    // ======================
    console.log("🔍 Running Phase 15: Verification & Audit...");
    await import("./fase15-verification-audit");

    console.log("✅ Phase 15 Complete\n");

    // ======================
    // FINAL SUMMARY
    // ======================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 ALL PHASES COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60) + "\n");

    const batches = await prisma.productionBatch.findMany({
      where: { status: "COMPLETED" },
      include: { product: true },
    });

    console.log(`✅ Completed Batches: ${batches.length}`);

    for (const batch of batches) {
      console.log(`   - ${batch.batchSku}: ${batch.product.name}`);
      console.log(
        `     Target: ${batch.targetQuantity}, Actual: ${batch.actualQuantity}, Reject: ${batch.rejectQuantity}`
      );
    }

    const totalTarget = batches.reduce((sum, b) => sum + b.targetQuantity, 0);
    const totalActual = batches.reduce(
      (sum, b) => sum + (b.actualQuantity || 0),
      0
    );
    const totalReject = batches.reduce(
      (sum, b) => sum + (b.rejectQuantity || 0),
      0
    );

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Total Target: ${totalTarget}`);
    console.log(`   Total Produced: ${totalActual}`);
    console.log(`   Total Reject: ${totalReject}`);
    console.log(
      `   Efficiency: ${((totalActual / totalTarget) * 100).toFixed(2)}%`
    );
    console.log(
      `   Reject Rate: ${((totalReject / totalTarget) * 100).toFixed(2)}%`
    );

    console.log("\n✨ TrackPro is now fully operational!\n");
  } catch (error) {
    console.error("❌ Error during execution:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runAllPhases()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

export default runAllPhases;
