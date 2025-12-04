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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["OWNER", "KEPALA_PRODUKSI"].includes(user.role)) {
    return NextResponse.json(
      { error: "Only OWNER or KEPALA_PRODUKSI can access this endpoint" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Get sewing task for the batch
    const sewingTask = await prisma.sewingTask.findFirst({
      where: {
        batchId: id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!sewingTask) {
      return NextResponse.json(
        {
          success: false,
          error: "Sewing task not found for this batch",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sewingTask,
    });
  } catch (error) {
    console.error("Error fetching sewing task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sewing task",
      },
      { status: 500 }
    );
  }
}
