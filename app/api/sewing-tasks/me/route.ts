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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PENJAHIT") {
      return NextResponse.json(
        { error: "Only PENJAHIT can access this endpoint" },
        { status: 403 },
      );
    }

    // Get sewing tasks assigned to this user
    const tasks = await prisma.sewingTask.findMany({
      where: {
        assignedToId: user.id,
      },
      include: {
        batch: {
          select: {
            id: true,
            batchSku: true,
            status: true,
            targetQuantity: true,
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching sewing tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch sewing tasks" },
      { status: 500 },
    );
  }
}
