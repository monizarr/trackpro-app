import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET batch with material allocation details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        materialAllocations: {
          include: {
            material: {
              select: {
                code: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
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

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch batch",
      },
      { status: 500 }
    );
  }
}

// POST allocate materials to batch
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const { id: batchId } = await params;
    const body = await request.json();
    const { notes } = body;

    // Get batch with material allocations
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        materialAllocations: {
          include: {
            material: true,
          },
        },
      },
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

    if (batch.status !== "MATERIAL_REQUESTED") {
      return NextResponse.json(
        {
          success: false,
          error: "Batch is not in MATERIAL_REQUESTED status",
        },
        { status: 400 }
      );
    }

    // NOTE: This endpoint is deprecated - material allocation happens during batch creation
    // Stock is managed via MaterialColorVariant table
    return NextResponse.json(
      {
        success: false,
        error:
          "This endpoint is deprecated. Material allocation happens during batch creation using color variants.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error allocating materials:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to allocate materials",
      },
      { status: 500 }
    );
  }
}
