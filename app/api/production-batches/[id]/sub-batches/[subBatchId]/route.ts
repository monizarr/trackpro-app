import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

type SessionUser = {
  user: {
    id: string;
    name: string;
    role: string;
  };
};

// GET - Get single sub-batch detail
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; subBatchId: string }> },
) {
  try {
    await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
      "FINISHING",
    ]);
    const params = await context.params;
    const { subBatchId } = params;

    const subBatch = await prisma.subBatch.findUnique({
      where: { id: subBatchId },
      include: {
        batch: {
          select: {
            id: true,
            batchSku: true,
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        warehouseVerifiedBy: {
          select: { id: true, name: true, username: true },
        },
        items: true,
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: subBatch,
    });
  } catch (error) {
    console.error("Error fetching sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sub-batch" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update sub-batch status
 *
 * Workflow baru (sub-batch di tahap finishing):
 * 1. CREATED -> SUBMITTED_TO_WAREHOUSE (Ka. Prod menyerahkan ke gudang)
 * 2. SUBMITTED_TO_WAREHOUSE -> WAREHOUSE_VERIFIED (Ka. Gudang verifikasi)
 * 3. WAREHOUSE_VERIFIED -> COMPLETED (otomatis setelah semua verified)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; subBatchId: string }> },
) {
  try {
    const session = await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
    ]);
    const params = await context.params;
    const { id, subBatchId } = params;
    const body = await request.json();
    const { action } = body;

    const subBatch = await prisma.subBatch.findUnique({
      where: { id: subBatchId, batchId: id },
      include: {
        batch: true,
        items: true,
      },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch not found" },
        { status: 404 },
      );
    }

    switch (action) {
      case "SUBMIT_TO_WAREHOUSE":
        return handleSubmitToWarehouse(subBatch, session);

      case "VERIFY_WAREHOUSE":
        return handleVerifyWarehouse(subBatch, session);

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error updating sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update sub-batch" },
      { status: 500 },
    );
  }
}

/**
 * Action: SUBMIT_TO_WAREHOUSE
 * Ka. Prod menyerahkan hasil finishing ke gudang
 */
async function handleSubmitToWarehouse(
  subBatch: {
    id: string;
    batchId: string;
    subBatchSku: string;
    status: string;
    finishingGoodOutput: number;
    rejectKotor: number;
    rejectSobek: number;
    rejectRusakJahit: number;
    batch: { id: string; batchSku: string; productId: string; status: string };
    items: Array<{
      id: string;
      productSize: string;
      color: string;
      goodQuantity: number;
      rejectKotor: number;
      rejectSobek: number;
      rejectRusakJahit: number;
    }>;
  },
  session: SessionUser,
) {
  if (subBatch.status !== "CREATED") {
    return NextResponse.json(
      {
        success: false,
        error: `Sub-batch harus dalam status CREATED untuk diserahkan ke gudang. Status saat ini: ${subBatch.status}`,
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "SUBMITTED_TO_WAREHOUSE",
        verifiedByProdAt: new Date(),
        submittedToWarehouseAt: new Date(),
        timeline: {
          create: {
            event: "SUBMITTED_TO_WAREHOUSE",
            details: `Diserahkan ke gudang oleh ${session.user.name}. Good: ${subBatch.finishingGoodOutput}, Kotor: ${subBatch.rejectKotor}, Sobek: ${subBatch.rejectSobek}, Rusak Jahit: ${subBatch.rejectRusakJahit}`,
          },
        },
      },
    });

    // Create timeline for main batch
    await tx.batchTimeline.create({
      data: {
        batchId: subBatch.batchId,
        event: "SUB_BATCH_SUBMITTED_TO_WAREHOUSE",
        details: `${subBatch.subBatchSku} diserahkan ke gudang oleh ${session.user.name}`,
      },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Sub-batch berhasil diserahkan ke gudang",
  });
}

/**
 * Action: VERIFY_WAREHOUSE
 * Ka. Gudang memverifikasi barang yang masuk
 * - Barang jadi (good) -> masuk FinishedGood sebagai FINISHED
 * - Barang kotor -> masuk FinishedGood sebagai REJECT dengan notes "KOTOR"
 * - Barang sobek/rusak jahit -> masuk Bad Stock
 */
