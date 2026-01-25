import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST input sewing results by Kepala Produksi or Penjahit
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI", "PENJAHIT"]);
    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const { sewingResults, notes } = body;

    // Validate input
    if (!sewingResults || !Array.isArray(sewingResults)) {
      return NextResponse.json(
        {
          success: false,
          error: "Sewing results are required",
        },
        { status: 400 },
      );
    }

    // Get batch
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: true,
        cuttingResults: true,
        sewingTask: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Production batch not found",
        },
        { status: 404 },
      );
    }

    // Validate batch status
    if (!["ASSIGNED_TO_SEWER", "IN_SEWING"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot input sewing results for batch with status ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Calculate totals
    const totalActualPieces = sewingResults.reduce(
      (sum: number, r: any) => sum + (r.actualPieces || 0),
      0,
    );

    // Update batch in transaction
    const updatedBatch = await prisma.$transaction(async (tx) => {
      // Get sewing task
      let sewingTask = await tx.sewingTask.findFirst({
        where: { batchId: id },
      });

      if (!sewingTask) {
        return NextResponse.json(
          {
            success: false,
            error: "Sewing task not found",
          },
          { status: 404 },
        );
      }

      // Update sewing task
      sewingTask = await tx.sewingTask.update({
        where: { id: sewingTask.id },
        data: {
          piecesCompleted: totalActualPieces,
          notes: notes || null,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Update batch status
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "SEWING_COMPLETED",
          actualQuantity: totalActualPieces,
        },
        include: {
          product: true,
          sewingTask: true,
          cuttingResults: true,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SEWING_COMPLETED",
          details: `Hasil jahitan diinput oleh ${session.user.name}: ${totalActualPieces} pcs completed`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: updatedBatch,
      message: "Hasil jahitan berhasil disimpan",
    });
  } catch (error) {
    console.error("Error inputting sewing results:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to input sewing results",
      },
      { status: 500 },
    );
  }
}
