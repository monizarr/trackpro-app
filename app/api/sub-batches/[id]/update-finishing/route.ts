import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

interface FinishingResultItem {
  itemId: string;
  goodQuantity: number;
  rejectKotor: number;
  rejectSobek: number;
  rejectRusakJahit: number;
}

// PATCH update finishing results for sub-batch
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    await requireRole(["FINISHING"]);
    const body = await request.json();
    const { items, notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "items harus diisi",
        },
        { status: 400 },
      );
    }

    const subBatchId = params.id;

    // Check if sub-batch exists
    const subBatch = await prisma.subBatch.findUnique({
      where: { id: subBatchId },
      include: { items: true },
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

    // Update sub-batch items and aggregated totals
    const result = await prisma.$transaction(async (tx) => {
      let totalGood = 0;
      let totalKotor = 0;
      let totalSobek = 0;
      let totalRusakJahit = 0;

      // Update each item
      for (const item of items as FinishingResultItem[]) {
        await tx.subBatchItem.update({
          where: { id: item.itemId },
          data: {
            goodQuantity: item.goodQuantity,
            rejectKotor: item.rejectKotor,
            rejectSobek: item.rejectSobek,
            rejectRusakJahit: item.rejectRusakJahit,
          },
        });

        totalGood += item.goodQuantity;
        totalKotor += item.rejectKotor;
        totalSobek += item.rejectSobek;
        totalRusakJahit += item.rejectRusakJahit;
      }

      // Update sub-batch aggregated totals
      const updatedSubBatch = await tx.subBatch.update({
        where: { id: subBatchId },
        data: {
          finishingGoodOutput: totalGood,
          rejectKotor: totalKotor,
          rejectSobek: totalSobek,
          rejectRusakJahit: totalRusakJahit,
          notes: notes || subBatch.notes,
        },
        include: { items: true },
      });

      return updatedSubBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Hasil finishing berhasil disimpan",
    });
  } catch (error) {
    console.error("Error updating finishing results:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update finishing results" },
      { status: 500 },
    );
  }
}
