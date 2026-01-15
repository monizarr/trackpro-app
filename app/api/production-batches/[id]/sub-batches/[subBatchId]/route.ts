import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

// Types
type SubBatchWithRelations = Prisma.SubBatchGetPayload<{
  include: {
    batch: true;
    items: true;
    assignedSewer: { select: { name: true } };
    assignedFinisher: { select: { name: true } };
  };
}>;

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
  context: { params: Promise<{ id: string; subBatchId: string }> }
) {
  try {
    await requireRole([
      "OWNER",
      "KEPALA_PRODUKSI",
      "KEPALA_GUDANG",
      "PENJAHIT",
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
        assignedSewer: {
          select: { id: true, name: true, username: true },
        },
        assignedFinisher: {
          select: { id: true, name: true, username: true },
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
        { status: 404 }
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
      { status: 500 }
    );
  }
}

// PATCH - Update sub-batch (input hasil, update status)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; subBatchId: string }> }
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
        assignedSewer: { select: { name: true } },
        assignedFinisher: { select: { name: true } },
      },
    });

    if (!subBatch) {
      return NextResponse.json(
        { success: false, error: "Sub-batch not found" },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case "START_SEWING":
        result = await handleStartSewing(subBatch);
        break;

      case "INPUT_SEWING_RESULT":
        result = await handleInputSewingResult(subBatch, body);
        break;

      case "CONFIRM_SEWING":
        result = await handleConfirmSewing(subBatch, session);
        break;

      case "ASSIGN_FINISHING":
        result = await handleAssignFinishing(subBatch, body, session);
        break;

      case "START_FINISHING":
        result = await handleStartFinishing(subBatch);
        break;

      case "INPUT_FINISHING_RESULT":
        result = await handleInputFinishingResult(subBatch, body);
        break;

      case "CONFIRM_FINISHING":
        result = await handleConfirmFinishing(subBatch, session);
        break;

      case "SUBMIT_TO_WAREHOUSE":
        result = await handleSubmitToWarehouse(subBatch, session);
        break;

      case "VERIFY_WAREHOUSE":
        result = await handleVerifyWarehouse(subBatch, session);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return result;
  } catch (error) {
    console.error("Error updating sub-batch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update sub-batch" },
      { status: 500 }
    );
  }
}

// Helper functions for each action
async function handleStartSewing(subBatch: SubBatchWithRelations) {
  if (subBatch.status !== "ASSIGNED_TO_SEWER") {
    return NextResponse.json(
      {
        success: false,
        error: "Sub-batch tidak dalam status yang tepat untuk memulai jahitan",
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "IN_SEWING",
        sewingStartedAt: new Date(),
        timeline: {
          create: {
            event: "SEWING_STARTED",
            details: `Penjahit ${subBatch.assignedSewer.name} memulai jahitan`,
          },
        },
      },
    });

    // Update batch status to IN_SEWING if not already
    if (subBatch.batch.status === "ASSIGNED_TO_SEWER") {
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "IN_SEWING" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "SEWING_STARTED",
          details: "Proses penjahitan dimulai",
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Jahitan dimulai",
  });
}

async function handleInputSewingResult(
  subBatch: SubBatchWithRelations,
  body: Record<string, unknown>
) {
  if (!["IN_SEWING", "ASSIGNED_TO_SEWER"].includes(subBatch.status)) {
    return NextResponse.json(
      { success: false, error: "Sub-batch tidak dalam status jahitan" },
      { status: 400 }
    );
  }

  const { items, sewingReject } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json(
      { success: false, error: "Data hasil jahitan diperlukan" },
      { status: 400 }
    );
  }

  // Calculate total sewing output
  const totalSewingOutput = items.reduce(
    (sum: number, item: { sewingOutput: number }) => sum + item.sewingOutput,
    0
  );

  const result = await prisma.$transaction(async (tx) => {
    // Update each item
    for (const item of items) {
      await tx.subBatchItem.update({
        where: { id: item.id },
        data: { sewingOutput: item.sewingOutput },
      });
    }

    // Update sub-batch totals
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "IN_SEWING",
        sewingStartedAt: subBatch.sewingStartedAt || new Date(),
        sewingOutput: totalSewingOutput,
        sewingReject: sewingReject || 0,
        timeline: {
          create: {
            event: "SEWING_RESULT_INPUT",
            details: `Hasil jahitan diinput: ${totalSewingOutput} pcs (reject: ${
              sewingReject || 0
            })`,
          },
        },
      },
      include: { items: true },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Hasil jahitan berhasil disimpan",
  });
}

