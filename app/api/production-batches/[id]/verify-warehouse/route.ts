import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "KEPALA_GUDANG") {
      return NextResponse.json(
        { error: "Only KEPALA_GUDANG can verify warehouse" },
        { status: 403 }
      );
    }

    const { id: batchId } = await params;
    const body = await request.json();
    const { goodsLocation, warehouseNotes } = body;

    // Get batch with finishing task
    const batch = await prisma.productionBatch.findUnique({
      where: { id: batchId },
      include: {
        finishingTask: true,
        product: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "FINISHING_COMPLETED") {
      return NextResponse.json(
        { error: "Batch must be FINISHING_COMPLETED to verify warehouse" },
        { status: 400 }
      );
    }

    if (!batch.finishingTask) {
      return NextResponse.json(
        { error: "Finishing task not found" },
        { status: 404 }
      );
    }

    // Create transaction to store finished goods
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create finished goods entry for completed items
      const finishedGoodsEntry = await tx.finishedGood.create({
        data: {
          batchId: batch.id,
          productId: batch.productId,
          type: "FINISHED",
          quantity: batch.finishingTask!.piecesCompleted,
          location: goodsLocation || "DEFAULT",
          notes: warehouseNotes,
          verifiedById: user.id,
        },
      });

      // 2. Create finished goods entry for reject items (if any)
      let rejectEntry = null;
      if (batch.finishingTask!.rejectPieces > 0) {
        rejectEntry = await tx.finishedGood.create({
          data: {
            batchId: batch.id,
            productId: batch.productId,
            type: "REJECT",
            quantity: batch.finishingTask!.rejectPieces,
            location: "REJECT_AREA",
            notes: `Barang gagal dari finishing. ${warehouseNotes || ""}`,
            verifiedById: user.id,
          },
        });
      }

      // 3. Update batch status
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          status: "WAREHOUSE_VERIFIED",
          actualQuantity: batch.finishingTask!.piecesCompleted,
          rejectQuantity: batch.finishingTask!.rejectPieces,
          completedDate: new Date(),
        },
      });

      // 4. Create timeline event
      await tx.batchTimeline.create({
        data: {
          batchId: batch.id,
          event: "WAREHOUSE_VERIFIED",
          details: `Verified by ${user.name}. Stored ${
            finishedGoodsEntry.quantity
          } finished goods at ${goodsLocation || "DEFAULT"}${
            rejectEntry ? ` and ${rejectEntry.quantity} reject items` : ""
          }`,
        },
      });

      // 5. Notify production head
      const produksiUser = await tx.user.findFirst({
        where: { role: "KEPALA_PRODUKSI" },
      });

      if (produksiUser) {
        await tx.notification.create({
          data: {
            userId: produksiUser.id,
            type: "TASK_COMPLETED",
            title: "Batch Terverifikasi Gudang",
            message: `Batch ${
              batch.batchSku
            } telah diverifikasi oleh kepala gudang. Finished: ${
              finishedGoodsEntry.quantity
            }, Reject: ${batch.finishingTask!.rejectPieces}`,
            link: `/production/batch`,
            isRead: false,
          },
        });
      }

      return {
        batch: updatedBatch,
        finishedGoods: finishedGoodsEntry,
        rejectGoods: rejectEntry,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying warehouse:", error);
    return NextResponse.json(
      { error: "Failed to verify warehouse" },
      { status: 500 }
    );
  }
}
