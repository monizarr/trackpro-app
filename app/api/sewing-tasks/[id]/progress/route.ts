import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Input partial sewing results as sub-batch (iterative/accumulative)
// Ka. Penjahit inputs what they've sewn in this session.
// Creates a NEW SubBatch with source=SEWING (each submission = 1 sub-batch = partial delivery to finishing).
// Adds to piecesCompleted (doesn't set total).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PENJAHIT") {
      return NextResponse.json(
        { success: false, error: "Only PENJAHIT can update progress" },
        { status: 403 },
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { sewingResults, notes } = body;

    // Validate sewing results
    if (!sewingResults || !Array.isArray(sewingResults)) {
      return NextResponse.json(
        { success: false, error: "Sewing results are required" },
        { status: 400 },
      );
    }

    // Check if task exists and belongs to this user
    const task = await prisma.sewingTask.findUnique({
      where: { id: taskId },
      include: {
        batch: {
          include: {
            cuttingResults: true,
            subBatches: {
              where: { source: "SEWING" },
              include: { items: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    if (task.assignedToId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Task not assigned to you" },
        { status: 403 },
      );
    }

    // Allow progress submission as long as sewing task is still IN_PROGRESS
    // (batch may have moved to ASSIGNED_TO_FINISHING etc. via sub-batch forwarding)
    if (task.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          success: false,
          error: `Task penjahitan sudah berstatus ${task.status}, tidak dapat mengirim sub-batch baru`,
        },
        { status: 400 },
      );
    }

    // Calculate total from THIS submission (only non-zero entries)
    const thisSubmissionTotal = sewingResults.reduce(
      (sum: number, r: { actualPieces: number }) => sum + (r.actualPieces || 0),
      0,
    );

    if (thisSubmissionTotal <= 0) {
      return NextResponse.json(
        { success: false, error: "Total pieces harus lebih dari 0" },
        { status: 400 },
      );
    }

    // Calculate already-sewn pieces per size/color from existing sewing sub-batches
    const alreadySewn = new Map<string, number>();
    for (const sb of task.batch.subBatches) {
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
      const cuttingResult = task.batch.cuttingResults.find(
        (cr: { productSize: string; color: string }) =>
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

    // Create sub-batch in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get next sub-batch number (count all sub-batches, not just sewing)
      const existingCount = await tx.subBatch.count({
        where: { batchId: task.batchId },
      });
      const subBatchNumber = String(existingCount + 1).padStart(3, "0");
      const subBatchSku = `${task.batch.batchSku}-SUB-${subBatchNumber}`;

      // Build sub-batch items from non-zero sewing results
      const subBatchItems = sewingResults
        .filter((r: { actualPieces: number }) => (r.actualPieces || 0) > 0)
        .map(
          (r: {
            productSize: string;
            color: string;
            actualPieces: number;
          }) => ({
            productSize: r.productSize,
            color: r.color,
            goodQuantity: r.actualPieces || 0,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 0,
          }),
        );

      // Create sub-batch with source=SEWING
      const subBatch = await tx.subBatch.create({
        data: {
          subBatchSku,
          batchId: task.batchId,
          source: "SEWING",
          sewingTaskId: task.id,
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
              details: `Sub-batch hasil jahitan dibuat oleh ${user.name}: ${thisSubmissionTotal} pcs`,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Increment piecesCompleted (add, not replace)
      const newPiecesCompleted = task.piecesCompleted + thisSubmissionTotal;

      const updated = await tx.sewingTask.update({
        where: { id: taskId },
        data: {
          piecesCompleted: newPiecesCompleted,
          notes: notes || task.notes,
          status: "IN_PROGRESS",
          startedAt: task.startedAt || new Date(),
        },
      });

      // Update batch actualQuantity
      await tx.productionBatch.update({
        where: { id: task.batchId },
        data: {
          actualQuantity: newPiecesCompleted,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: task.batchId,
          event: "SEWING_STARTED",
          details: `Sub-batch ${subBatchSku} dibuat oleh ${user.name}: ${thisSubmissionTotal} pcs (total: ${newPiecesCompleted} pcs)`,
        },
      });

      return { task: updated, subBatch };
    });

    return NextResponse.json({
      success: true,
      data: result.task,
      subBatch: result.subBatch,
      message: `Sub-batch ${result.subBatch.subBatchSku} berhasil dibuat (${thisSubmissionTotal} pcs)`,
    });
  } catch (error) {
    console.error("Error updating sewing task progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update progress" },
      { status: 500 },
    );
  }
}
