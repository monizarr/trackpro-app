import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    await requireRole(["FINISHING"]);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Fetch sub-batches assigned to this finisher via FinishingTask
    const finishingTasks = await prisma.finishingTask.findMany({
      where: {
        assignedToId: session.user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { subBatchId: true },
    });

    const subBatchIds = finishingTasks.map((task) => task.subBatchId);

    // Fetch the actual sub-batches
    const subBatches = await prisma.subBatch.findMany({
      where: {
        id: { in: subBatchIds },
        status: { in: ["CREATED", "IN_PROGRESS"] },
      },
      include: {
        batch: {
          select: {
            id: true,
            batchSku: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            productSize: true,
            color: true,
            receivedPieces: true,
            goodQuantity: true,
            rejectKotor: true,
            rejectSobek: true,
            rejectRusakJahit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: subBatches,
    });
  } catch (error) {
    console.error("Error fetching sub-batches for finisher:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sub-batches" },
      { status: 500 },
    );
  }
}
