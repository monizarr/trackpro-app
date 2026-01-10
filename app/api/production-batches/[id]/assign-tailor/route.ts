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

    if (!user || user.role !== "KEPALA_PRODUKSI") {
      return NextResponse.json(
        { error: "Only KEPALA_PRODUKSI can assign to tailor" },
        { status: 403 }
      );
    }

    const { id: batchId } = await params;
    const body = await request.json();
    const { assignedToId, piecesReceived, notes } = body;

    // Check if batch exists and is verified from cutting
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        cuttingTask: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "CUTTING_VERIFIED") {
      return NextResponse.json(
        { error: `Batch must be CUTTING_VERIFIED (current: ${batch.status})` },
        { status: 400 }
      );
    }

    // Check if tailor user exists
    const tailor = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!tailor || tailor.role !== "PENJAHIT") {
      return NextResponse.json(
        { error: "Invalid tailor user" },
        { status: 400 }
      );
    }

    // Create sewing task
    const sewingTask = await prisma.sewingTask.create({
      data: {
        batchId,
        assignedToId,
        piecesReceived,
        status: "PENDING",
        notes,
      },
    });

    // Update batch status
    await prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        status: "IN_SEWING",
      },
    });

    // Create notification for tailor
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        type: "BATCH_ASSIGNMENT",
        title: "Task Penjahitan Baru",
        message: `Anda mendapat task penjahitan untuk batch ${batch.batchSku}. Pieces: ${piecesReceived}`,
        isRead: false,
      },
    });

    return NextResponse.json(sewingTask);
  } catch (error) {
    console.error("Error assigning to tailor:", error);
    return NextResponse.json(
      { error: "Failed to assign to tailor" },
      { status: 500 }
    );
  }
}
