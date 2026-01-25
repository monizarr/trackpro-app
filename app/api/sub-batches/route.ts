import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { SubBatchStatus } from "@prisma/client";

// GET - List sub-batches with optional status filter
// Sub-batches are created at FINISHING stage for tracking partial delivery to warehouse
export async function GET(request: Request) {
  try {
    await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
      "FINISHING",
    ]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");

    // Build where clause with proper enum casting
    const where = status ? { status: status as SubBatchStatus } : {};

    const subBatches = await prisma.subBatch.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            batchSku: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        warehouseVerifiedBy: {
          select: { id: true, name: true, username: true },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: subBatches,
    });
  } catch (error) {
    console.error("Error fetching sub-batches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sub-batches" },
      { status: 500 },
    );
  }
}
