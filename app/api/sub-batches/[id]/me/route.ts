import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    await requireRole(["FINISHING"]);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    // Fetch the actual sub-batches
    const subBatches = await prisma.subBatch.findMany({
      where: { batchId: id },
      include: {
        warehouseVerifiedBy: {
          select: { id: true, name: true, username: true },
        },
        items: true,
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        finishingTask: {
          where: { assignedToId: session.user.id },
        },
      },
      orderBy: { createdAt: "asc" },
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
