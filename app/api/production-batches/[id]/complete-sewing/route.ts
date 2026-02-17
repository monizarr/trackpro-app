import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST - Mark sewing as completed (after iterative sewing results input)
// Called by Ka. Produksi / Owner when all sewing is done or they decide to finalize
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI", "PENJAHIT"]);
    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const { notes } = body;

    // Get batch with sewing task and results
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        sewingTask: true,
        sewingResults: true,
        cuttingResults: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Production batch not found" },
        { status: 404 },
      );
    }

    if (batch.status !== "IN_SEWING") {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus berstatus IN_SEWING. Status saat ini: ${batch.status}`,
        },
        { status: 400 },
      );
    }

    if (!batch.sewingTask) {
      return NextResponse.json(
        { success: false, error: "Sewing task not found" },
        { status: 404 },
      );
    }

    // Must have at least some sewing results
    if (batch.sewingTask.piecesCompleted <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Belum ada hasil jahitan yang diinput. Input hasil jahitan terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    // Mark sewing as completed (partial completion allowed)
    const result = await prisma.$transaction(async (tx) => {
      // Update sewing task to COMPLETED
      await tx.sewingTask.update({
        where: { id: batch.sewingTask!.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: notes || batch.sewingTask!.notes,
        },
      });

      // Update batch status to SEWING_COMPLETED
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "SEWING_COMPLETED",
          actualQuantity: batch.sewingTask!.piecesCompleted,
        },
        include: {
          product: true,
          sewingTask: true,
          cuttingResults: true,
          sewingResults: true,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SEWING_COMPLETED",
          details: `Penjahitan diselesaikan oleh ${session.user.name}. Total: ${batch.sewingTask!.piecesCompleted} pcs`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Penjahitan selesai dengan total ${batch.sewingTask.piecesCompleted} pcs`,
    });
  } catch (error) {
    console.error("Error completing sewing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete sewing",
      },
      { status: 500 },
    );
  }
}
