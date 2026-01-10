import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PENJAHIT") {
      return NextResponse.json(
        { error: "Only PENJAHIT can complete sewing tasks" },
        { status: 403 }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { piecesCompleted, rejectPieces, notes } = body;

    // Check if task exists and belongs to this user
    const task = await prisma.sewingTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "Task not assigned to you" },
        { status: 403 }
      );
    }

    if (task.status !== "IN_PROGRESS" && task.status !== "REJECTED") {
      return NextResponse.json(
        { error: `Cannot complete task with status ${task.status}` },
        { status: 400 }
      );
    }

    // Update task to completed
    const updatedTask = await prisma.sewingTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        piecesCompleted,
        rejectPieces,
        notes,
        completedAt: new Date(),
      },
    });

    // Update batch status
    await prisma.productionBatch.update({
      where: { id: task.batchId },
      data: {
        status: "SEWING_COMPLETED",
      },
    });

    // Create timeline event
    await prisma.batchTimeline.create({
      data: {
        batchId: task.batchId,
        event: "SEWING_COMPLETED",
        details: `Penjahitan selesai. Total: ${piecesCompleted} selesai, ${rejectPieces} reject${
          notes ? `. Catatan: ${notes}` : ""
        }`,
      },
    });

    // Get production head user for notification
    const produksiUser = await prisma.user.findFirst({
      where: { role: "KEPALA_PRODUKSI" },
    });

    if (produksiUser) {
      // Create notification for verification
      await prisma.notification.create({
        data: {
          userId: produksiUser.id,
          type: "TASK_COMPLETED",
          title: "Sewing Task Selesai",
          message: `Task penjahitan telah selesai dan menunggu verifikasi. Pieces: ${piecesCompleted}, Reject: ${rejectPieces}`,
          isRead: false,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error completing sewing task:", error);
    return NextResponse.json(
      { error: "Failed to complete sewing task" },
      { status: 500 }
    );
  }
}
