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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "PENJAHIT") {
      return NextResponse.json(
        { error: "Only PENJAHIT can access this endpoint" },
        { status: 403 }
      );
    }

    // Get active sewing tasks (PENDING or IN_PROGRESS)
    const activeTasks = await prisma.sewingTask.findMany({
      where: {
        assignedToId: user.id,
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
      include: {
        batch: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return NextResponse.json(activeTasks);
  } catch (error) {
    console.error("Error fetching active sewing tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch active tasks" },
      { status: 500 }
    );
  }
}
