import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    // Get cutting result
    const cuttingResult = await prisma.cuttingResult.findUnique({
      where: { id },
    });

    if (!cuttingResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Cutting result not found",
        },
        { status: 404 },
      );
    }

    if (cuttingResult.isConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error: "Cutting result already confirmed",
        },
        { status: 400 },
      );
    }

    // Confirm cutting result
    const updatedResult = await prisma.cuttingResult.update({
      where: { id },
      data: {
        isConfirmed: true,
        confirmedById: session.user.id,
        confirmedAt: new Date(),
      },
      include: {
        confirmedBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedResult,
      message: "Hasil pemotongan berhasil dikonfirmasi",
    });
  } catch (error) {
    console.error("Error confirming cutting result:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to confirm cutting result",
      },
      { status: 500 },
    );
  }
}