async function handleConfirmSewing(
  subBatch: SubBatchWithRelations,
  session: SessionUser
) {
  if (subBatch.status !== "IN_SEWING") {
    return NextResponse.json(
      { success: false, error: "Sub-batch tidak dalam status jahitan" },
      { status: 400 }
    );
  }

  if (subBatch.sewingOutput === 0) {
    return NextResponse.json(
      { success: false, error: "Hasil jahitan belum diinput" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "SEWING_COMPLETED",
        sewingCompletedAt: new Date(),
        sewingConfirmedAt: new Date(),
        timeline: {
          create: {
            event: "SEWING_CONFIRMED",
            details: `Hasil jahitan dikonfirmasi oleh ${session.user.name}. Total: ${subBatch.sewingOutput} pcs`,
          },
        },
      },
    });

    // Check if all sub-batches have completed sewing
    const allSubBatches = await tx.subBatch.findMany({
      where: { batchId: subBatch.batchId },
    });

    const allSewingCompleted = allSubBatches.every(
      (sb) =>
        sb.id === subBatch.id ||
        [
          "SEWING_COMPLETED",
          "ASSIGNED_TO_FINISHING",
          "IN_FINISHING",
          "FINISHING_COMPLETED",
          "SUBMITTED_TO_WAREHOUSE",
          "WAREHOUSE_VERIFIED",
          "COMPLETED",
        ].includes(sb.status)
    );

    // Update batch status if all sub-batches have completed sewing
    if (
      allSewingCompleted &&
      ["IN_SEWING", "ASSIGNED_TO_SEWER"].includes(subBatch.batch.status)
    ) {
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "SEWING_COMPLETED" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "SEWING_COMPLETED",
          details: `Semua sub-batch telah selesai dijahit. Dikonfirmasi oleh ${session.user.name}`,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Hasil jahitan dikonfirmasi",
  });
}

async function handleAssignFinishing(
  subBatch: SubBatchWithRelations,
  body: Record<string, unknown>,
  session: SessionUser
) {
  if (subBatch.status !== "SEWING_COMPLETED") {
    return NextResponse.json(
      {
        success: false,
        error: "Sub-batch harus dalam status SEWING_COMPLETED",
      },
      { status: 400 }
    );
  }

  const { finisherId } = body as { finisherId?: string };

  if (!finisherId) {
    return NextResponse.json(
      { success: false, error: "ID Finisher diperlukan" },
      { status: 400 }
    );
  }

  // Validate finisher
  const finisher = await prisma.user.findUnique({
    where: { id: finisherId as string, role: "FINISHING", isActive: true },
  });

  if (!finisher) {
    return NextResponse.json(
      { success: false, error: "Finisher tidak valid" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "ASSIGNED_TO_FINISHING",
        assignedFinisherId: finisherId as string,
        timeline: {
          create: {
            event: "ASSIGNED_TO_FINISHING",
            details: `Ditugaskan ke finishing: ${finisher.name} oleh ${session.user.name}`,
          },
        },
      },
      include: {
        assignedFinisher: { select: { id: true, name: true, username: true } },
      },
    });

    // Check if all sub-batches are assigned to finishing or beyond
    const allSubBatches = await tx.subBatch.findMany({
      where: { batchId: subBatch.batchId },
    });

    const allAssignedToFinishing = allSubBatches.every(
      (sb) =>
        sb.id === subBatch.id ||
        [
          "ASSIGNED_TO_FINISHING",
          "IN_FINISHING",
          "FINISHING_COMPLETED",
          "SUBMITTED_TO_WAREHOUSE",
          "WAREHOUSE_VERIFIED",
          "COMPLETED",
        ].includes(sb.status)
    );

    // Update batch status if all sub-batches are in finishing phase
    if (
      allAssignedToFinishing &&
      ["SEWING_COMPLETED", "SEWING_VERIFIED"].includes(subBatch.batch.status)
    ) {
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "IN_FINISHING" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "FINISHING_STARTED",
          details: `Semua sub-batch telah di-assign ke finishing`,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: `Berhasil assign ke ${finisher.name}`,
  });
}

async function handleStartFinishing(subBatch: SubBatchWithRelations) {
  if (subBatch.status !== "ASSIGNED_TO_FINISHING") {
    return NextResponse.json(
      { success: false, error: "Sub-batch tidak dalam status yang tepat" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "IN_FINISHING",
        finishingStartedAt: new Date(),
        timeline: {
          create: {
            event: "FINISHING_STARTED",
            details: `Finishing dimulai oleh ${
              subBatch.assignedFinisher?.name || "finisher"
            }`,
          },
        },
      },
    });

    // Update batch status to IN_FINISHING if not already
    if (
      ["SEWING_COMPLETED", "SEWING_VERIFIED"].includes(subBatch.batch.status)
    ) {
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "IN_FINISHING" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "FINISHING_STARTED",
          details: "Proses finishing dimulai",
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Finishing dimulai",
  });
}

