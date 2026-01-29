import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const taskId = params.id;
    const task = await prisma.finishingTask.findUnique({
      where: { id: taskId },
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
            materialColorAllocations: {
              include: {
                materialColorVariant: {},
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching cutting task:", error);
    return NextResponse.json(
      { error: "Failed to fetch cutting task" },
      { status: 500 },
    );
  }
}
