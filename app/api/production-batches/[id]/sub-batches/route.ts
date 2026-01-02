import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET - List sub-batches untuk batch tertentu
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI", "KEPALA_GUDANG"]);
    const params = await context.params;
    const { id } = params;

    const subBatches = await prisma.subBatch.findMany({
      where: { batchId: id },
      include: {
        assignedSewer: {
          select: { id: true, name: true, username: true },
        },
        assignedFinisher: {
          select: { id: true, name: true, username: true },
        },
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
      { status: 500 }
    );
  }
}

// POST - Create sub-batches (assign ke penjahit)
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    // Validate request body
    // Format: { assignments: [{ sewerId: string, items: [{ productSize, color, pieces }] }] }
    const { assignments } = body;

    if (
      !assignments ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Assignments are required" },
        { status: 400 }
      );
    }

    // Get batch with cutting results
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        cuttingResults: {
          where: { isConfirmed: true },
        },
        subBatches: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Production batch not found" },
        { status: 404 }
      );
    }

    // Validate batch status - harus CUTTING_VERIFIED
    if (batch.status !== "CUTTING_VERIFIED") {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus dalam status CUTTING_VERIFIED untuk di-assign ke penjahit. Status saat ini: ${batch.status}`,
        },
        { status: 400 }
      );
    }

    // Check if sub-batches already exist
    if (batch.subBatches.length > 0) {
      return NextResponse.json(
        { success: false, error: "Sub-batches sudah dibuat untuk batch ini" },
        { status: 400 }
      );
    }

    // Validate total pieces assigned matches cutting results
    const cuttingResultsMap = new Map<string, number>();
    for (const result of batch.cuttingResults) {
      const key = `${result.productSize}-${result.color}`;
      cuttingResultsMap.set(
        key,
        (cuttingResultsMap.get(key) || 0) + result.actualPieces
      );
    }

    const assignedPiecesMap = new Map<string, number>();
    for (const assignment of assignments) {
      for (const item of assignment.items) {
        const key = `${item.productSize}-${item.color}`;
        assignedPiecesMap.set(
          key,
          (assignedPiecesMap.get(key) || 0) + item.pieces
        );
      }
    }

    // Check if all cutting results are assigned
    for (const [key, cuttingPieces] of cuttingResultsMap) {
      const assignedPieces = assignedPiecesMap.get(key) || 0;
      if (assignedPieces !== cuttingPieces) {
        return NextResponse.json(
          {
            success: false,
            error: `Jumlah pieces untuk ${key} tidak sesuai. Hasil potong: ${cuttingPieces}, Di-assign: ${assignedPieces}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate sewers exist and have correct role
    const sewerIds = [
      ...new Set(assignments.map((a: { sewerId: string }) => a.sewerId)),
    ];
    const sewers = await prisma.user.findMany({
      where: {
        id: { in: sewerIds },
        role: "PENJAHIT",
        isActive: true,
      },
    });

    if (sewers.length !== sewerIds.length) {
      return NextResponse.json(
        { success: false, error: "Satu atau lebih penjahit tidak valid" },
        { status: 400 }
      );
    }

    // Create sub-batches in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdSubBatches = [];

      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        const subBatchNumber = String(i + 1).padStart(3, "0");
        const subBatchSku = `${batch.batchSku}-SUB-${subBatchNumber}`;

        // Calculate total pieces for this sub-batch
        const totalPieces = assignment.items.reduce(
          (sum: number, item: { pieces: number }) => sum + item.pieces,
          0
        );

        // Create sub-batch
        const subBatch = await tx.subBatch.create({
          data: {
            subBatchSku,
            batchId: id,
            assignedSewerId: assignment.sewerId,
            piecesAssigned: totalPieces,
            status: "ASSIGNED_TO_SEWER",
            notes: assignment.notes || null,
            items: {
              create: assignment.items.map(
                (item: {
                  productSize: string;
                  color: string;
                  pieces: number;
                }) => ({
                  productSize: item.productSize,
                  color: item.color,
                  piecesAssigned: item.pieces,
                })
              ),
            },
            timeline: {
              create: {
                event: "SUB_BATCH_CREATED",
                details: `Sub-batch dibuat dan ditugaskan ke penjahit oleh ${session.user.name}`,
              },
            },
          },
          include: {
            items: true,
            assignedSewer: {
              select: { id: true, name: true, username: true },
            },
          },
        });

        createdSubBatches.push(subBatch);
      }

      // Update batch status
      await tx.productionBatch.update({
        where: { id },
        data: {
          status: "ASSIGNED_TO_SEWER",
        },
      });

      // Create timeline entry for main batch
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "SUB_BATCHES_CREATED",
          details: `${createdSubBatches.length} sub-batch dibuat dan ditugaskan ke penjahit oleh ${session.user.name}`,
        },
      });

      return createdSubBatches;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.length} sub-batch berhasil dibuat`,
    });
  } catch (error) {
    console.error("Error creating sub-batches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create sub-batches" },
      { status: 500 }
    );
  }
}