async function handleInputFinishingResult(
  subBatch: SubBatchWithRelations,
  body: Record<string, unknown>
) {
  if (!["IN_FINISHING", "ASSIGNED_TO_FINISHING"].includes(subBatch.status)) {
    return NextResponse.json(
      { success: false, error: "Sub-batch tidak dalam status finishing" },
      { status: 400 }
    );
  }

  const { items, finishingReject } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json(
      { success: false, error: "Data hasil finishing diperlukan" },
      { status: 400 }
    );
  }

  const totalFinishingOutput = items.reduce(
    (sum: number, item: { finishingOutput: number }) =>
      sum + item.finishingOutput,
    0
  );

  const result = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.subBatchItem.update({
        where: { id: item.id },
        data: { finishingOutput: item.finishingOutput },
      });
    }

    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "IN_FINISHING",
        finishingStartedAt: subBatch.finishingStartedAt || new Date(),
        finishingOutput: totalFinishingOutput,
        finishingReject: finishingReject || 0,
        timeline: {
          create: {
            event: "FINISHING_RESULT_INPUT",
            details: `Hasil finishing diinput: ${totalFinishingOutput} pcs (reject: ${
              finishingReject || 0
            })`,
          },
        },
      },
      include: { items: true },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Hasil finishing berhasil disimpan",
  });
}

async function handleConfirmFinishing(
  subBatch: SubBatchWithRelations,
  session: SessionUser
) {
  if (subBatch.status !== "IN_FINISHING") {
    return NextResponse.json(
      { success: false, error: "Sub-batch tidak dalam status finishing" },
      { status: 400 }
    );
  }

  if (subBatch.finishingOutput === 0) {
    return NextResponse.json(
      { success: false, error: "Hasil finishing belum diinput" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "FINISHING_COMPLETED",
        finishingCompletedAt: new Date(),
        finishingConfirmedAt: new Date(),
        timeline: {
          create: {
            event: "FINISHING_CONFIRMED",
            details: `Hasil finishing dikonfirmasi oleh ${session.user.name}. Total: ${subBatch.finishingOutput} pcs`,
          },
        },
      },
    });

    // Check if all sub-batches have completed finishing
    const allSubBatches = await tx.subBatch.findMany({
      where: { batchId: subBatch.batchId },
    });

    const allFinishingCompleted = allSubBatches.every(
      (sb) =>
        sb.id === subBatch.id ||
        [
          "FINISHING_COMPLETED",
          "SUBMITTED_TO_WAREHOUSE",
          "WAREHOUSE_VERIFIED",
          "COMPLETED",
        ].includes(sb.status)
    );

    // Update batch status if all sub-batches have completed finishing
    if (allFinishingCompleted && subBatch.batch.status === "IN_FINISHING") {
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "FINISHING_COMPLETED" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "FINISHING_COMPLETED",
          details: `Semua sub-batch telah selesai finishing. Dikonfirmasi oleh ${session.user.name}`,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Hasil finishing dikonfirmasi",
  });
}

async function handleSubmitToWarehouse(
  subBatch: SubBatchWithRelations,
  session: SessionUser
) {
  if (subBatch.status !== "FINISHING_COMPLETED") {
    return NextResponse.json(
      {
        success: false,
        error: "Sub-batch harus dalam status FINISHING_COMPLETED",
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "SUBMITTED_TO_WAREHOUSE",
        submittedToWarehouseAt: new Date(),
        timeline: {
          create: {
            event: "SUBMITTED_TO_WAREHOUSE",
            details: `Diserahkan ke gudang oleh ${session.user.name}. Jumlah: ${subBatch.finishingOutput} pcs`,
          },
        },
      },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: result,
    message: "Berhasil diserahkan ke gudang",
  });
}

async function handleVerifyWarehouse(
  subBatch: SubBatchWithRelations,
  session: SessionUser
) {
  if (subBatch.status !== "SUBMITTED_TO_WAREHOUSE") {
    return NextResponse.json(
      { success: false, error: "Sub-batch belum diserahkan ke gudang" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update sub-batch
    const updated = await tx.subBatch.update({
      where: { id: subBatch.id },
      data: {
        status: "WAREHOUSE_VERIFIED",
        warehouseVerifiedById: session.user.id,
        warehouseVerifiedAt: new Date(),
        timeline: {
          create: {
            event: "WAREHOUSE_VERIFIED",
            details: `Diverifikasi oleh gudang: ${session.user.name}`,
          },
        },
      },
      include: {
        batch: {
          include: {
            subBatches: true,
          },
        },
        items: true,
      },
    });

    // Create finished goods entries
    for (const item of updated.items) {
      if (item.finishingOutput > 0) {
        await tx.finishedGood.create({
          data: {
            batchId: subBatch.batchId,
            productId: updated.batch.productId,
            type: "FINISHED",
            quantity: item.finishingOutput,
            notes: `Sub-batch ${updated.subBatchSku} - ${item.productSize} ${item.color}`,
            verifiedById: session.user.id,
          },
        });
      }
    }

    // Check if all sub-batches are verified
    const allSubBatches = await tx.subBatch.findMany({
      where: { batchId: subBatch.batchId },
    });

    const allVerified = allSubBatches.every(
      (sb) => sb.status === "WAREHOUSE_VERIFIED" || sb.status === "COMPLETED"
    );

    if (allVerified) {
      // Update main batch status
      await tx.productionBatch.update({
        where: { id: subBatch.batchId },
        data: { status: "WAREHOUSE_VERIFIED" },
      });

      await tx.batchTimeline.create({
        data: {
          batchId: subBatch.batchId,
          event: "ALL_SUB_BATCHES_COMPLETED",
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
