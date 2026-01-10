import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const timeline = await prisma.batchTimeline.findMany({
      where: {
        batchId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error("Error fetching batch timeline:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch batch timeline",
      },
      { status: 500 }
    );
  }
}
