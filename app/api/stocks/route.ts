import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'materials' or 'products'

    if (type === "materials") {
      // Get material color variants with stock info
      const materialVariants = await prisma.materialColorVariant.findMany({
        where: {
          isActive: true,
          material: {
            isActive: true,
          },
        },
        include: {
          material: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              unit: true,
            },
          },
        },
        orderBy: {
          material: {
            name: "asc",
          },
        },
      });

      // Calculate statistics
      const totalMaterials = materialVariants.length;
      const lowStockItems = materialVariants.filter(
        (m) => Number(m.stock) <= Number(m.minimumStock) && Number(m.stock) > 0
      ).length;
      const outOfStockItems = materialVariants.filter(
        (m) => Number(m.stock) === 0
      ).length;

      return NextResponse.json({
        success: true,
        data: {
          materials: materialVariants,
          statistics: {
            totalMaterials,
            lowStockItems,
            outOfStockItems,
          },
        },
      });
    }

    if (type === "products") {
      // Get finished products from completed production batches
      const completedBatches = await prisma.productionBatch.findMany({
        where: {
          status: "COMPLETED",
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              status: true,
            },
          },
        },
        orderBy: {
          completedDate: "desc",
        },
      });

      // Group by product and sum quantities
      const productsMap = new Map();
      completedBatches.forEach((batch) => {
        const productId = batch.product.id;
        const netQuantity = batch.actualQuantity - batch.rejectQuantity;

        if (productsMap.has(productId)) {
          const existing = productsMap.get(productId);
          existing.stock += netQuantity;
        } else {
          productsMap.set(productId, {
            id: productId,
            sku: batch.product.sku,
            name: batch.product.name,
            price: Number(batch.product.price),
            stock: netQuantity,
            unit: "PCS",
            status: batch.product.status,
          });
        }
      });

      const products = Array.from(productsMap.values());
      const totalProducts = products.reduce((sum, p) => sum + p.stock, 0);
      const totalValue = products.reduce(
        (sum, p) => sum + p.stock * p.price,
        0
      );

      return NextResponse.json({
        success: true,
        data: {
          products,
          statistics: {
            totalProductTypes: products.length,
            totalProducts,
            totalValue,
          },
        },
      });
    }

    // Default: return both
    return NextResponse.json({
      success: false,
      error: "Please specify type parameter: 'materials' or 'products'",
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stocks",
      },
      { status: 500 }
    );
  }
}
