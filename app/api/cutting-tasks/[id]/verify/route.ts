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
    const { action, notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        },
        { status: 400 }
      );
    }

    const taskId = params.id;

    // Check if task exists and is completed
    const task = await prisma.cuttingTask.findUnique({
      where: { id: taskId },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: "Task tidak ditemukan",
        },
        { status: 404 }
      );
    }

    if (task.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: `Task harus berstatus COMPLETED untuk diverifikasi. Status saat ini: ${task.status}`,
        },
        { status: 400 }
      );
    }

    if (task.verifiedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Task sudah diverifikasi sebelumnya",
        },
        { status: 400 }
      );
    }

    // Execute verification in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update task status
      const newTaskStatus = action === "approve" ? "VERIFIED" : "REJECTED";
      const updatedTask = await tx.cuttingTask.update({
        where: { id: taskId },
        data: {
          status: newTaskStatus,
          verifiedAt: new Date(),
          verifiedById: session.user.id,
          notes: notes
            ? `${task.notes || ""}\n[Verifikasi] ${notes}`.trim()
            : task.notes,
        },
      });

      // Update batch status based on action
      const newBatchStatus: BatchStatus =
        action === "approve"
          ? BatchStatus.CUTTING_VERIFIED
          : BatchStatus.IN_CUTTING;

      await tx.productionBatch.update({
        where: { id: task.batchId },
        data: {
          status: newBatchStatus,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: task.batchId,
          event:
            action === "approve" ? "CUTTING_VERIFIED" : "CUTTING_COMPLETED",
          details:
            action === "approve"
              ? `Potongan diverifikasi oleh ${session.user.name}. Pieces completed: ${task.piecesCompleted}, Reject: ${task.rejectPieces}`
              : `Potongan ditolak oleh ${session.user.name}. Alasan: ${
                  notes || "Tidak ada catatan"
                }`,
        },
      });

      // Send notification to the cutter
      await tx.notification.create({
        data: {
          userId: task.assignedToId,
          type: action === "approve" ? "TASK_COMPLETED" : "VERIFICATION_NEEDED",
          title:
            action === "approve" ? "Potongan Disetujui" : "Potongan Ditolak",
          message:
            action === "approve"
              ? `Hasil pemotongan batch ${task.batch.batchSku} telah diverifikasi dan disetujui`
              : `Hasil pemotongan batch ${task.batch.batchSku} ditolak. ${
                  notes ? `Catatan: ${notes}` : "Silakan perbaiki."
                }`,
          isRead: false,
        },
      });

      return updatedTask;
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Potongan berhasil diverifikasi dan disetujui"
          : "Potongan ditolak, dikembalikan untuk perbaikan",
      data: result,
    });
  } catch (error) {
    console.error("Error verifying cutting task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memverifikasi task",
      },
      { status: 500 }
    );
  }
}
