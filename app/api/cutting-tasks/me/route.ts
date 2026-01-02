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

    if (!user || user.role !== "PEMOTONG") {
      return NextResponse.json(
        { error: "Only PEMOTONG can access this endpoint" },
        { status: 403 }
      );
    }

    // Get cutting tasks assigned to this user
    const tasks = await prisma.cuttingTask.findMany({
      where: {
        assignedToId: user.id,
      },
      include: {
        batch: {
          include: {
            product: true,
            sizeColorRequests: {
              orderBy: {
                productSize: "asc",
              },
            },
            cuttingResults: {
              orderBy: {
                productSize: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching cutting tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch cutting tasks" },
      { status: 500 }
    );
  }
}
