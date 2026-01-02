import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// POST confirm production batch
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id } = params;

    // Get batch with material allocations
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        materialAllocations: {
          include: {
            material: {
              select: {
                name: true,
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
                  },
                },
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
          error: "Production batch not found",
        },
        { status: 404 }
      );
    }

    // Validate batch status
    if (!["PENDING", "MATERIAL_REQUESTED"].includes(batch.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch cannot be confirmed in current status",
        },
        { status: 400 }
      );
    }

    // Check material color variant availability (NEW SYSTEM)
    if (
      batch.materialColorAllocations &&
      batch.materialColorAllocations.length > 0
    ) {
      const insufficientColorVariants = batch.materialColorAllocations.filter(
        (allocation) =>
          Number(allocation.materialColorVariant.stock) <
          Number(allocation.allocatedQty)
      );

      if (insufficientColorVariants.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient material color variant stock",
            insufficientMaterials: insufficientColorVariants.map((m) => ({
              material: `${m.materialColorVariant.material.name} - ${m.materialColorVariant.colorName}`,
              needed: Number(m.allocatedQty),
              available: Number(m.materialColorVariant.stock),
            })),
          },
          { status: 400 }
        );
      }
    }
    // NOTE: No fallback to old system - must use material color variants

    // Update batch status and material allocations in transaction
    const updatedBatch = await prisma.$transaction(async (tx) => {
      // Update batch status
      const batch = await tx.productionBatch.update({
        where: { id },
        data: {
          status: "MATERIAL_ALLOCATED",
          startDate: new Date(),
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
                  material: true,
                },
              },
            },
          },
        },
      });

      // Update material allocations status and allocate quantity
      await Promise.all(
        batch.materialAllocations.map((allocation) =>
          tx.batchMaterialAllocation.update({
            where: { id: allocation.id },
            data: {
              status: "ALLOCATED",
              allocatedQty: allocation.requestedQty,
            },
          })
        )
      );

      // NOTE: Stock already deducted during batch creation for materialColorAllocations
      // Material transactions created during batch creation

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: id,
          event: "MATERIAL_ALLOCATED",
          details: `Batch dikonfirmasi dan material dialokasikan oleh ${session.user.name}`,
        },
      });

      return batch;
    });

    return NextResponse.json({
      success: true,
      data: updatedBatch,
      message: "Batch berhasil dikonfirmasi dan material dialokasikan",
    });
  } catch (error) {
    console.error("Error confirming production batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to confirm production batch",
      },
      { status: 500 }
    );
  }
}
