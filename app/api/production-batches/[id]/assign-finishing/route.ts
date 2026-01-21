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

    if (!user || !["OWNER", "KEPALA_PRODUKSI"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER or KEPALA_PRODUKSI can assign to finishing" },
        { status: 403 },
      );
    }

    const { id: batchId } = await params;
    const body = await request.json();
    const { assignedToId, piecesReceived, notes } = body;

    // Check if batch exists and is SEWING_VERIFIED
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
          error: `Batch status must be SEWING_VERIFIED, currently ${batch.status}`,
        },
        { status: 400 },
      );
    }

    // Verify assignedTo user exists and has FINISHING role
    const finishingUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!finishingUser) {
      return NextResponse.json(
        { error: "Assigned user not found" },
        { status: 404 },
      );
    }

    if (finishingUser.role !== "FINISHING") {
      return NextResponse.json(
        { error: "Assigned user must have FINISHING role" },
        { status: 400 },
      );
    }

    // Create finishing task
    const finishingTask = await prisma.finishingTask.create({
      data: {
        batchId,
        assignedToId,
        piecesReceived,
        piecesCompleted: 0,
        rejectPieces: 0,
        status: "PENDING",
        notes,
      },
    });

    // Update batch status to IN_FINISHING
    await prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        status: "IN_FINISHING",
      },
    });

    // Create notification for finishing staff
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        type: "BATCH_ASSIGNMENT",
        title: "Finishing Task Baru",
        message: `Batch ${batch.batchSku} (${batch.product.name}) telah ditugaskan untuk finishing. Pieces: ${piecesReceived}`,
        isRead: false,
      },
    });

    return NextResponse.json(finishingTask, { status: 201 });
  } catch (error) {
    console.error("Error assigning to finishing:", error);
    return NextResponse.json(
      { error: "Failed to assign to finishing" },
      { status: 500 },
    );
  }
}
