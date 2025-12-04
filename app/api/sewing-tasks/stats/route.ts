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

    // Get active tasks (IN_PROGRESS)
    const activeTasks = await prisma.sewingTask.count({
      where: {
        assignedToId: user.id,
        status: "IN_PROGRESS",
      },
    });

    // Get completed tasks today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = await prisma.sewingTask.count({
      where: {
        assignedToId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: today,
        },
      },
    });

    // Get completed tasks yesterday for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const completedYesterday = await prisma.sewingTask.count({
      where: {
        assignedToId: user.id,
        status: "COMPLETED",
        completedAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // Calculate total progress (all tasks)
    const allTasks = await prisma.sewingTask.findMany({
      where: {
        assignedToId: user.id,
        status: {
          in: ["IN_PROGRESS", "COMPLETED", "VERIFIED"],
        },
      },
      select: {
        piecesReceived: true,
        piecesCompleted: true,
      },
    });

    const totalReceived = allTasks.reduce(
      (sum, task) => sum + task.piecesReceived,
      0
    );
    const totalCompleted = allTasks.reduce(
      (sum, task) => sum + task.piecesCompleted,
      0
    );
    const progressPercentage =
      totalReceived > 0
        ? Math.round((totalCompleted / totalReceived) * 100)
        : 0;

    return NextResponse.json({
      activeTasks,
      completedToday,
      completedYesterday,
      progressPercentage,
    });
  } catch (error) {
    console.error("Error fetching sewing task stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
