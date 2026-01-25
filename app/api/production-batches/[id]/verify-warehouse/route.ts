import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// POST - Verify warehouse untuk batch (DEPRECATED untuk direct flow, gunakan sub-batch)
// Proses warehouse verification wajib melalui sub-batch
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { id: batchId } = await params;

    // Check if batch has sub-batches
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        subBatches: {
          select: {
            id: true,
            subBatchSku: true,
            status: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch tidak ditemukan" },
        { status: 404 },
      );
    }

    // If batch has sub-batches, force verification through sub-batch flow
    if (batch.subBatches.length > 0) {
      const unverifiedSubBatches = batch.subBatches.filter(
        (sb) => sb.status !== "WAREHOUSE_VERIFIED" && sb.status !== "COMPLETED",
      );

      if (unverifiedSubBatches.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Proses verifikasi gudang harus dilakukan per sub-batch. Silakan verifikasi setiap sub-batch yang sudah selesai finishing.",
            unverifiedSubBatches: unverifiedSubBatches.map((sb) => ({
              sku: sb.subBatchSku,
              status: sb.status,
            })),
            hint: "Gunakan endpoint POST /api/sub-batches/[id]/verify-warehouse untuk verifikasi sub-batch",
          },
          { status: 400 },
        );
      }

      // All sub-batches are verified, just return success
      return NextResponse.json({
        success: true,
        message:
          "Semua sub-batch sudah diverifikasi gudang. Batch siap untuk diselesaikan.",
        data: { batchId, status: batch.status },
      });
    }

    // If no sub-batches, the batch should go through sub-batch flow first
    return NextResponse.json(
      {
        success: false,
        error:
          "Proses produksi wajib melalui sub-batch. Batch ini belum memiliki sub-batch.",
        hint: "Setelah cutting verified, buat sub-batch dan assign ke penjahit melalui POST /api/production-batches/[id]/sub-batches",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error verifying warehouse:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memverifikasi warehouse" },
      { status: 500 },
    );
  }
}
