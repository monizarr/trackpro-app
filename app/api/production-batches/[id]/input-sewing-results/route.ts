import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST input sewing results (iterative/partial) by Kepala Produksi or Penjahit
// Creates a sewing sub-batch for each submission (partial delivery to finishing)
// Each submission adds SubBatch (source=SEWING) and increments piecesCompleted
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

    // Get batch with existing sewing sub-batches
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: true,
        cuttingResults: true,
        sewingTask: true,
        subBatches: {
          where: { source: "SEWING" },
          include: { items: true },
        },
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

    // Validate batch status - allow input while ASSIGNED_TO_SEWER or IN_SEWING
    if (!["ASSIGNED_TO_SEWER", "IN_SEWING"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot input sewing results for batch with status ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Calculate totals from THIS submission
    const thisSubmissionTotal = sewingResults.reduce(
      (sum: number, r: { actualPieces?: number }) =>
        sum + (r.actualPieces || 0),
      0,
    );

    if (thisSubmissionTotal <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Total pieces harus lebih dari 0",
        },
        { status: 400 },
      );
    }

    // Calculate already-sewn pieces per size/color from sewing sub-batches
    const alreadySewn = new Map<string, number>();
    for (const sb of batch.subBatches) {
      for (const item of sb.items) {
        const key = `${item.productSize}|${item.color}`;
        alreadySewn.set(key, (alreadySewn.get(key) || 0) + item.goodQuantity);
      }
    }

    // Validate against cutting results - don't exceed available pieces
    for (const result of sewingResults) {
      if (!result.productSize || !result.color) continue;
      if ((result.actualPieces || 0) <= 0) continue;

      const key = `${result.productSize}|${result.color}`;
      const cuttingResult = batch.cuttingResults.find(
        (cr) =>
          cr.productSize === result.productSize && cr.color === result.color,
      );
      const maxAvailable =
        (cuttingResult?.actualPieces || 0) - (alreadySewn.get(key) || 0);

      if ((result.actualPieces || 0) > maxAvailable) {
        return NextResponse.json(
          {
            success: false,
            error: `${result.productSize} ${result.color}: melebihi sisa dari potongan (tersisa ${maxAvailable} pcs)`,
          },
          { status: 400 },
        );
      }
    }

    // Update batch in transaction
    const updatedBatch = await prisma.$transaction(async (tx) => {
      // Get sewing task
      const sewingTask = await tx.sewingTask.findFirst({
        where: { batchId: id },
      });

      if (!sewingTask) {
        throw new Error("Sewing task not found");
      }

      // Get next sub-batch number
      const existingCount = await tx.subBatch.count({
        where: { batchId: id },
      });
      const subBatchNumber = String(existingCount + 1).padStart(3, "0");
      const subBatchSku = `${batch.batchSku}-SUB-${subBatchNumber}`;

      // Build sub-batch items from non-zero sewing results
      const subBatchItems = sewingResults
        .filter((r: { actualPieces?: number }) => (r.actualPieces || 0) > 0)
        .map(
          (r: {
            productSize: string;
            color: string;
            actualPieces?: number;
          }) => ({
            productSize: r.productSize,
            color: r.color,
            goodQuantity: r.actualPieces || 0,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 0,
          }),
        );

      // Create sewing sub-batch
      await tx.subBatch.create({
        data: {
          subBatchSku,
          batchId: id,
          source: "SEWING",
          sewingTaskId: sewingTask.id,
          finishingGoodOutput: thisSubmissionTotal,
          rejectKotor: 0,
          rejectSobek: 0,
          rejectRusakJahit: 0,
          status: "CREATED",
          notes: notes || null,
          items: {
            create: subBatchItems,
          },
          timeline: {
            create: {
              event: "SUB_BATCH_CREATED",
              details: `Sub-batch hasil jahitan dibuat oleh ${session.user.name}: ${thisSubmissionTotal} pcs`,
            },
          },
        },
      });

      // Calculate new total piecesCompleted (previous + this submission)
      const newPiecesCompleted =
        sewingTask.piecesCompleted + thisSubmissionTotal;

      // Update sewing task - increment piecesCompleted, keep IN_PROGRESS
      await tx.sewingTask.update({
        where: { id: sewingTask.id },
        data: {
          piecesCompleted: newPiecesCompleted,
          notes: notes || sewingTask.notes,
          status: "IN_PROGRESS",
          startedAt: sewingTask.startedAt || new Date(),
        },
      });

      // Ensure batch status is IN_SEWING
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "IN_SEWING",
          actualQuantity: newPiecesCompleted,
        },
        include: {
          product: true,
          sewingTask: true,
          cuttingResults: true,
          subBatches: {
            where: { source: "SEWING" },
            include: { items: true },
          },
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SEWING_STARTED",
          details: `Sub-batch ${subBatchSku} dibuat oleh ${session.user.name}: ${thisSubmissionTotal} pcs (total: ${newPiecesCompleted} pcs)`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: updatedBatch,
      message: `Sub-batch hasil jahitan berhasil dibuat (${thisSubmissionTotal} pcs)`,
    });
  } catch (error) {
    console.error("Error inputting sewing results:", error);
    const message =
      error instanceof Error ? error.message : "Failed to input sewing results";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
