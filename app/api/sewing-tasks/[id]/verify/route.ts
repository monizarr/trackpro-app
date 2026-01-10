import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission (OWNER or KEPALA_PRODUKSI)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["OWNER", "KEPALA_PRODUKSI"].includes(user.role)) {
    return NextResponse.json(
      { error: "Only OWNER or KEPALA_PRODUKSI can verify sewing tasks" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { action, notes } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  if (action === "reject" && !notes?.trim()) {
    return NextResponse.json(
      { error: "Notes are required when rejecting" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the sewing task
      const task = await tx.sewingTask.findUnique({
        where: { id },
        include: {
          batch: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!task) {
        throw new Error("Sewing task not found");
      }

      if (task.status !== "COMPLETED") {
        throw new Error("Task must be in COMPLETED status to be verified");
      }

      if (action === "approve") {
        // Approve: Update task to VERIFIED, batch to SEWING_VERIFIED
        const updatedTask = await tx.sewingTask.update({
          where: { id },
          data: {
            status: "VERIFIED",
            notes: notes || task.notes,
          },
        });

        await tx.productionBatch.update({
          where: { id: task.batchId },
          data: {
            status: "SEWING_VERIFIED",
            actualQuantity: task.piecesCompleted,
            rejectQuantity: task.rejectPieces,
          },
        });

        // Create timeline event
        await tx.batchTimeline.create({
          data: {
            batchId: task.batchId,
            event: "SEWING_VERIFIED",
            details: `Penjahitan diverifikasi dan disetujui oleh ${session.user.name}. Completed: ${task.piecesCompleted} pcs, Reject: ${task.rejectPieces} pcs`,
          },
        });

        // Notify sewer
        await tx.notification.create({
          data: {
            userId: task.assignedToId,
            type: "TASK_COMPLETED",
            title: "Penjahitan Diverifikasi",
            message: `Penjahitan batch ${task.batch.batchSku} telah diverifikasi dan disetujui`,
          },
        });

        return {
          success: true,
          message: "Penjahitan berhasil diverifikasi dan disetujui",
          data: updatedTask,
        };
      } else {
        // Reject: Update task back to IN_PROGRESS, batch back to IN_SEWING
        const updatedTask = await tx.sewingTask.update({
          where: { id },
          data: {
            status: "IN_PROGRESS",
            notes,
            completedAt: null, // Reset completion time so they can complete again
          },
        });

        await tx.productionBatch.update({
          where: { id: task.batchId },
          data: {
            status: "IN_SEWING",
          },
        });

        // Create timeline event
        await tx.batchTimeline.create({
          data: {
            batchId: task.batchId,
            event: "SEWING_STARTED",
            details: `Penjahitan ditolak oleh ${session.user.name}. Alasan: ${notes}`,
          },
        });

        // Notify sewer about rejection
        await tx.notification.create({
          data: {
            userId: task.assignedToId,
            type: "VERIFICATION_NEEDED",
            title: "Penjahitan Ditolak",
            message: `Penjahitan batch ${task.batch.batchSku} ditolak. Alasan: ${notes}`,
          },
        });

        return {
          success: true,
          message: "Penjahitan ditolak dan dikembalikan ke penjahit",
          data: updatedTask,
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying sewing task:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify sewing task",
      },
      { status: 500 }
    );
  }
}
