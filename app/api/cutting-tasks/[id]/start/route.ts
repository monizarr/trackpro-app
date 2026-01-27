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
  context: { params: Promise<{ id: string }> },
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
        { error: "Only PEMOTONG can start cutting tasks" },
        { status: 403 },
      );
    }

    const taskId = params.id;

    // Check if task exists and belongs to this user
    const task = await prisma.cuttingTask.findUnique({
      where: { id: taskId },
    });
    console.log("Found task:", task);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "Task not assigned to you" },
        { status: 403 },
      );
    }

    if (task.status !== "PENDING") {
      return NextResponse.json(
        { error: `Task already ${task.status}` },
        { status: 400 },
      );
    }

    // Update task status to IN_PROGRESS
    const updatedTask = await prisma.cuttingTask.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // Update batch status
    await prisma.productionBatch.update({
      where: { id: task.batchId },
      data: {
        status: "IN_CUTTING",
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error starting cutting task:", error);
    return NextResponse.json(
      { error: "Failed to start cutting task" },
      { status: 500 },
    );
  }
}
