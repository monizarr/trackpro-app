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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PEMOTONG") {
      return NextResponse.json(
        { error: "Only PEMOTONG can update progress" },
        { status: 403 }
      );
    }

    const taskId = params.id;
    const body = await request.json();
    const { piecesCompleted, rejectPieces, wasteQty, notes } = body;

    // Check if task exists and belongs to this user
    const task = await prisma.cuttingTask.findUnique({
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

    // Update task progress
    const updatedTask = await prisma.cuttingTask.update({
      where: { id: taskId },
      data: {
        ...(piecesCompleted !== undefined && { piecesCompleted }),
        ...(rejectPieces !== undefined && { rejectPieces }),
        ...(wasteQty !== undefined && { wasteQty }),
        ...(notes && { notes }),
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating cutting task progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