async function handleVerifyWarehouse(
  subBatch: {
    id: string;
    batchId: string;
    subBatchSku: string;
    status: string;
    finishingGoodOutput: number;
    rejectKotor: number;
    rejectSobek: number;
    rejectRusakJahit: number;
    batch: { id: string; batchSku: string; productId: string; status: string };
    items: Array<{
      id: string;
      productSize: string;
      color: string;
      goodQuantity: number;
      rejectKotor: number;
      rejectSobek: number;
      rejectRusakJahit: number;
    }>;
  },
  session: SessionUser,
) {
  if (subBatch.status !== "SUBMITTED_TO_WAREHOUSE") {
    return NextResponse.json(
      { success: false, error: "Sub-batch belum diserahkan ke gudang" },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update sub-batch status
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "WAREHOUSE_VERIFIED",
        warehouseVerifiedById: session.user.id,
        warehouseVerifiedAt: new Date(),
        timeline: {
          create: {
            event: "WAREHOUSE_VERIFIED",
            details: `Diverifikasi oleh ${session.user.name}`,
          },
        },
      },
    });

    // Create FinishedGood entries for each item
    for (const item of subBatch.items) {
      // Good items -> FINISHED type
      if (item.goodQuantity > 0) {
        await tx.finishedGood.create({
          data: {
            batchId: subBatch.batchId,
            productId: subBatch.batch.productId,
            subBatchId: subBatch.id,
            type: "FINISHED",
            quantity: item.goodQuantity,
            location: "RAK_BARANG_JADI",
            notes: `Sub-batch ${subBatch.subBatchSku} - ${item.productSize} ${item.color}`,
            verifiedById: session.user.id,
          },
        });
      }

      // Kotor items -> REJECT type with notes (akan dicuci untuk re-produksi)
      if (item.rejectKotor > 0) {
        await tx.finishedGood.create({
          data: {
            batchId: subBatch.batchId,
            productId: subBatch.batch.productId,
            subBatchId: subBatch.id,
            type: "REJECT",
            quantity: item.rejectKotor,
            location: "AREA_CUCI",
            notes: `KOTOR - ${subBatch.subBatchSku} - ${item.productSize} ${item.color} - Perlu dicuci untuk re-produksi`,
            verifiedById: session.user.id,
          },
        });
      }

      // Sobek items -> REJECT type (Bad Stock)
      if (item.rejectSobek > 0) {
        await tx.finishedGood.create({
          data: {
            batchId: subBatch.batchId,
            productId: subBatch.batch.productId,
            subBatchId: subBatch.id,
            type: "REJECT",
            quantity: item.rejectSobek,
            location: "BAD_STOCK",
            notes: `SOBEK - ${subBatch.subBatchSku} - ${item.productSize} ${item.color} - Bad Stock`,
            verifiedById: session.user.id,
          },
        });
      }

      // Rusak jahit items -> REJECT type (Bad Stock)
      if (item.rejectRusakJahit > 0) {
        await tx.finishedGood.create({
          data: {
            batchId: subBatch.batchId,
            productId: subBatch.batch.productId,
            subBatchId: subBatch.id,
            type: "REJECT",
            quantity: item.rejectRusakJahit,
            location: "BAD_STOCK",
            notes: `RUSAK_JAHIT - ${subBatch.subBatchSku} - ${item.productSize} ${item.color} - Bad Stock`,
            verifiedById: session.user.id,
          },
        });
      }
    }

    // Create timeline for main batch
    await tx.batchTimeline.create({
      data: {
        batchId: subBatch.batchId,
        event: "SUB_BATCH_WAREHOUSE_VERIFIED",
        details: `${subBatch.subBatchSku} diverifikasi gudang oleh ${session.user.name}. Good: ${subBatch.finishingGoodOutput}, Reject: ${subBatch.rejectKotor + subBatch.rejectSobek + subBatch.rejectRusakJahit}`,
      },
    });

    // Check if all sub-batches are verified -> mark batch as WAREHOUSE_VERIFIED
    const allSubBatches = await tx.subBatch.findMany({
      where: { batchId: subBatch.batchId },
    });

    const allVerified = allSubBatches.every(
      (sb) =>
        sb.id === subBatch.id ||
        sb.status === "WAREHOUSE_VERIFIED" ||
        sb.status === "COMPLETED",
    );

    if (allVerified) {
      // Check if total output matches sewing output -> batch is complete
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "WAREHOUSE_VERIFIED" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "WAREHOUSE_VERIFIED",
          details: `Semua sub-batch telah diverifikasi gudang`,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Sub-batch berhasil diverifikasi gudang",
  });
}
