import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST - Complete production batch setelah semua sub-batch selesai
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id } = params;

    // Get batch with sub-batches
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        subBatches: {
          include: {
            items: true,
          },
        },
        product: {
          select: { name: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Production batch not found" },
        { status: 404 },
      );
    }

    // Validate batch has sub-batches
    if (batch.subBatches.length === 0) {
      return NextResponse.json(
        { success: false, error: "Batch tidak memiliki sub-batch" },
        { status: 400 },
      );
    }

    // Check if all sub-batches are verified by warehouse
    const unverifiedSubBatches = batch.subBatches.filter(
      (sb) => sb.status !== "WAREHOUSE_VERIFIED" && sb.status !== "COMPLETED",
    );

    if (unverifiedSubBatches.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Masih ada ${unverifiedSubBatches.length} sub-batch yang belum diverifikasi gudang`,
          unverifiedSubBatches: unverifiedSubBatches.map((sb) => ({
            sku: sb.subBatchSku,
            status: sb.status,
          })),
        },
        { status: 400 },
      );
    }

    // Validate: All finishing output must be processed in sub-batches
    // This enforces: totalFinishingInput === totalSewingOutput
    let totalFinishingInput = 0;
    for (const subBatch of batch.subBatches) {
      if (subBatch.items && Array.isArray(subBatch.items)) {
        for (const item of subBatch.items) {
          totalFinishingInput +=
            (item.goodQuantity || 0) +
            (item.rejectKotor || 0) +
            (item.rejectSobek || 0) +
            (item.rejectRusakJahit || 0);
        }
      }
    }

    // Get sewing output (source of truth for what should be in finishing)
    const sewingTask = await prisma.sewingTask.findUnique({
      where: { batchId: id },
      select: { piecesCompleted: true },
    });
    const totalSewingOutput = sewingTask?.piecesCompleted || 0;

    // Enforce: finishing input must equal sewing output
    if (totalFinishingInput !== totalSewingOutput) {
      return NextResponse.json(
        {
          success: false,
          error: `Jumlah pcs yang masuk finishing (${totalFinishingInput}) tidak sama dengan hasil jahitan (${totalSewingOutput}). Semua hasil jahitan harus diproses di finishing terlebih dahulu.`,
          details: {
            totalFinishingInput,
            totalSewingOutput,
          },
        },
        { status: 400 },
      );
    }

    // Calculate totals
    const totalFinishedPieces = batch.subBatches.reduce(
      (sum, sb) => sum + sb.finishingGoodOutput,
      0,
    );
    const totalRejectPieces = batch.subBatches.reduce(
      (sum, sb) => sum + sb.rejectKotor + sb.rejectSobek + sb.rejectRusakJahit,
      0,
    );

    // Complete batch
    const result = await prisma.$transaction(async (tx) => {
      // Update all sub-batches to COMPLETED
      await tx.subBatch.updateMany({
        where: { batchId: id },
        data: { status: "COMPLETED" },
      });

      // Update main batch
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedDate: new Date(),
          actualQuantity: totalFinishedPieces,
          rejectQuantity: totalRejectPieces,
        },
        include: {
          product: { select: { name: true, sku: true } },
          subBatches: {
            include: {
              items: true,
            },
          },
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "BATCH_COMPLETED",
          details: `Batch produksi selesai. Total: ${totalFinishedPieces} pcs, Reject: ${totalRejectPieces} pcs. Dikonfirmasi oleh ${session.user.name}`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Batch ${batch.batchSku} berhasil diselesaikan. Total produksi: ${totalFinishedPieces} pcs`,
      summary: {
        totalSubBatches: batch.subBatches.length,
        totalFinishedPieces,
        totalRejectPieces,
      },
    });
  } catch (error) {
    console.error("Error completing batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete batch" },
      { status: 500 },
    );
  }
}
