import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET - List sub-batches untuk batch tertentu
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
      "FINISHING",
    ]);
    const params = await context.params;
    const { id } = params;

    const subBatches = await prisma.subBatch.findMany({
      where: { batchId: id },
      include: {
        warehouseVerifiedBy: {
          select: { id: true, name: true, username: true },
        },
        items: true,
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: subBatches,
    });
  } catch (error) {
    console.error("Error fetching sub-batches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sub-batches" },
      { status: 500 },
    );
  }
}

// POST - Create sub-batch dari hasil finishing (untuk partial delivery ke gudang)
// Sub-batch dibuat di tahap FINISHING setelah Ka. Finishing input hasil
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "FINISHING",
    ]);
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    /**
     * Request body format:
     * {
     *   items: [
     *     { productSize: "M", color: "Putih", goodQuantity: 50, rejectKotor: 2, rejectSobek: 1, rejectRusakJahit: 0 },
     *     { productSize: "L", color: "Putih", goodQuantity: 30, rejectKotor: 0, rejectSobek: 0, rejectRusakJahit: 1 }
     *   ],
     *   notes?: string
     * }
     */
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items are required" },
        { status: 400 },
      );
    }

    // Get batch with finishing task
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        finishingTask: true,
        sewingTask: true,
        subBatches: {
          include: { items: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Production batch not found" },
        { status: 404 },
      );
    }

    // Validate batch status - harus IN_FINISHING
    if (!["IN_FINISHING", "FINISHING_COMPLETED"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus dalam status IN_FINISHING untuk membuat sub-batch. Status saat ini: ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productSize || !item.color) {
        return NextResponse.json(
          {
            success: false,
            error: "Setiap item harus memiliki productSize dan color",
          },
          { status: 400 },
        );
      }

      const totalPieces =
        (item.goodQuantity || 0) +
        (item.rejectKotor || 0) +
        (item.rejectSobek || 0) +
        (item.rejectRusakJahit || 0);

      if (totalPieces <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Item ${item.productSize} ${item.color} harus memiliki quantity > 0`,
          },
          { status: 400 },
        );
      }
    }

    // Calculate totals from items
    let totalGoodOutput = 0;
    let totalRejectKotor = 0;
    let totalRejectSobek = 0;
    let totalRejectRusakJahit = 0;

    for (const item of items) {
      totalGoodOutput += item.goodQuantity || 0;
      totalRejectKotor += item.rejectKotor || 0;
      totalRejectSobek += item.rejectSobek || 0;
      totalRejectRusakJahit += item.rejectRusakJahit || 0;
    }

    // Create sub-batch in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get next sub-batch number
      const existingCount = batch.subBatches.length;
      const subBatchNumber = String(existingCount + 1).padStart(3, "0");
      const subBatchSku = `${batch.batchSku}-SUB-${subBatchNumber}`;

      // Create sub-batch
      const subBatch = await tx.subBatch.create({
        data: {
          subBatchSku,
          batchId: id,
          finishingGoodOutput: totalGoodOutput,
          rejectKotor: totalRejectKotor,
          rejectSobek: totalRejectSobek,
          rejectRusakJahit: totalRejectRusakJahit,
          status: "CREATED",
          notes: notes || null,
          items: {
            create: items.map(
              (item: {
                productSize: string;
                color: string;
                goodQuantity?: number;
                rejectKotor?: number;
                rejectSobek?: number;
                rejectRusakJahit?: number;
              }) => ({
                productSize: item.productSize,
                color: item.color,
                goodQuantity: item.goodQuantity || 0,
                rejectKotor: item.rejectKotor || 0,
                rejectSobek: item.rejectSobek || 0,
                rejectRusakJahit: item.rejectRusakJahit || 0,
              }),
            ),
          },
          timeline: {
            create: {
              event: "SUB_BATCH_CREATED",
              details: `Sub-batch hasil finishing dibuat oleh ${session.user.name}. Good: ${totalGoodOutput}, Kotor: ${totalRejectKotor}, Sobek: ${totalRejectSobek}, Rusak Jahit: ${totalRejectRusakJahit}`,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Update finishing task totals
      if (batch.finishingTask) {
        const currentCompleted = batch.finishingTask.piecesCompleted;
        const currentRejectKotor = batch.finishingTask.rejectKotor;
        const currentRejectSobek = batch.finishingTask.rejectSobek;
        const currentRejectRusakJahit = batch.finishingTask.rejectRusakJahit;

        await tx.finishingTask.update({
          where: { id: batch.finishingTask.id },
          data: {
            completedAt: new Date(),
            piecesCompleted:
              currentCompleted +
              totalGoodOutput +
              totalRejectKotor +
              totalRejectSobek +
              totalRejectRusakJahit,
            rejectKotor: currentRejectKotor + totalRejectKotor,
            rejectSobek: currentRejectSobek + totalRejectSobek,
            rejectRusakJahit: currentRejectRusakJahit + totalRejectRusakJahit,
          },
        });
      }

      // Create timeline entry for main batch
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SUB_BATCH_CREATED",
          details: `Sub-batch ${subBatchSku} dibuat dari hasil finishing. Good: ${totalGoodOutput}, Reject: ${totalRejectKotor + totalRejectSobek + totalRejectRusakJahit}`,
        },
      });

      return subBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sub-batch ${result.subBatchSku} berhasil dibuat`,
    });
  } catch (error) {
    console.error("Error creating sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create sub-batch" },
      { status: 500 },
    );
  }
}
