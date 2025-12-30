import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET all production batches (with filters)
export async function GET(request: Request) {
  try {
    const session = await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
    ]);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const batches = await prisma.productionBatch.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        materialAllocations: {
          include: {
            material: {
              select: {
                name: true,
                code: true,
                color: true,
                unit: true,
              },
            },
          },
        },
        sizeColorRequests: true,
        cuttingResults: {
          include: {
            confirmedBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
        finishingTask: {
          select: {
            piecesCompleted: true,
            rejectPieces: true,
            notes: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal fields to number for JSON serialization
    const serializedBatches = batches.map((batch) => ({
      ...batch,
      totalRolls: Number(batch.totalRolls),
      actualQuantity: batch.actualQuantity
        ? Number(batch.actualQuantity)
        : null,
      rejectQuantity: Number(batch.rejectQuantity),
      materialAllocations: batch.materialAllocations.map((allocation) => ({
        ...allocation,
        requestedQty: Number(allocation.requestedQty),
        allocatedQty: allocation.allocatedQty
          ? Number(allocation.allocatedQty)
          : null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: serializedBatches,
    });
  } catch (error) {
    console.error("Error fetching production batches:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch production batches",
      },
      { status: 500 }
    );
  }
}

// POST create new production batch
export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const body = await request.json();
    const { productId, notes, materialAllocations, sizeColorRequests } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Generate unique batch SKU
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.productionBatch.count({
      where: {
        batchSku: {
          startsWith: `PROD-${dateStr}`,
        },
      },
    });
    const batchSku = `PROD-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    // Hitung total rolls dari material allocations
    const totalRolls =
      materialAllocations?.reduce(
        (sum: number, allocation: any) => sum + (allocation.rollQuantity || 0),
        0
      ) || 0;

    // Create batch with material allocations and size/color requests
    const batch = await prisma.productionBatch.create({
      data: {
        batchSku,
        productId,
        totalRolls,
        notes: notes || "",
        createdById: session.user.id,
        status:
          materialAllocations?.length > 0 ? "MATERIAL_REQUESTED" : "PENDING",
        materialAllocations: {
          create:
            materialAllocations?.map((allocation: any) => ({
              materialId: allocation.materialId,
              color: allocation.color,
              rollQuantity: parseInt(allocation.rollQuantity),
              requestedQty: parseFloat(allocation.requestedQty),
              status: "REQUESTED",
            })) || [],
        },
        sizeColorRequests: {
          create:
            sizeColorRequests?.map((request: any) => ({
              productSize: request.productSize,
              color: request.color,
              requestedPieces: parseInt(request.requestedPieces),
            })) || [],
        },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        materialAllocations: {
          include: {
            material: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error("Error creating production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create production batch",
      },
      { status: 500 }
    );
  }
}
