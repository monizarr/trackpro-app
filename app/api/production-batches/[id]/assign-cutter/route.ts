import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id: batchId } = params;
    const body = await request.json();
    const { assignedToId, notes } = body;

    // Check if batch exists and is in correct status
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        product: {
          select: {
            name: true,
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

    if (batch.status !== "MATERIAL_ALLOCATED") {
      return NextResponse.json(
        {
          success: false,
          error: `Batch must be MATERIAL_ALLOCATED (current: ${batch.status})`,
        },
        { status: 400 }
      );
    }

    // Verify assigned user exists and has PEMOTONG role
    const cutter = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!cutter) {
      return NextResponse.json(
        {
          success: false,
          error: "Assigned user not found",
        },
        { status: 404 }
      );
    }

    if (cutter.role !== "PEMOTONG") {
      return NextResponse.json(
        {
          success: false,
          error: "Assigned user must have PEMOTONG role",
        },
        { status: 400 }
      );
    }

    // Create cutting task and update batch in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create cutting task
      const cuttingTask = await tx.cuttingTask.create({
        data: {
          batchId,
          assignedToId,
          materialReceived: 0, // Will be updated when materials are received
          status: "PENDING",
          notes: notes || "",
        },
        include: {
          batch: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
      });

      // Update batch status
      await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: "ASSIGNED_TO_CUTTER",
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId,
          event: "ASSIGNED_TO_CUTTER",
          details: `Batch di-assign ke ${cutter.name} untuk proses pemotongan oleh ${session.user.name}`,
        },
      });

      // Create notification for cutter
      await tx.notification.create({
        data: {
          userId: assignedToId,
          type: "BATCH_ASSIGNMENT",
          title: "Task Pemotongan Baru",
          message: `Anda mendapat task pemotongan untuk batch ${batch.batchSku} - ${batch.product.name}. Target: ${batch.targetQuantity} pcs`,
          isRead: false,
        },
      });

      return cuttingTask;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Batch berhasil di-assign ke pemotong",
    });
  } catch (error) {
    console.error("Error assigning to cutter:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign to cutter",
      },
      { status: 500 }
    );
  }
}
