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
        materialColorAllocations: {
          include: {
            materialColorVariant: {
              include: {
                material: {
                  select: {
                    name: true,
                    code: true,
                    unit: true,
                  },
                },
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
            rejectKotor: true,
            rejectSobek: true,
            rejectRusakJahit: true,
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
      materialColorAllocations: batch.materialColorAllocations.map(
        (allocation) => ({
          ...allocation,
          allocatedQty: Number(allocation.allocatedQty),
          meterPerRoll: Number(allocation.meterPerRoll),
          materialColorVariant: {
            ...allocation.materialColorVariant,
            stock: Number(allocation.materialColorVariant.stock),
            minimumStock: Number(allocation.materialColorVariant.minimumStock),
          },
        }),
      ),
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
      { status: 500 },
    );
  }
}

// POST create new production batch
export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    // Validate session has user ID
    if (!session?.user?.id) {
      console.error("Session missing user ID:", session);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session - user ID not found",
        },
        { status: 401 },
      );
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      console.error("User not found in database:", session.user.id);
      return NextResponse.json(
        { success: false, error: "User not found - please login again" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { productId, notes, materialColorAllocations, sizeColorRequests } =
      body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 },
      );
    }

    // Validate material color allocations
    if (!materialColorAllocations || materialColorAllocations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Material color allocations are required",
        },
        { status: 400 },
      );
    }

    // Validate stock availability based on allocatedQty from frontend
    for (const alloc of materialColorAllocations) {
      const variant = await prisma.materialColorVariant.findUnique({
        where: { id: alloc.materialColorVariantId },
      });

      if (!variant) {
        return NextResponse.json(
          {
            success: false,
            error: `Material color variant not found for allocation`,
          },
          { status: 400 },
        );
      }

      const requiredQty = alloc.allocatedQty || alloc.requestedQty;
      if (Number(variant.stock) < requiredQty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${alloc.color}. Required: ${requiredQty} ${variant.unit}, Available: ${variant.stock} ${variant.unit}`,
          },
          { status: 400 },
        );
      }

      // Check minimum stock
      if (Number(variant.stock) - requiredQty < Number(variant.minimumStock)) {
        return NextResponse.json(
          {
            success: false,
            error: `Allocation will cause ${alloc.color} to fall below minimum stock (${variant.minimumStock} ${variant.unit})`,
          },
          { status: 400 },
        );
      }
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
    const totalRolls = materialColorAllocations.reduce(
      (sum: number, allocation: any) => sum + (allocation.rollQuantity || 0),
      0,
    );

    console.log("Creating batch with createdById:", session.user.id);
    console.log("Session user:", session.user);

    // Create batch with material color allocations and size/color requests
    const batch = await prisma.productionBatch.create({
      data: {
        batchSku,
        productId,
        totalRolls,
        notes: notes || "",
        createdById: session.user.id,
        status: "MATERIAL_REQUESTED",
        // Create legacy material allocations for backward compatibility
        materialAllocations: {
          create: materialColorAllocations.map((allocation: any) => ({
            materialId: allocation.materialId,
            color: allocation.color,
            rollQuantity: parseInt(allocation.rollQuantity),
            requestedQty: parseFloat(
              allocation.allocatedQty || allocation.requestedQty,
            ),
            status: "REQUESTED",
          })),
        },
        // Create new material color allocations
        materialColorAllocations: {
          create: materialColorAllocations.map((allocation: any) => ({
            materialColorVariantId: allocation.materialColorVariantId,
            rollQuantity: parseInt(allocation.rollQuantity),
            allocatedQty: parseFloat(
              allocation.allocatedQty || allocation.requestedQty,
            ),
            meterPerRoll: parseFloat(allocation.meterPerRoll || 0),
            notes: `Allocated ${allocation.rollQuantity} rolls (${allocation.allocatedQty || allocation.requestedQty} unit) of ${allocation.color}`,
          })),
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
        materialColorAllocations: {
          include: {
            materialColorVariant: true,
          },
        },
      },
    });

    // NOTE: Stock is NOT deducted here - it will be deducted when batch is confirmed
    // This allows batch to be cancelled before confirmation without affecting stock

    return NextResponse.json({
      success: true,
      data: batch,
      message: `Batch ${batchSku} created successfully`,
    });
  } catch (error) {
    console.error("Error creating production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create production batch",
      },
      { status: 500 },
    );
  }
}
