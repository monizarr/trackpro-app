import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST: Forward a verified sewing sub-batch to finishing
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

  try {
    const body = await request.json();
    const { assignedToId } = body;

    // Get sub-batch with items
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: resolvedParams.id },
      include: { items: true },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch tidak ditemukan" },
        { status: 404 },
      );
    }

    if (subBatch.source !== "SEWING") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hanya sub-batch dari tahap jahitan yang dapat diteruskan ke finishing",
        },
        { status: 400 },
      );
    }

    if (subBatch.status !== "SEWING_VERIFIED") {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-batch harus sudah diverifikasi (status SEWING_VERIFIED)",
        },
        { status: 400 },
      );
    }

    // Calculate total pieces in this sub-batch
    const totalPieces = subBatch.items.reduce(
      (sum, item) => sum + (item.goodQuantity || 0),
      0,
    );

    // Check if FinishingTask already exists for this batch
    const existingFinishingTask = await prisma.finishingTask.findUnique({
      where: { batchId: subBatch.batchId },
    });

    // If no finishing task exists, require assignedToId
    if (!existingFinishingTask && !assignedToId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pilih kepala finishing terlebih dahulu. assignedToId wajib diisi untuk penugasan pertama.",
        },
        { status: 400 },
      );
    }

    // If assignedToId provided, validate the finisher
    if (assignedToId && !existingFinishingTask) {
      const finisher = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!finisher) {
        return NextResponse.json(
          { success: false, error: "Kepala finishing tidak ditemukan" },
          { status: 404 },
        );
      }

      if (finisher.role !== "FINISHING") {
        return NextResponse.json(
          { success: false, error: "User yang dipilih bukan FINISHING" },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update sub-batch status
      const updated = await tx.subBatch.update({
        where: { id: resolvedParams.id },
        data: {
          status: "FORWARDED_TO_FINISHING",
        },
      });

      if (existingFinishingTask) {
        // Update existing finishing task - add pieces
        await tx.finishingTask.update({
          where: { id: existingFinishingTask.id },
          data: {
            piecesReceived: existingFinishingTask.piecesReceived + totalPieces,
          },
        });
      } else {
        // Create new finishing task
        await tx.finishingTask.create({
          data: {
            batchId: subBatch.batchId,
            assignedToId: assignedToId,
            piecesReceived: totalPieces,
            status: "PENDING",
            notes: `Dibuat dari forwarding sub-batch ${subBatch.subBatchSku}`,
          },
        });

        // Check if all sewing is done before changing batch status
        const sewingTask = await tx.sewingTask.findFirst({
          where: { batchId: subBatch.batchId },
        });

        // Only transition batch status if sewing task is completed/verified
        // (don't change batch status while sewing is still in progress)
        if (
          sewingTask &&
          ["COMPLETED", "VERIFIED"].includes(sewingTask.status)
        ) {
          const batch = await tx.productionBatch.findUnique({
            where: { id: subBatch.batchId },
          });
          if (
            batch &&
            ["SEWING_COMPLETED", "SEWING_VERIFIED"].includes(batch.status)
          ) {
            await tx.productionBatch.update({
              where: { id: subBatch.batchId },
              data: { status: "ASSIGNED_TO_FINISHING" },
            });
          }
        }
      }

      // Create timeline
      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "SEWING_SUB_BATCH_FORWARDED",
          details: `Sub-batch jahitan ${subBatch.subBatchSku} (${totalPieces} pcs) diteruskan ke finishing oleh ${session.user.name}`,
          createdAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "FORWARD_TO_FINISHING",
          entity: "SubBatch",
          entityId: updated.id,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sub-batch jahitan (${totalPieces} pcs) berhasil diteruskan ke finishing`,
    });
  } catch (error) {
    console.error("Error forwarding sub-batch to finishing:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
