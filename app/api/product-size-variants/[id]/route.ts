import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - Get single product size variant
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const variant = await prisma.productSizeVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          error: "Product size variant not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error: unknown) {
    console.error("Error fetching product size variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product size variant",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update product size variant
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;
    const body = await request.json();
    const { sizeName, sizeOrder, isActive } = body;

    // Check if variant exists
    const existing = await prisma.productSizeVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Product size variant not found",
        },
        { status: 404 },
      );
    }

    // Check if new sizeName conflicts with existing
    if (sizeName && sizeName !== existing.sizeName) {
      const conflict = await prisma.productSizeVariant.findFirst({
        where: {
          productId: existing.productId,
          sizeName,
          NOT: { id },
        },
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Size variant with this name already exists for this product",
          },
          { status: 400 },
        );
      }
    }

    const variant = await prisma.productSizeVariant.update({
      where: { id },
      data: {
        ...(sizeName && { sizeName }),
        ...(sizeOrder !== undefined && { sizeOrder }),
        ...(isActive !== undefined && { isActive }),
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
    console.error("Error updating product size variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product size variant",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete product size variant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const existing = await prisma.productSizeVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Product size variant not found",
        },
        { status: 404 },
      );
    }

    await prisma.productSizeVariant.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product size variant deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting product size variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product size variant",
      },
      { status: 500 },
    );
  }
}
