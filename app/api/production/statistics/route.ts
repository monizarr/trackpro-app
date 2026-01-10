import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

interface VerificationItem {
  id: string;
  type: string;
  code: string;
  stage: string;
  worker: string;
  product: string;
  qty: number;
  time: Date | null;
}

// GET production dashboard statistics
export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    // Get active batches (not completed yet)
    const activeBatches = await prisma.productionBatch.findMany({
      where: {
        status: {
          not: "COMPLETED",
        },
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        cuttingTask: true,
        sewingTask: true,
        finishingTask: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const activeBatchesCount = activeBatches.length;

    // Get pending verification tasks - COMPLETED but not verified
    const pendingVerification: VerificationItem[] = [];

    const pendingCuttingTasks = await prisma.cuttingTask.findMany({
      where: {
        status: "COMPLETED",
        verifiedAt: null,
      },
      include: {
        batch: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 10,
    });

    pendingCuttingTasks.forEach((task) => {
      pendingVerification.push({
        id: task.id,
        type: "CUTTING",
        code: task.batch.batchSku,
        stage: "Pemotongan",
        worker: task.assignedTo?.name || "N/A",
        product: task.batch.product.name,
        qty: task.piecesCompleted,
        time: task.completedAt,
      });
    });

    const pendingSewingTasks = await prisma.sewingTask.findMany({
      where: {
        status: "COMPLETED",
        verifiedAt: null,
      },
      include: {
        batch: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 10,
    });

    pendingSewingTasks.forEach((task) => {
      pendingVerification.push({
        id: task.id,
        type: "SEWING",
        code: task.batch.batchSku,
        stage: "Penjahitan",
        worker: task.assignedTo?.name || "N/A",
        product: task.batch.product.name,
        qty: task.piecesCompleted,
        time: task.completedAt,
      });
    });

    const pendingFinishingTasks = await prisma.finishingTask.findMany({
      where: {
        status: "COMPLETED",
        verifiedAt: null,
      },
      include: {
        batch: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 10,
    });

    pendingFinishingTasks.forEach((task) => {
      pendingVerification.push({
        id: task.id,
        type: "FINISHING",
        code: task.batch.batchSku,
        stage: "Finishing",
        worker: task.assignedTo?.name || "N/A",
        product: task.batch.product.name,
        qty: task.piecesCompleted,
        time: task.completedAt,
      });
    });

    const pendingVerificationCount = pendingVerification.length;

    // Get worker summary
    const workers = await prisma.user.findMany({
      where: {
        role: {
          in: ["PEMOTONG", "PENJAHIT", "FINISHING"],
        },
      },
      include: {
        cuttingTasks: {
          where: {
            status: "IN_PROGRESS",
          },
        },
        sewingTasks: {
          where: {
            status: "IN_PROGRESS",
          },
        },
        finishingTasks: {
          where: {
            status: "IN_PROGRESS",
          },
        },
      },
    });

    const workerSummary = workers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      activeTasks:
        worker.cuttingTasks.length +
        worker.sewingTasks.length +
        worker.finishingTasks.length,
    }));

    // Calculate total production this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedBatchesThisMonth = await prisma.productionBatch.count({
      where: {
        status: "COMPLETED",
        completedDate: {
          gte: startOfMonth,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        activeBatchesCount,
        pendingVerificationCount,
        completedBatchesThisMonth,
        activeBatches: activeBatches.slice(0, 5).map((batch) => ({
          id: batch.id,
          code: batch.batchSku,
          product: batch.product.name,
          targetQuantity: batch.targetQuantity,
          status: batch.status,
          progress: {
            cutting: batch.cuttingTask
              ? Math.round(
                  (batch.cuttingTask.piecesCompleted / batch.targetQuantity) *
                    100
                )
              : 0,
            sewing: batch.sewingTask
              ? Math.round(
                  (batch.sewingTask.piecesCompleted / batch.targetQuantity) *
                    100
                )
              : 0,
            finishing: batch.finishingTask
              ? Math.round(
                  (batch.finishingTask.piecesCompleted / batch.targetQuantity) *
                    100
                )
              : 0,
          },
        })),
        pendingVerification: pendingVerification.slice(0, 5),
        workerSummary: workerSummary.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error fetching production statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch production statistics",
      },
      { status: 500 }
    );
  }
}
