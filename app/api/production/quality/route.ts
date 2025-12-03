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

// GET quality verification items
export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    const pendingVerification: VerificationItem[] = [];

    // Check cutting tasks - COMPLETED but not yet verified
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

    // Check sewing tasks - COMPLETED but not yet verified
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

    // Check finishing tasks - COMPLETED but not yet verified
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

    return NextResponse.json({
      success: true,
      data: pendingVerification,
    });
  } catch (error) {
    console.error("Error fetching quality verifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch quality verifications",
      },
      { status: 500 }
    );
  }
}

// POST approve or reject task
export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const body = await request.json();
    const { id, type, action } = body;

    if (!id || !type || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: id, type, action",
        },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "VERIFIED" : "REJECTED";

    // Update task based on type
    if (type === "CUTTING") {
      await prisma.cuttingTask.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: new Date(),
          verifiedById: session.user.id,
        },
      });
    } else if (type === "SEWING") {
      await prisma.sewingTask.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: new Date(),
          verifiedById: session.user.id,
        },
      });
    } else if (type === "FINISHING") {
      await prisma.finishingTask.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedAt: new Date(),
          verifiedById: session.user.id,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid task type",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Task ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update task",
      },
      { status: 500 }
    );
  }
}
