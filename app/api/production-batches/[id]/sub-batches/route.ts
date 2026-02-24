import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET - List sub-batches untuk batch tertentu (optional filter by source)
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
      "PENJAHIT",
    ]);
    const params = await context.params;
    const { id } = params;

    // Check for source filter in query params
    const url = new URL(request.url);
    const source = url.searchParams.get("source"); // "SEWING" or "FINISHING"

    const whereClause: { batchId: string; source?: "SEWING" | "FINISHING" } = {
      batchId: id,
    };
    if (source === "SEWING" || source === "FINISHING") {
      whereClause.source = source;
    }

    const subBatches = await prisma.subBatch.findMany({
      where: whereClause,
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
     *     { productSize: "M", color: "Putih", goodQuantity: 50, rejectBS: 2, rejectBSPermanent: 1 },
     *     { productSize: "L", color: "Putih", goodQuantity: 30, rejectBS: 0, rejectBSPermanent: 1 }
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
    if (
      !["IN_FINISHING", "FINISHING_COMPLETED", "IN_SEWING"].includes(
        batch.status,
      )
    ) {
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
        (item.rejectBS || 0) +
        (item.rejectBSPermanent || 0);

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
    let totalRejectBS = 0;
    let totalRejectBSPermanent = 0;

    for (const item of items) {
      totalGoodOutput += item.goodQuantity || 0;
      totalRejectBS += item.rejectBS || 0;
      totalRejectBSPermanent += item.rejectBSPermanent || 0;
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
          source: "FINISHING",
          finishingGoodOutput: totalGoodOutput,
          rejectBS: totalRejectBS,
          rejectBSPermanent: totalRejectBSPermanent,
          status: "CREATED",
          notes: notes || null,
          items: {
            create: items.map(
              (item: {
                productSize: string;
                color: string;
                goodQuantity?: number;
                rejectBS?: number;
                rejectBSPermanent?: number;
              }) => ({
                productSize: item.productSize,
                color: item.color,
                goodQuantity: item.goodQuantity || 0,
                rejectBS: item.rejectBS || 0,
                rejectBSPermanent: item.rejectBSPermanent || 0,
              }),
            ),
          },
          timeline: {
            create: {
              event: "SUB_BATCH_CREATED",
              details: `Sub-batch hasil finishing dibuat oleh ${session.user.name}. Good: ${totalGoodOutput}, BS: ${totalRejectBS}, BS Permanen: ${totalRejectBSPermanent}`,
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
        const currentRejectBS = batch.finishingTask.rejectBS;
        const currentRejectBSPermanent = batch.finishingTask.rejectBSPermanent;

        await tx.finishingTask.update({
          where: { id: batch.finishingTask.id },
          data: {
            completedAt: new Date(),
            piecesCompleted:
              currentCompleted +
              totalGoodOutput +
              totalRejectBS +
              totalRejectBSPermanent,
            rejectBS: currentRejectBS + totalRejectBS,
            rejectBSPermanent:
              currentRejectBSPermanent + totalRejectBSPermanent,
          },
        });
      }

      // Create timeline entry for main batch
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SUB_BATCH_CREATED",
          details: `Sub-batch ${subBatchSku} dibuat dari hasil finishing. Good: ${totalGoodOutput}, Reject: ${totalRejectBS + totalRejectBSPermanent}`,
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
