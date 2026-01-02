import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { SubBatchStatus } from "@prisma/client";

// POST - Verify sub-batch warehouse (simpan sebagai finished goods)
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const params = await context.params;
    const { id: subBatchId } = params;
    const body = await request.json();
    const { goodsLocation, warehouseNotes } = body;

    if (!goodsLocation?.trim()) {
      return NextResponse.json(
        { success: false, error: "Lokasi penyimpanan harus diisi" },
        { status: 400 }
      );
    }

    // Get sub-batch
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: subBatchId },
      include: {
        batch: {
          select: {
            id: true,
            batchSku: true,
            productId: true,
            product: { select: { name: true, sku: true } },
          },
        },
        items: true,
        assignedFinisher: { select: { name: true } },
      },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch tidak ditemukan" },
        { status: 404 }
      );
    }

    if (subBatch.status !== SubBatchStatus.SUBMITTED_TO_WAREHOUSE) {
      return NextResponse.json(
        {
          success: false,
          error: `Sub-batch harus berstatus SUBMITTED_TO_WAREHOUSE. Status saat ini: ${subBatch.status}`,
        },
        { status: 400 }
      );
    }

    // Execute verification in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update sub-batch status
      await tx.subBatch.update({
        where: { id: subBatchId },
        data: {
          status: SubBatchStatus.WAREHOUSE_VERIFIED,
          warehouseVerifiedById: session.user.id,
          warehouseVerifiedAt: new Date(),
          notes: warehouseNotes
            ? `${subBatch.notes || ""}\n[Warehouse] ${warehouseNotes}`.trim()
            : subBatch.notes,
        },
      });

      // Create finished goods for good pieces
      let finishedGood = null;
      if (subBatch.finishingOutput > 0) {
        finishedGood = await tx.finishedGood.create({
          data: {
            batchId: subBatch.batch.id,
            productId: subBatch.batch.productId,
            subBatchId: subBatchId,
            type: "FINISHED",
            quantity: subBatch.finishingOutput,
            location: goodsLocation,
            notes: `Sub-batch: ${subBatch.subBatchSku}. ${
              warehouseNotes || ""
            }`.trim(),
            verifiedById: session.user.id,
            verifiedAt: new Date(),
          },
        });
      }

      // Create reject goods if any
      let rejectGood = null;
      const totalReject = subBatch.sewingReject + subBatch.finishingReject;
      if (totalReject > 0) {
        rejectGood = await tx.finishedGood.create({
          data: {
            batchId: subBatch.batch.id,
            productId: subBatch.batch.productId,
            subBatchId: subBatchId,
            type: "REJECT",
            quantity: totalReject,
            location: goodsLocation,
            notes: `Sub-batch: ${subBatch.subBatchSku}. Sewing reject: ${subBatch.sewingReject}, Finishing reject: ${subBatch.finishingReject}`,
            verifiedById: session.user.id,
            verifiedAt: new Date(),
          },
        });
      }

      // Create timeline entry
      await tx.subBatchTimeline.create({
        data: {
          subBatchId,
          event: "WAREHOUSE_VERIFIED",
          details: `Diverifikasi gudang oleh ${session.user.name}. Good: ${subBatch.finishingOutput}, Reject: ${totalReject}. Lokasi: ${goodsLocation}`,
        },
      });

      // Check if all sub-batches for this batch are verified
      const allSubBatches = await tx.subBatch.findMany({
        where: { batchId: subBatch.batch.id },
      });

      const allVerified = allSubBatches.every(
        (sb) =>
          sb.id === subBatchId ||
          sb.status === SubBatchStatus.WAREHOUSE_VERIFIED ||
          sb.status === SubBatchStatus.COMPLETED
      );

      // If all verified, update main batch status
      if (allVerified) {
        // Calculate totals
        const totalFinished = allSubBatches.reduce(
          (sum, sb) => sum + sb.finishingOutput,
          0
        );
        const totalReject = allSubBatches.reduce(
          (sum, sb) => sum + sb.sewingReject + sb.finishingReject,
          0
        );

        await tx.productionBatch.update({
          where: { id: subBatch.batch.id },
          data: {
            status: "WAREHOUSE_VERIFIED",
            actualQuantity: totalFinished,
            rejectQuantity: totalReject,
          },
        });

        await tx.batchTimeline.create({
          data: {
            batchId: subBatch.batch.id,
            event: "WAREHOUSE_VERIFIED",
            details: `Semua sub-batch diverifikasi gudang. Total finished: ${totalFinished}, Total reject: ${totalReject}`,
          },
        });
      }

      return {
        finishedGood,
        rejectGood,
        allVerified,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Sub-batch ${subBatch.subBatchSku} berhasil diverifikasi`,
      data: result,
    });
  } catch (error) {
    console.error("Error verifying sub-batch warehouse:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memverifikasi sub-batch" },
      { status: 500 }
    );
  }
}
