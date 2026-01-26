import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// PATCH complete sub-batch finishing
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    await requireRole(["FINISHING"]);
    const body = await request.json();
    const { notes } = body;

    const subBatchId = params.id;

    // Check if sub-batch exists
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: subBatchId },
      include: { batch: true },
    });

    if (!subBatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Sub-batch tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if ((subBatch.status as string) !== "CREATED") {
      return NextResponse.json(
        {
          success: false,
          error: `Sub-batch harus berstatus CREATED untuk diselesaikan. Status saat ini: ${subBatch.status}`,
        },
        { status: 400 },
      );
    }

    // Update sub-batch status to SUBMITTED_TO_WAREHOUSE
    const result = await prisma.subBatch.update({
      where: { id: subBatchId },
      data: {
        status: "SUBMITTED_TO_WAREHOUSE",
        submittedToWarehouseAt: new Date(),
        notes: notes || subBatch.notes,
      },
      include: {
        batch: {
          select: {
            batchSku: true,
            product: { select: { name: true } },
          },
        },
        items: true,
      },
    });

    // Add timeline entry
    await prisma.subBatchTimeline.create({
      data: {
        subBatchId,
        event: "FINISHING_COMPLETED",
        details: `Finishing selesai. Good: ${result.finishingGoodOutput}, Kotor: ${result.rejectKotor}, Sobek: ${result.rejectSobek}, Rusak Jahit: ${result.rejectRusakJahit}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Sub-batch selesai dan siap dikirim ke gudang",
    });
  } catch (error) {
    console.error("Error completing sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete sub-batch" },
      { status: 500 },
    );
  }
}
