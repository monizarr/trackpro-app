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
        batch: {
          productId: productId,
        },
        type: GoodType.FINISHED,
      },
      include: {
        subBatch: {
          include: {
            items: {
              select: {
                productSize: true,
                color: true,
                finishingOutput: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batchSku: true,
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
      if (fg.subBatch && fg.subBatch.items) {
        // For sub-batch based finished goods, use items detail
        for (const item of fg.subBatch.items) {
          const key = `${item.color}-${item.productSize}`;
          if (!stockMap[key]) {
            stockMap[key] = {
              color: item.color,
              size: item.productSize,
              quantity: 0,
              batches: [],
            };
          }
          stockMap[key].quantity += item.finishingOutput;
          if (!stockMap[key].batches.includes(fg.batch.batchSku)) {
            stockMap[key].batches.push(fg.batch.batchSku);
          }
        }
      } else {
        // For direct batch finished goods without sub-batch, use quantity directly
        // These don't have color/size info, so we mark as "Default"
        const key = "Default-Default";
        if (!stockMap[key]) {
          stockMap[key] = {
            color: "Default",
            size: "Default",
            quantity: 0,
            batches: [],
          };
        }
        stockMap[key].quantity += fg.quantity;
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

    // Calculate totals
    const totalStock = stockVariants.reduce((sum, v) => sum + v.quantity, 0);
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
