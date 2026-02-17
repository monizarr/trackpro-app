import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

  try {
    const body = await request.json();
    const { action } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    // Get sub-batch with items
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: resolvedParams.id },
      include: { items: true },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch not found" },
        { status: 404 },
      );
    }

    if (subBatch.status !== "CREATED") {
      return NextResponse.json(
        { success: false, error: "Sub-batch bukan status CREATED" },
        { status: 400 },
      );
    }

    // ============================================
    // SEWING SUB-BATCH VERIFICATION
    // ============================================
    if (subBatch.source === "SEWING") {
      if (action === "approve") {
        const updated = await prisma.subBatch.update({
          where: { id: resolvedParams.id },
          data: {
            status: "SEWING_VERIFIED",
            verifiedByProdAt: new Date(),
          },
        });

        await prisma.batchTimeline.create({
          data: {
            batchId: subBatch.batchId,
            event: "SEWING_SUB_BATCH_VERIFIED",
            details: `Sub-batch jahitan ${subBatch.subBatchSku} diverifikasi oleh ${session.user.name}`,
            createdAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "VERIFY_SEWING_SUB_BATCH",
            entity: "SubBatch",
            entityId: updated.id,
          },
        });

        return NextResponse.json({
          success: true,
          data: updated,
          message: "Sub-batch jahitan berhasil diverifikasi",
        });
      } else {
        // REJECT: Delete sub-batch and decrement piecesCompleted on SewingTask
        const totalPieces = subBatch.items.reduce(
          (sum, item) => sum + (item.goodQuantity || 0),
          0,
        );

        await prisma.$transaction(async (tx) => {
          // Decrement piecesCompleted on sewing task
          if (subBatch.sewingTaskId) {
            const sewingTask = await tx.sewingTask.findUnique({
              where: { id: subBatch.sewingTaskId },
            });
            if (sewingTask) {
              await tx.sewingTask.update({
                where: { id: subBatch.sewingTaskId },
                data: {
                  piecesCompleted: Math.max(
                    0,
                    sewingTask.piecesCompleted - totalPieces,
                  ),
                },
              });
            }
          }

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId: session.user.id,
              action: "REJECT_SEWING_SUB_BATCH",
              entity: "SubBatch",
              entityId: resolvedParams.id,
              oldValues: JSON.stringify(subBatch),
            },
          });

          // Create timeline
          await tx.batchTimeline.create({
            data: {
              batchId: subBatch.batchId,
              event: "SEWING_SUB_BATCH_REJECTED",
              details: `Sub-batch jahitan ${subBatch.subBatchSku} ditolak (${totalPieces} pcs). Dapat diinput ulang.`,
              createdAt: new Date(),
            },
          });

          // Delete items then sub-batch
          await tx.subBatchItem.deleteMany({
            where: { subBatchId: resolvedParams.id },
          });
          await tx.subBatch.delete({
            where: { id: resolvedParams.id },
          });
        });

        return NextResponse.json({
          success: true,
          data: null,
          message: `Sub-batch jahitan ditolak dan dihapus (${totalPieces} pcs). Penjahit dapat menginput ulang.`,
        });
      }
    }

    // ============================================
    // FINISHING SUB-BATCH VERIFICATION (existing flow)
    // ============================================
    if (action === "approve") {
      // Update sub-batch status ke SUBMITTED_TO_WAREHOUSE (siap dikirim ke gudang)
      const updated = await prisma.subBatch.update({
        where: { id: resolvedParams.id },
        data: {
          status: "SUBMITTED_TO_WAREHOUSE",
          verifiedByProdAt: new Date(),
        },
      });

      // insert data di timeline
      await prisma.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "SUB_BATCH_APPROVED",
          details: `Sub-batch ${subBatch.subBatchSku} disetujui dan siap dikirim ke gudang`,
          createdAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "APPROVE",
          entity: "SubBatch",
          entityId: updated.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Hasil finishing disetujui dan siap dikirim ke gudang",
      });
    } else {
      // REJECT: Hapus sub-batch secara permanen
      // Ini akan mengembalikan hasil jahit yang sudah di-submit agar bisa diinput ulang di sub-batch baru

      // Create audit log sebelum dihapus
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REJECT",
          entity: "SubBatch",
          entityId: resolvedParams.id,
          oldValues: JSON.stringify(subBatch),
          newValues: undefined,
        },
      });

      // insert data di timeline
      await prisma.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "SUB_BATCH_REJECTED",
          details: `Sub-batch ${subBatch.subBatchSku} ditolak dan dihapus`,
          createdAt: new Date(),
        },
      });

      // Delete sub-batch items first (cascade should handle this, but explicit is better)
      await prisma.subBatchItem.deleteMany({
        where: { subBatchId: resolvedParams.id },
      });

      // Delete the sub-batch
      await prisma.subBatch.delete({
        where: { id: resolvedParams.id },
      });

      return NextResponse.json({
        success: true,
        data: null,
        message:
          "Hasil finishing ditolak dan sub-batch dihapus. Hasil jahit dapat diinput ulang di sub-batch baru",
      });
    }
  } catch (error) {
    console.error("Error verifying sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
