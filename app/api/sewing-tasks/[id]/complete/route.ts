import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Submit sewing task for verification
// Only marks as COMPLETED if all cutting output pieces have been sewn.
// If pieces remain, keeps IN_SEWING status (just saves any pending input via progress route first).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PENJAHIT") {
      return NextResponse.json(
        { success: false, error: "Only PENJAHIT can complete sewing tasks" },
        { status: 403 },
      );
    }

    const { id: taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Check if task exists and belongs to this user
    const task = await prisma.sewingTask.findUnique({
      where: { id: taskId },
      include: {
        batch: {
          include: {
            cuttingResults: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    if (task.assignedToId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Task not assigned to you" },
        { status: 403 },
      );
    }

    if (task.status !== "IN_PROGRESS" && task.status !== "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot complete task with status ${task.status}`,
        },
        { status: 400 },
      );
    }

    // Must have accumulated sewing results
    if (task.piecesCompleted <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Belum ada hasil jahitan yang diinput. Input hasil jahitan terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    // Allow partial completion - mark as completed even if not all pieces sewn
    // Remaining pieces can continue to be sewn later if needed
    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.sewingTask.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          notes: notes || task.notes,
          completedAt: new Date(),
        },
      });

      // Update batch status
      await tx.productionBatch.update({
        where: { id: task.batchId },
        data: {
          status: "SEWING_COMPLETED",
          actualQuantity: task.piecesCompleted,
        },
      });

      // Create timeline event
      await tx.batchTimeline.create({
        data: {
          batchId: task.batchId,
          event: "SEWING_COMPLETED",
          details: `Penjahitan selesai. Total: ${task.piecesCompleted} pcs${
            notes ? `. Catatan: ${notes}` : ""
          }`,
        },
      });

      // Notify production head
      const produksiUser = await tx.user.findFirst({
        where: { role: "KEPALA_PRODUKSI" },
      });

      if (produksiUser) {
        await tx.notification.create({
          data: {
            userId: produksiUser.id,
            type: "TASK_COMPLETED",
            title: "Sewing Task Selesai",
            message: `Task penjahitan telah selesai dan menunggu verifikasi. Total: ${task.piecesCompleted} pcs`,
            isRead: false,
          },
        });
      }

      return updatedTask;
    });

    return NextResponse.json({
      success: true,
      completed: true,
      data: result,
      message: `Penjahitan selesai dengan total ${task.piecesCompleted} pcs`,
    });
  } catch (error) {
    console.error("Error completing sewing task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete sewing task" },
      { status: 500 },
    );
  }
}
