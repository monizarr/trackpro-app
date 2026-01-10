import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    const batchId = params.id;

    // Fetch cutting task for this batch
    const cuttingTask = await prisma.cuttingTask.findUnique({
      where: { batchId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!cuttingTask) {
      return NextResponse.json(
        {
          success: false,
          error: "Cutting task tidak ditemukan untuk batch ini",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cuttingTask,
    });
  } catch (error) {
    console.error("Error fetching cutting task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memuat cutting task",
      },
      { status: 500 }
    );
  }
}
