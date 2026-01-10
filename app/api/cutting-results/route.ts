import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST create or update cutting results
export async function POST(request: Request) {
  try {
    const session = await requireRole(["KEPALA_PRODUKSI", "PEMOTONG"]);
    const body = await request.json();
    const { batchId, results } = body;

    if (!batchId || !results || results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch ID and results are required",
        },
        { status: 400 }
      );
    }

    // Check if batch exists
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch not found",
        },
        { status: 404 }
      );
    }

    // Create cutting results
    // Auto-confirm if created by KEPALA_PRODUKSI
    const isKepalaProduks = session.user.role === "KEPALA_PRODUKSI";

    const cuttingResults = await Promise.all(
      results.map(async (result: any) => {
        return prisma.cuttingResult.create({
          data: {
            batchId,
            productSize: result.productSize,
            color: result.color,
            actualPieces: parseInt(result.actualPieces),
            isConfirmed: isKepalaProduks,
            confirmedById: isKepalaProduks ? session.user.id : null,
            confirmedAt: isKepalaProduks ? new Date() : null,
          },
          include: {
            confirmedBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        });
      })
    );

    // Calculate total actual pieces
    const totalActualPieces = results.reduce(
      (sum: number, r: any) => sum + parseInt(r.actualPieces),
      0
    );

    // Update batch actualQuantity
    await prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        actualQuantity: totalActualPieces,
      },
    });

    return NextResponse.json({
      success: true,
      data: cuttingResults,
      message: isKepalaProduks
        ? "Hasil pemotongan berhasil disimpan dan dikonfirmasi"
        : "Hasil pemotongan berhasil disimpan, menunggu konfirmasi kepala produksi",
    });
  } catch (error) {
    console.error("Error creating cutting results:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create cutting results",
      },
      { status: 500 }
    );
  }
}

// GET cutting results for a batch
export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI", "PEMOTONG"]);
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch ID is required",
        },
        { status: 400 }
      );
    }

    const results = await prisma.cuttingResult.findMany({
      where: { batchId },
      include: {
        confirmedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching cutting results:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cutting results",
      },
      { status: 500 }
    );
  }
}
