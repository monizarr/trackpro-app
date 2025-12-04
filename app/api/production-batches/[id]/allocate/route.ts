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

    // Check if all materials have sufficient stock
    for (const allocation of batch.materialAllocations) {
      const currentStock = parseFloat(
        allocation.material.currentStock.toString()
      );
      const requestedQty = parseFloat(allocation.requestedQty.toString());

      if (currentStock < requestedQty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${allocation.material.name}. Available: ${currentStock}, Requested: ${requestedQty}`,
          },
          { status: 400 }
        );
      }
    }

    // Perform allocation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update all material allocations to ALLOCATED
      for (const allocation of batch.materialAllocations) {
        await tx.batchMaterialAllocation.update({
          where: { id: allocation.id },
          data: {
            status: "ALLOCATED",
            allocatedQty: allocation.requestedQty,
          },
        });

        // Create material OUT transaction
        await tx.materialTransaction.create({
          data: {
            materialId: allocation.materialId,
            type: "OUT",
            quantity: allocation.requestedQty,
            unit: allocation.material.unit,
            notes: `Alokasi untuk batch ${batch.batchSku}`,
            batchId: batch.id,
            userId: session.user.id,
          },
        });

        // Update material stock
        const newStock =
          parseFloat(allocation.material.currentStock.toString()) -
          parseFloat(allocation.requestedQty.toString());
        await tx.material.update({
          where: { id: allocation.materialId },
          data: {
            currentStock: newStock,
          },
        });
      }

      // Update batch status to MATERIAL_ALLOCATED
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: "MATERIAL_ALLOCATED",
          notes: notes || batch.notes,
        },
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

      // Create timeline event
      await tx.batchTimeline.create({
        data: {
          batchId,
          event: "MATERIAL_ALLOCATED",
          details: `Material allocated by ${session.user.name}`,
        },
      });

      // Create notification for production head
      await tx.notification.create({
        data: {
          userId: batch.createdById,
          type: "MATERIAL_REQUEST",
          title: "Material Allocated",
          message: `Material untuk batch ${batch.batchSku} telah dialokasikan`,
          link: `/production/batch/${batch.id}`,
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
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
