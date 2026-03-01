import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// GET /api/finished-goods/transactions/summary
// Returns stock summary per product (total in - total out)
export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    // Get all transactions grouped by product
    const transactions = await prisma.finishedGoodTransaction.findMany({
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    // Calculate stock per product
    const productMap = new Map<
      string,
      {
        product: { id: string; sku: string; name: string };
        totalIn: number;
        totalOut: number;
        currentStock: number;
      }
    >();

    for (const tx of transactions) {
      if (!productMap.has(tx.productId)) {
        productMap.set(tx.productId, {
          product: tx.product,
          totalIn: 0,
          totalOut: 0,
          currentStock: 0,
        });
      }

      const entry = productMap.get(tx.productId)!;
      if (tx.type === "IN") {
        entry.totalIn += tx.quantity;
      } else if (tx.type === "OUT") {
        entry.totalOut += tx.quantity;
      } else if (tx.type === "ADJUSTMENT") {
        // Adjustment can be positive or negative
        entry.totalIn += tx.quantity;
      }
    }

    // Calculate current stock
    const summary = Array.from(productMap.values()).map((entry) => ({
      ...entry,
      currentStock: entry.totalIn - entry.totalOut,
    }));

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching stock summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock summary",
      },
      { status: 500 },
    );
  }
}
