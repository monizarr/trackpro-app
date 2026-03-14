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
    const finishingTaskId = url.searchParams.get("finishingTaskId"); // filter by finishing task

    const whereClause: {
      batchId: string;
      source?: "SEWING" | "FINISHING";
      finishingTaskId?: string;
    } = {
      batchId: id,
    };
    if (source === "SEWING" || source === "FINISHING") {
      whereClause.source = source;
    }
    if (finishingTaskId) {
      whereClause.finishingTaskId = finishingTaskId;
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
     *   finishingTaskId?: string,
     *   notes?: string
     * }
     */
    const { items, notes, finishingTaskId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items are required" },
        { status: 400 },
      );
    }

    // Get batch with finishing tasks (plural)
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        finishingTasks: true,
        sewingTask: true,
        subBatches: {
          include: { items: true },
        },
      },
    });

    // Find the specific finishing task to update
    const finishingTask = finishingTaskId
      ? batch?.finishingTasks.find((ft) => ft.id === finishingTaskId)
      : batch?.finishingTasks[0]; // fallback to first task for backward compatibility

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Production batch not found" },
        { status: 404 },
      );
    }
    // console.log("Batch found:", batch.batchSku, "Status:", batch.status);

    // Validate batch status - harus IN_FINISHING
    if (
      ![
        "IN_FINISHING",
        "FINISHING_COMPLETED",
        "IN_SEWING",
        "SEWING_COMPLETED",
      ].includes(batch.status)
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
          finishingTaskId: finishingTask?.id || null,
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
      if (finishingTask) {
        const currentCompleted = finishingTask.piecesCompleted;
        const currentRejectBS = finishingTask.rejectBS;
        const currentRejectBSPermanent = finishingTask.rejectBSPermanent;

        const newPiecesCompleted =
          currentCompleted +
          totalGoodOutput +
          totalRejectBS +
          totalRejectBSPermanent;

        await tx.finishingTask.update({
          where: { id: finishingTask.id },
          data: {
            completedAt: new Date(),
            piecesCompleted: newPiecesCompleted,
            rejectBS: currentRejectBS + totalRejectBS,
            rejectBSPermanent:
              currentRejectBSPermanent + totalRejectBSPermanent,
          },
        });

        // Check if this specific finishing task's sewing sub-batch is fully processed
        // Get the linked sewing sub-batch for this finishing task
        const linkedSewingSubBatch = finishingTask.subBatchId
          ? batch.subBatches.find((sb) => sb.id === finishingTask.subBatchId)
          : null;

        if (linkedSewingSubBatch) {
          // Calculate total sewing output from the linked sewing sub-batch
          let taskSewingOutput = 0;
          for (const item of linkedSewingSubBatch.items) {
            taskSewingOutput += item.goodQuantity || 0;
          }

          // Auto-complete this finishing task if all its sewing output is processed
          if (
            taskSewingOutput > 0 &&
            newPiecesCompleted >= taskSewingOutput &&
            finishingTask.status === "IN_PROGRESS"
          ) {
            await tx.finishingTask.update({
              where: { id: finishingTask.id },
              data: {
                status: "COMPLETED",
              },
            });

            // Create timeline entry for task auto-completion
            await tx.batchTimeline.create({
              data: {
                batchId: id,
                event: "FINISHING_COMPLETED",
                details: `Finishing task untuk sub-batch ${linkedSewingSubBatch.subBatchSku} otomatis selesai. Good: ${newPiecesCompleted - (currentRejectBS + totalRejectBS) - (currentRejectBSPermanent + totalRejectBSPermanent)}, BS: ${currentRejectBS + totalRejectBS}, BS Permanen: ${currentRejectBSPermanent + totalRejectBSPermanent}`,
              },
            });
          }
        }

        // Check if ALL finishing tasks for this batch are completed
        // If so, update batch status to FINISHING_COMPLETED
        const allFinishingTasks = await tx.finishingTask.findMany({
          where: { batchId: id },
        });
        const allCompleted = allFinishingTasks.every(
          (ft) => ft.status === "COMPLETED" || ft.status === "VERIFIED",
        );
        if (
          allCompleted &&
          allFinishingTasks.length > 0 &&
          batch.status === "IN_FINISHING"
        ) {
          await tx.productionBatch.update({
            where: { id },
            data: {
              status: "FINISHING_COMPLETED",
            },
          });

          await tx.batchTimeline.create({
            data: {
              batchId: id,
              event: "FINISHING_COMPLETED",
              details: `Semua finishing task selesai (${allFinishingTasks.length} task). Batch finishing selesai.`,
            },
          });
        }
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
