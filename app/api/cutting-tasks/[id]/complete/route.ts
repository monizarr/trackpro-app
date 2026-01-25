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
        { error: "Only PEMOTONG can complete cutting tasks" },
        { status: 403 },
      );
    }

    const taskId = params.id;
    const body = await request.json();
    const { cuttingResults, notes } = body;

    // Validate cutting results
    if (!cuttingResults || !Array.isArray(cuttingResults)) {
      return NextResponse.json(
        { error: "Cutting results are required" },
        { status: 400 },
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
        { status: 403 },
      );
    }

    if (task.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: `Cannot complete task with status ${task.status}` },
        { status: 400 },
      );
    }

    // Calculate total actual pieces
    const totalActualPieces = cuttingResults.reduce(
      (sum: number, r: any) => sum + (r.actualPieces || 0),
      0,
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

      // Update task to completed (no reject tracking at cutting - rejects tracked at finishing)
      const updated = await tx.cuttingTask.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          piecesCompleted: totalActualPieces,
          wasteQty: null,
          notes: notes || null,
          completedAt: new Date(),
        },
      });

      // Update batch status and actual quantity
      await tx.productionBatch.update({
        where: { id: task.batchId },
        data: {
          status: "CUTTING_COMPLETED",
          actualQuantity: totalActualPieces,
        },
      });

      // Create timeline entry
      await tx.batchTimeline.create({
        data: {
          batchId: task.batchId,
          event: "CUTTING_COMPLETED",
          details: `Pemotongan selesai oleh ${user.name}: ${totalActualPieces} pcs completed`,
        },
      });

      return updated;
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
          title: "Cutting Task Selesai",
          message: `Task pemotongan telah selesai dan menunggu verifikasi. Total pieces: ${totalActualPieces}`,
          isRead: false,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error completing cutting task:", error);
    return NextResponse.json(
      { error: "Failed to complete cutting task" },
      { status: 500 },
    );
  }
}
