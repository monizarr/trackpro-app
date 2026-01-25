import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { BatchStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    // Verify batch exists and is in correct status
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: { finishingTask: true },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch tidak ditemukan" },
        { status: 404 },
      );
    }

    if (
      batch.status !== BatchStatus.ASSIGNED_TO_FINISHING &&
      batch.status !== BatchStatus.IN_FINISHING
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus dalam status ASSIGNED_TO_FINISHING atau IN_FINISHING. Status saat ini: ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Update batch status and create timeline in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: BatchStatus.IN_FINISHING,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "FINISHING_STARTED",
          details: notes || null,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      message: "Finishing dimulai",
      data: result,
    });
  } catch (error) {
    console.error("Error starting finishing:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
