import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET single production batch
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            role: true,
          },
        },
        materialAllocations: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
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
                    id: true,
                    code: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
        sizeColorRequests: {
          orderBy: {
            productSize: "asc",
          },
        },
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
        cuttingTask: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        sewingTask: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        finishingTask: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        timeline: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Production batch not found",
        },
        { status: 404 }
      );
    }

    // Convert Decimal to number for JSON serialization
    const serializedBatch = {
      ...batch,
      materialAllocations: batch.materialAllocations.map((allocation) => ({
        ...allocation,
        requestedQty: Number(allocation.requestedQty),
      })),
    };

    return NextResponse.json({
      success: true,
      data: serializedBatch,
    });
  } catch (error) {
    console.error("Error fetching production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch production batch",
      },
      { status: 500 }
    );
  }
}

// PATCH update production batch
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;
    const body = await request.json();
    const { targetQuantity, actualQuantity, rejectQuantity, status, notes } =
      body;

    const updateData: any = {};
    if (targetQuantity !== undefined)
      updateData.targetQuantity = parseInt(targetQuantity);
    if (actualQuantity !== undefined)
      updateData.actualQuantity = parseInt(actualQuantity);
    if (rejectQuantity !== undefined)
      updateData.rejectQuantity = parseInt(rejectQuantity);
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // If status is COMPLETED, set completedDate
    if (status === "COMPLETED") {
      updateData.completedDate = new Date();
    }

    const batch = await prisma.productionBatch.update({
      where: { id },
      data: updateData,
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
    console.error("Error updating production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update production batch",
      },
      { status: 500 }
    );
  }
}

// DELETE production batch
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER"]);
    const { id } = await params;

    // Check if batch exists and can be deleted
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Production batch not found",
        },
        { status: 404 }
      );
    }

    // Only allow deletion if batch is in PENDING or CANCELLED status
    if (!["PENDING", "CANCELLED"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete batch that is in progress or completed",
        },
        { status: 400 }
      );
    }

    await prisma.productionBatch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Production batch deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete production batch",
      },
      { status: 500 }
    );
  }
}
