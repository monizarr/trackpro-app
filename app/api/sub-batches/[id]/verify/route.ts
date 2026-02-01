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

    // Get sub-batch
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: resolvedParams.id },
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
    console.error("Error verifying finishing:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
