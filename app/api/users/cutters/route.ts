import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    const cutters = await prisma.user.findMany({
      where: {
        role: "PEMOTONG",
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            cuttingTasks: {
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
      data: cutters,
    });
  } catch (error) {
    console.error("Error fetching cutters:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cutters",
      },
      { status: 500 }
    );
  }
}
