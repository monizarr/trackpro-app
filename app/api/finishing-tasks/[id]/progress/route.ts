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

    if (!user || user.role !== "FINISHING") {
      return NextResponse.json(
        { error: "Only FINISHING can update progress" },
        { status: 403 }
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { piecesCompleted, rejectPieces, notes } = body;

    // Check if task exists and belongs to this user
    const task = await prisma.finishingTask.findUnique({
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

    if (task.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Cannot update progress for task with status ${task.status}` },
        { status: 400 }
      );
    }

    // Update task progress (incremental)
    const updatedTask = await prisma.finishingTask.update({
      where: { id: taskId },
      data: {
        piecesCompleted: {
          increment: piecesCompleted || 0,
        },
        rejectPieces: {
          increment: rejectPieces || 0,
        },
        ...(notes && { notes }),
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating finishing task progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
