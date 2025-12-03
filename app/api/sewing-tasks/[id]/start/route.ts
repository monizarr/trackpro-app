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
  { params }: { params: { id: string } }
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
        { error: "Only PENJAHIT can start sewing tasks" },
        { status: 403 }
      );
    }

    const taskId = params.id;

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

    if (task.status !== "PENDING") {
      return NextResponse.json(
        { error: `Task already ${task.status}` },
        { status: 400 }
      );
    }

    // Update task status to IN_PROGRESS
    const updatedTask = await prisma.sewingTask.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // Note: Batch status already IN_SEWING from assignment

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error starting sewing task:", error);
    return NextResponse.json(
      { error: "Failed to start sewing task" },
      { status: 500 }
    );
  }
}
