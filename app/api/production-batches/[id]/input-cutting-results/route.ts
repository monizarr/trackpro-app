import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST input cutting results by Kepala Produksi
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const { cuttingResults, notes } = body;

    // Validate input
    if (!cuttingResults || !Array.isArray(cuttingResults)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cutting results are required",
        },
        { status: 400 },
      );
    }

    // Get batch
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: true,
        sizeColorRequests: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Production batch not found",
        },
        { status: 404 },
      );
    }

    // Validate batch status
    if (!["ASSIGNED_TO_CUTTER", "IN_CUTTING"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot input cutting results for batch with status ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Calculate totals
    const totalActualPieces = cuttingResults.reduce(
      (sum: number, r: any) => sum + (r.actualPieces || 0),
      0,
    );

    // Update batch in transaction
    const updatedBatch = await prisma.$transaction(async (tx) => {
      // Check if cutting task exists
      let cuttingTask = await tx.cuttingTask.findFirst({
        where: { batchId: id },
      });

      if (cuttingTask) {
        // Update existing cutting task
        cuttingTask = await tx.cuttingTask.update({
          where: { id: cuttingTask.id },
          data: {
            piecesCompleted: totalActualPieces,
            wasteQty: null,
            notes: notes || null,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      } else {
        // This shouldn't happen normally, but create task if not exists
        // Get first cutter for assignment (or use session user if they are cutter)
        const firstCutter = await tx.user.findFirst({
          where: { role: "PEMOTONG" },
        });

        if (!firstCutter) {
          throw new Error("No cutter found in system");
        }

        cuttingTask = await tx.cuttingTask.create({
          data: {
            batchId: id,
            assignedToId: firstCutter.id,
            materialReceived: 0, // Will be updated separately
            piecesCompleted: totalActualPieces,
            wasteQty: null,
            notes: notes || null,
            status: "COMPLETED",
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
      }

      // Create or update cutting results
      for (const result of cuttingResults) {
        const { productSize, color, actualPieces } = result;

        // Check if result already exists
        const existingResult = await tx.cuttingResult.findFirst({
          where: {
            batchId: id,
            productSize,
            color,
          },
        });

        if (existingResult) {
          // Update existing
          await tx.cuttingResult.update({
            where: { id: existingResult.id },
            data: {
              actualPieces,
              isConfirmed: false, // Reset confirmation
            },
          });
        } else {
          // Create new
          await tx.cuttingResult.create({
            data: {
              batchId: id,
              productSize,
              color,
              actualPieces,
              isConfirmed: false,
            },
          });
        }
      }

      // Update batch status and actual quantity
      const updatedBatch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "CUTTING_COMPLETED",
          actualQuantity: totalActualPieces,
          rejectQuantity: 0,
        },
        include: {
          product: true,
          cuttingResults: true,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "CUTTING_COMPLETED",
          details: `Hasil potongan diinput oleh ${session.user.name}: ${totalActualPieces} pcs completed`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: updatedBatch,
      message: "Hasil potongan berhasil disimpan",
    });
  } catch (error) {
    console.error("Error inputting cutting results:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to input cutting results",
      },
      { status: 500 },
    );
  }
}
