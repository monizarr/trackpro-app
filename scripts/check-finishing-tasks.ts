import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log("=== Memeriksa Finishing Tasks di January 2026 ===\n");

    // Check finishing tasks in January 2026
    const finishingTasks = await prisma.finishingTask.findMany({
      where: {
        createdAt: {
          gte: new Date("2026-01-01"),
          lt: new Date("2026-02-01"),
        },
      },
      include: {
        batch: {
          include: {
            product: true,
            sewingTask: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `Total Finishing Tasks di Januari 2026: ${finishingTasks.length}`,
    );
    console.log("");

    if (finishingTasks.length === 0) {
      console.log("❌ TIDAK ADA finishing tasks di Januari 2026!");
      console.log("\nMari cek batches yang status SEWING_VERIFIED:");

      const sewingVerifiedBatches = await prisma.productionBatch.findMany({
        where: {
          status: "SEWING_VERIFIED",
          createdAt: {
            gte: new Date("2026-01-01"),
            lt: new Date("2026-02-01"),
          },
        },
        include: {
          product: true,
          sewingTask: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(
        `\nBatches dengan status SEWING_VERIFIED di Januari: ${sewingVerifiedBatches.length}`,
      );
      sewingVerifiedBatches.forEach((batch) => {
        console.log(
          `  - ${batch.batchSku} (${batch.product.name}) - Sewing Completed: ${batch.sewingTask?.piecesCompleted || 0} pcs`,
        );
      });
    } else {
      console.log("✅ Finishing Tasks ditemukan:\n");

      finishingTasks.forEach((task, idx) => {
        const createdDate = new Date(task.createdAt).toLocaleDateString(
          "id-ID",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          },
        );

        console.log(`${idx + 1}. Task ID: ${task.id.substring(0, 8)}...`);
        console.log(`   Status: ${task.status}`);
        console.log(
          `   Batch: ${task.batch.batchSku} (${task.batch.product.name})`,
        );
        console.log(
          `   Assigned To: ${task.assignedTo.name} (${task.assignedTo.email})`,
        );
        console.log(`   Pieces Received: ${task.piecesReceived}`);
        console.log(`   Pieces Completed: ${task.piecesCompleted}`);
        console.log(`   Created At: ${createdDate}`);
        console.log("");
      });
    }

    // Check all batches in January to see their status distribution
    console.log("=== Status Distribution Batches Januari 2026 ===\n");

    const allBatches = await prisma.productionBatch.findMany({
      where: {
        createdAt: {
          gte: new Date("2026-01-01"),
          lt: new Date("2026-02-01"),
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const statusCounts: Record<string, number> = {};
    allBatches.forEach((batch) => {
      statusCounts[batch.status] = (statusCounts[batch.status] || 0) + 1;
    });

    console.log(`Total Batches di Januari 2026: ${allBatches.length}`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show SEWING_VERIFIED batches that haven't been assigned to finishing
    console.log(
      "\n=== SEWING_VERIFIED Batches (Ready for Finishing Assignment) ===\n",
    );

    const readyForFinishing = allBatches.filter(
      (b) => b.status === "SEWING_VERIFIED",
    );
    console.log(`Batches ready for finishing: ${readyForFinishing.length}`);
    readyForFinishing.forEach((batch) => {
      console.log(`  - ${batch.batchSku} (${batch.product.name})`);
    });

    // Check if finishers exist
    console.log("\n=== Finishers in System ===\n");
    const finishers = await prisma.user.findMany({
      where: {
        role: "FINISHING",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            finishingTasks: true,
          },
        },
      },
    });

    console.log(`Total Active Finishers: ${finishers.length}`);
    finishers.forEach((finisher) => {
      console.log(
        `  - ${finisher.name} (${finisher.email}): ${finisher._count.finishingTasks} tasks`,
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
