import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    // Fetch all users with PENJAHIT role
    const sewers = await prisma.user.findMany({
      where: {
        role: "PENJAHIT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            sewingTasks: {
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
      data: sewers,
    });
  } catch (error) {
    console.error("Error fetching sewers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memuat daftar penjahit",
      },
      { status: 500 }
    );
  }
}
