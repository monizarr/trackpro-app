import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - List product size variants
export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where = productId
      ? { productId, isActive: true }
      : { isActive: true };

    const variants = await prisma.productSizeVariant.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { sizeOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: variants,
    });
  } catch (error: unknown) {
    console.error("Error fetching product size variants:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product size variants",
      },
      { status: 500 },
    );
  }
}

// POST - Create product size variant
export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const body = await request.json();
    const { productId, sizeName, sizeOrder } = body;

    if (!productId || !sizeName) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID and size name are required",
        },
        { status: 400 },
      );
    }

    // Check if variant already exists
    const existing = await prisma.productSizeVariant.findUnique({
      where: {
        productId_sizeName: {
          productId,
          sizeName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Size variant already exists for this product",
        },
        { status: 400 },
      );
    }

    // Get the next sizeOrder if not provided
    let order = sizeOrder;
    if (order === undefined || order === null) {
      const lastVariant = await prisma.productSizeVariant.findFirst({
        where: { productId },
        orderBy: { sizeOrder: "desc" },
      });
      order = lastVariant ? lastVariant.sizeOrder + 1 : 0;
    }

    const variant = await prisma.productSizeVariant.create({
      data: {
        productId,
        sizeName,
        sizeOrder: order,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error: unknown) {
    console.error("Error creating product size variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product size variant",
      },
      { status: 500 },
    );
  }
}
