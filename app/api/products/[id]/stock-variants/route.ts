import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { GoodType } from "@prisma/client";

// GET - Get product stock by color and size variants
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG", "KEPALA_PRODUKSI"]);

    const { id: productId } = await params;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      );
    }

    // Get all finished goods for this product that are verified (type FINISHED)
    // Include subBatch with items for color and size information
    const finishedGoods = await prisma.finishedGood.findMany({
      where: {
        productId: productId,
        type: GoodType.FINISHED,
      },
      include: {
        subBatch: {
          include: {
            items: {
              select: {
                productSize: true,
                color: true,
                piecesAssigned: true,
                finishingOutput: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batchSku: true,
            sizeColorRequests: {
              select: {
                productSize: true,
                color: true,
                requestedPieces: true,
              },
            },
          },
        },
      },
    });

    // Aggregate stock by color and size
    const stockMap: Record<
      string,
      {
        color: string;
        size: string;
        quantity: number;
        batches: string[];
      }
    > = {};

    for (const fg of finishedGoods) {
      // Get effective quantity
      const fgQuantity = fg.quantity ?? 0;
      if (fgQuantity <= 0) continue;

      let processed = false;

      // Priority 1: Use subBatch items if available
      if (fg.subBatch && fg.subBatch.items && fg.subBatch.items.length > 0) {
        const items = fg.subBatch.items;

        // Calculate totals for distribution
        const totalItemsOutput = items.reduce(
          (sum, i) => sum + (i.finishingOutput ?? 0),
          0,
        );
        const totalAssigned = items.reduce(
          (sum, i) => sum + (i.piecesAssigned ?? 0),
          0,
        );

        const useItemsOutput = totalItemsOutput > 0;

        for (const item of items) {
          const key = `${item.color}-${item.productSize}`;
          if (!stockMap[key]) {
            stockMap[key] = {
              color: item.color,
              size: item.productSize,
              quantity: 0,
              batches: [],
            };
          }

          let itemQuantity = 0;
          if (useItemsOutput) {
            itemQuantity = item.finishingOutput ?? 0;
          } else if (totalAssigned > 0) {
            const proportion = (item.piecesAssigned ?? 0) / totalAssigned;
            itemQuantity = Math.round(fgQuantity * proportion);
          } else if (items.length === 1) {
            itemQuantity = fgQuantity;
          }

          stockMap[key].quantity += itemQuantity;
          if (!stockMap[key].batches.includes(fg.batch.batchSku)) {
            stockMap[key].batches.push(fg.batch.batchSku);
          }
        }
        processed = true;
      }

      // Priority 2: Parse color and size from notes field
      // Format: "Sub-batch PROD-XXXXXXXX-XXX-SUB-XXX - {SIZE} {COLOR}"
      if (!processed && fg.notes) {
        const notesMatch = fg.notes.match(/- ([A-Z]+) (.+)$/i);
        if (notesMatch) {
          const size = notesMatch[1]; // e.g., "M", "S", "L"
          const color = notesMatch[2]; // e.g., "Putih", "Hitam"

          const key = `${color}-${size}`;
          if (!stockMap[key]) {
            stockMap[key] = {
              color: color,
              size: size,
              quantity: 0,
              batches: [],
            };
          }
          stockMap[key].quantity += fgQuantity;
          if (!stockMap[key].batches.includes(fg.batch.batchSku)) {
            stockMap[key].batches.push(fg.batch.batchSku);
          }
          processed = true;
        }
      }

      // Priority 3: Use sizeColorRequests from batch
      if (
        !processed &&
        fg.batch.sizeColorRequests &&
        fg.batch.sizeColorRequests.length > 0
      ) {
        const totalRequested = fg.batch.sizeColorRequests.reduce(
          (sum, r) => sum + (r.requestedPieces ?? 0),
          0,
        );

        const requestCount = fg.batch.sizeColorRequests.length;

        for (const request of fg.batch.sizeColorRequests) {
          const key = `${request.color}-${request.productSize}`;
          if (!stockMap[key]) {
            stockMap[key] = {
              color: request.color,
              size: request.productSize,
              quantity: 0,
              batches: [],
            };
          }

          let quantityToAdd = 0;
          if (totalRequested > 0) {
            const proportion = (request.requestedPieces ?? 0) / totalRequested;
            quantityToAdd = Math.round(fgQuantity * proportion);
          } else {
            // If no requestedPieces defined, distribute evenly
            quantityToAdd = Math.round(fgQuantity / requestCount);
          }

          stockMap[key].quantity += quantityToAdd;
          if (!stockMap[key].batches.includes(fg.batch.batchSku)) {
            stockMap[key].batches.push(fg.batch.batchSku);
          }
        }
        processed = true;
      }

      // Priority 4: Fallback to Default
      if (!processed) {
        const key = "Default-Default";
        if (!stockMap[key]) {
          stockMap[key] = {
            color: "Default",
            size: "Default",
            quantity: 0,
            batches: [],
          };
        }
        stockMap[key].quantity += fgQuantity;
        if (!stockMap[key].batches.includes(fg.batch.batchSku)) {
          stockMap[key].batches.push(fg.batch.batchSku);
        }
      }
    }

    // Convert map to array and sort
    const stockVariants = Object.values(stockMap).sort((a, b) => {
      // Sort by color first, then by size
      if (a.color !== b.color) {
        return a.color.localeCompare(b.color);
      }
      // Custom size order
      const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
      const aIndex = sizeOrder.indexOf(a.size);
      const bIndex = sizeOrder.indexOf(b.size);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      return a.size.localeCompare(b.size);
    });

    // Calculate totals - ensure no null/NaN values
    const totalStock = stockVariants.reduce(
      (sum, v) => sum + (v.quantity ?? 0),
      0,
    );
    const uniqueColors = [...new Set(stockVariants.map((v) => v.color))];
    const uniqueSizes = [...new Set(stockVariants.map((v) => v.size))];

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        },
        stockVariants,
        summary: {
          totalStock,
          colorCount: uniqueColors.length,
          sizeCount: uniqueSizes.length,
          colors: uniqueColors,
          sizes: uniqueSizes,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching product stock variants:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product stock variants",
      },
      { status: 500 },
    );
  }
}
