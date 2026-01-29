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
  { params }: { params: Promise<{ id: string }> },
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
        { error: "Only PENJAHIT can update progress" },
        { status: 403 },
      );
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { sewingResults, notes } = body;

    // Validate sewing results
    if (!sewingResults || !Array.isArray(sewingResults)) {
      return NextResponse.json(
        { error: "Sewing results are required" },
        { status: 400 },
      );
    }
    // Check if task exists and belongs to this user
    const task = await prisma.sewingTask.findUnique({
      where: { id: taskId },
      include: {
        batch: {
          include: {
            sizeColorRequests: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "Task not assigned to you" },
        { status: 403 },
      );
    }

    if (task.batch.status !== "IN_SEWING") {
      return NextResponse.json(
        {
          error: `Cannot update progress for task with status ${task.batch.status}`,
        },
        { status: 400 },
      );
    }

    // Calculate total actual pieces
    const totalActualPieces = sewingResults.reduce(
      (sum: number, r: { actualPieces: number }) => sum + (r.actualPieces || 0),
      0,
    );

    // Update in transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Create or update sewing results
      for (const result of sewingResults) {
        const { productSize, color, actualPieces } = result;

        // Check if result already exists
        const existingResult = await tx.sewingResult.findFirst({
          where: {
            batchId: task.batchId,
            productSize,
            color,
          },
        });

        if (existingResult) {
          // Update existing
          await tx.sewingResult.update({
            where: { id: existingResult.id },
            data: {
              actualPieces,
              isConfirmed: false,
            },
          });
        } else {
          // Create new
          await tx.sewingResult.create({
            data: {
              batchId: task.batchId,
              productSize,
              color,
              actualPieces,
              isConfirmed: false,
            },
          });
        }
      }

      // Update task progress
      const updated = await tx.sewingTask.update({
        where: { id: taskId },
        data: {
          piecesCompleted: totalActualPieces,
          notes: notes || null,
        },
      });

      return updated;
    });

    // No timeline event for progress updates to avoid timeline noise
    // Progress is tracked through the task's piecesCompleted and rejectPieces fields
    console.log("Updated Sewing Task Progress:", {
      taskId,
      totalActualPieces,
      notes,
    });
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating sewing task progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 },
    );
  }
}
