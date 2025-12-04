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

    // Get user info to check access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !["OWNER", "KEPALA_PRODUKSI"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER or KEPALA_PRODUKSI can access this" },
        { status: 403 }
      );
    }

    // Get all finishers with their active task count
    const finishers = await prisma.user.findMany({
      where: {
        role: "FINISHING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            finishingTasks: {
              where: {
                status: {
                  in: ["PENDING", "IN_PROGRESS"],
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: finishers,
    });
  } catch (error) {
    console.error("Error fetching finishers:", error);
    return NextResponse.json(
      { error: "Failed to fetch finishers" },
      { status: 500 }
    );
  }
}
