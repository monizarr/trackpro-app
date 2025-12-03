import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { BatchStatus } from "@prisma/client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
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
        { status: 400 }
      );
    }

    const batchId = params.id;

    // Check if batch exists and has correct status
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        product: true,
        cuttingTask: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (batch.status !== "CUTTING_VERIFIED") {
      return NextResponse.json(
        {
          success: false,
          error: `Batch harus berstatus CUTTING_VERIFIED untuk di-assign ke penjahit. Status saat ini: ${batch.status}`,
        },
        { status: 400 }
      );
    }

    // Check if sewer exists and has correct role
    const sewer = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!sewer) {
      return NextResponse.json(
        {
          success: false,
          error: "Penjahit tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (sewer.role !== "PENJAHIT") {
      return NextResponse.json(
        {
          success: false,
          error: "User yang dipilih bukan PENJAHIT",
        },
        { status: 400 }
      );
    }

    // Execute assignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sewing task
      const sewingTask = await tx.sewingTask.create({
        data: {
          batchId,
          assignedToId,
          piecesReceived: batch.cuttingTask?.piecesCompleted || 0,
          status: "PENDING",
          notes,
        },
      });

      // Update batch status
      await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.ASSIGNED_TO_SEWER,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId,
          event: "ASSIGNED_TO_SEWER",
          details: `Batch di-assign ke penjahit ${sewer.name} oleh ${
            session.user.name
          }. Pieces received: ${batch.cuttingTask?.piecesCompleted || 0}`,
        },
      });

      // Send notification to sewer
      await tx.notification.create({
        data: {
          userId: assignedToId,
          type: "BATCH_ASSIGNMENT",
          title: "Task Penjahitan Baru",
          message: `Anda mendapat task penjahitan untuk batch ${
            batch.batchSku
          } - ${batch.product.name}. Pieces: ${
            batch.cuttingTask?.piecesCompleted || 0
          }`,
          isRead: false,
        },
      });

      return sewingTask;
    });

    return NextResponse.json({
      success: true,
      message: "Batch berhasil di-assign ke penjahit",
      data: result,
    });
  } catch (error) {
    console.error("Error assigning batch to sewer:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal assign batch ke penjahit",
      },
      { status: 500 }
    );
  }
}
