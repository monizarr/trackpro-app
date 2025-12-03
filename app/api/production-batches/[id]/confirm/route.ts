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
                currentStock: true,
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

    // Check material availability
    const insufficientMaterials = batch.materialAllocations.filter(
      (allocation) =>
        Number(allocation.material.currentStock) <
        Number(allocation.requestedQty)
    );

    if (insufficientMaterials.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient material stock",
          insufficientMaterials: insufficientMaterials.map((m) => ({
            material: m.material.name,
            needed: Number(m.requestedQty),
            available: Number(m.material.currentStock),
          })),
        },
        { status: 400 }
      );
    }

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
                  currentStock: true,
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

      // Deduct material stock
      await Promise.all(
        batch.materialAllocations.map((allocation) =>
          tx.material.update({
            where: { id: allocation.materialId },
            data: {
              currentStock: {
                decrement: allocation.requestedQty,
              },
            },
          })
        )
      );

      // Create material transactions
      await Promise.all(
        batch.materialAllocations.map((allocation) =>
          tx.materialTransaction.create({
            data: {
              materialId: allocation.materialId,
              batchId: id,
              type: "OUT",
              quantity: allocation.requestedQty,
              unit: allocation.material.unit,
              notes: `Alokasi untuk batch ${batch.batchSku}`,
              userId: session.user.id,
            },
          })
        )
      );

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
