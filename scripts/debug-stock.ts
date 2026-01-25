import { GoodType } from "@prisma/client";
import { prisma } from "../lib/prisma";

async function debug() {
  const productId = "cmkrv7shz0006mgvniswidekg";

  // Check ALL finished goods with details
  const finishedGoods = await prisma.finishedGood.findMany({
    where: { productId, type: GoodType.FINISHED },
    include: {
      subBatch: {
        include: {
          items: true,
        },
      },
      batch: {
        select: {
          batchSku: true,
          sizeColorRequests: true,
        },
      },
    },
  });

  console.log("=== FINISHED GOODS ===");
  for (const fg of finishedGoods) {
    console.log("\n--- FG ID:", fg.id);
    console.log("Batch SKU:", fg.batch.batchSku);
    console.log("FG Quantity:", fg.quantity);
    console.log("SubBatch ID:", fg.subBatchId);
    console.log("Notes:", fg.notes);

    if (fg.subBatch) {
      console.log("SubBatch Items:");
      for (const item of fg.subBatch.items) {
        console.log(
          "  -",
          item.color,
          item.productSize,
          "assigned:",
          item.piecesAssigned,
          "output:",
          item.finishingOutput,
        );
      }
    } else {
      console.log("SizeColorRequests:");
      for (const req of fg.batch.sizeColorRequests) {
        console.log(
          "  -",
          req.color,
          req.productSize,
          "requested:",
          req.requestedPieces,
        );
      }
    }
  }

  await prisma.$disconnect();
}

debug().catch(console.error);
