import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - List product color variants
export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where = productId
      ? { productId, isActive: true }
      : { isActive: true };

    const variants = await prisma.productColorVariant.findMany({
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
      orderBy: { colorName: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: variants,
    });
  } catch (error: unknown) {
    console.error("Error fetching product color variants:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product color variants",
      },
      { status: 500 }
    );
  }
}

// POST - Create product color variant
export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const body = await request.json();
    const { productId, colorName, colorCode } = body;

    if (!productId || !colorName) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID and color name are required",
        },
        { status: 400 }
      );
    }

    // Check if variant already exists
    const existing = await prisma.productColorVariant.findUnique({
      where: {
        productId_colorName: {
          productId,
          colorName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Color variant already exists for this product",
        },
        { status: 400 }
      );
    }

    const variant = await prisma.productColorVariant.create({
      data: {
        productId,
        colorName,
        colorCode,
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
    console.error("Error creating product color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create product color variant",
      },
      { status: 500 }
    );
  }
}
