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
      // REJECT: Delete sub-batch items untuk kembalikan sewing output
      // Kemudian reset status sub-batch ke CREATED untuk bisa diedit ulang

      // Delete all items in this sub-batch
      await prisma.subBatchItem.deleteMany({
        where: { subBatchId: resolvedParams.id },
      });

      // Reset sub-batch data
      const updated = await prisma.subBatch.update({
        where: { id: resolvedParams.id },
        data: {
          status: "CREATED",
          finishingGoodOutput: 0,
          rejectKotor: 0,
          rejectSobek: 0,
          rejectRusakJahit: 0,
          notes: null,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REJECT",
          entity: "SubBatch",
          entityId: updated.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message:
          "Hasil finishing ditolak dan di-reset. Hasil jahitan telah dikembalikan untuk bisa diisi ulang oleh kepala finishing",
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
