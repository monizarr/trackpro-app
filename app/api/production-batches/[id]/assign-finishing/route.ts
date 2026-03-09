import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { BatchStatus } from "@prisma/client";

// POST assign to finishing
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const body = await request.json();
    const { assignedToId, notes } = body;

    if (!assignedToId) {
      return NextResponse.json(
        {
          success: false,
          error: "assignedToId harus diisi",
        },
        { status: 400 },
      );
    }

    const batchId = params.id;

    // Check if batch exists and has correct status
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        product: true,
        sewingTask: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (
      batch.status !== "SEWING_VERIFIED" &&
      batch.status !== "ASSIGNED_TO_FINISHING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus berstatus SEWING_VERIFIED atau ASSIGNED_TO_FINISHING untuk di-assign ke finishing. Status saat ini: ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Check if finisher exists and has correct role
    const finisher = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!finisher) {
      return NextResponse.json(
        {
          success: false,
          error: "Kepala finishing tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (finisher.role !== "FINISHING") {
      return NextResponse.json(
        {
          success: false,
          error: "User yang dipilih bukan FINISHING",
        },
        { status: 400 },
      );
    }

    // Check if finishing tasks already exist (from sub-batch forwarding)
    const existingFinishingTasks = await prisma.finishingTask.findMany({
      where: { batchId: batchId },
    });

    // Execute assignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      let finishingTask;

      if (existingFinishingTasks.length > 0) {
        // Update all existing finishing tasks to the new finisher
        for (const ft of existingFinishingTasks) {
          await tx.finishingTask.update({
            where: { id: ft.id },
            data: {
              assignedToId,
              notes: notes || ft.notes,
            },
          });
        }
        finishingTask = existingFinishingTasks[0];
      } else {
        // Create new finishing task (legacy: without sub-batch link)
        finishingTask = await tx.finishingTask.create({
          data: {
            batchId,
            assignedToId,
            piecesReceived: batch.sewingTask?.piecesCompleted || 0,
            status: "PENDING",
            notes,
          },
        });
      }

      // Update batch status
      await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.ASSIGNED_TO_FINISHING,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId,
          event: "ASSIGNED_TO_FINISHING",
          details: `Batch ditugaskan ke ${finisher.name} oleh ${session.user.name}`,
        },
      });

      return finishingTask;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Batch berhasil di-assign ke ${finisher.name}`,
    });
  } catch (error) {
    console.error("Error assigning batch to finishing:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign batch to finishing",
      },
      { status: 500 },
    );
  }
}
