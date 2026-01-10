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
    const { cuttingResults, notes } = body;

    // Validate cutting results
    if (!cuttingResults || !Array.isArray(cuttingResults)) {
      return NextResponse.json(
        { error: "Cutting results are required" },
        { status: 400 }
      );
    }

    // Check if task exists and belongs to this user
    const task = await prisma.cuttingTask.findUnique({
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
        { status: 403 }
      );
    }

    if (task.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Cannot update progress for task with status ${task.status}` },
        { status: 400 }
      );
    }

    // Calculate total actual pieces
    const totalActualPieces = cuttingResults.reduce(
      (sum: number, r: any) => sum + (r.actualPieces || 0),
      0
    );

    // Update in transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Create or update cutting results
      for (const result of cuttingResults) {
        const { productSize, color, actualPieces } = result;

        // Check if result already exists
        const existingResult = await tx.cuttingResult.findFirst({
          where: {
            batchId: task.batchId,
            productSize,
            color,
          },
        });

        if (existingResult) {
          // Update existing
          await tx.cuttingResult.update({
            where: { id: existingResult.id },
            data: {
              actualPieces,
              isConfirmed: false,
            },
          });
        } else {
          // Create new
          await tx.cuttingResult.create({
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
      const updated = await tx.cuttingTask.update({
        where: { id: taskId },
        data: {
          piecesCompleted: totalActualPieces,
          rejectPieces: 0,
          wasteQty: null,
          notes: notes || null,
        },
      });

      return updated;
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
