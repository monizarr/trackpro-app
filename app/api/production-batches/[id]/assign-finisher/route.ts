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

export async function POST(
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

    if (!user || !["OWNER", "KEPALA_PRODUKSI"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER or KEPALA_PRODUKSI can assign finishers" },
        { status: 403 }
      );
    }

    const { id: batchId } = await params;
    const body = await request.json();
    const { assignedToId, notes } = body;

    if (!assignedToId) {
      return NextResponse.json(
        { error: "assignedToId is required" },
        { status: 400 }
      );
    }

    // Verify batch exists and status is SEWING_VERIFIED
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        product: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "SEWING_VERIFIED") {
      return NextResponse.json(
        {
          error: `Cannot assign finisher to batch with status ${batch.status}. Status must be SEWING_VERIFIED.`,
        },
        { status: 400 }
      );
    }

    // Verify finisher exists and has FINISHING role
    const finisher = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!finisher || finisher.role !== "FINISHING") {
      return NextResponse.json({ error: "Invalid finisher" }, { status: 400 });
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create finishing task
      const finishingTask = await tx.finishingTask.create({
        data: {
          batchId,
          assignedToId,
          piecesReceived: batch.actualQuantity || batch.targetQuantity,
          notes: notes || null,
          status: "PENDING",
        },
      });

      // Update batch status
      await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: "IN_FINISHING",
        },
      });

      // Create timeline event
      await tx.batchTimeline.create({
        data: {
          batchId,
          event: "ASSIGNED_TO_FINISHING",
          details: `Batch di-assign ke finisher ${finisher.name}`,
        },
      });

      // Create notification for finisher
      await tx.notification.create({
        data: {
          userId: assignedToId,
          type: "BATCH_ASSIGNMENT",
          title: "Task Finishing Baru",
          message: `Anda mendapat task finishing untuk batch ${
            batch.batchSku
          } - ${batch.product.name}. Pieces: ${
            batch.actualQuantity || batch.targetQuantity
          } pcs`,
        },
      });

      return finishingTask;
    });

    return NextResponse.json({
      success: true,
      message: "Batch berhasil di-assign ke finisher",
      data: result,
    });
  } catch (error) {
    console.error("Error assigning batch to finisher:", error);
    return NextResponse.json(
      { error: "Failed to assign batch to finisher" },
      { status: 500 }
    );
  }
}
