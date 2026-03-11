import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - Get single product color variant
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const variant = await prisma.productColorVariant.findUnique({
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
          error: "Product color variant not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error: unknown) {
    console.error("Error fetching product color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product color variant",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update product color variant
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;
    const body = await request.json();
    const { colorName, colorCode, isActive } = body;

    const existing = await prisma.productColorVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Product color variant not found",
        },
        { status: 404 },
      );
    }

    // Check if new colorName conflicts with existing
    if (colorName && colorName !== existing.colorName) {
      const conflict = await prisma.productColorVariant.findFirst({
        where: {
          productId: existing.productId,
          colorName,
          NOT: { id },
        },
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Color variant with this name already exists for this product",
          },
          { status: 400 },
        );
      }
    }

    const variant = await prisma.productColorVariant.update({
      where: { id },
      data: {
        ...(colorName && { colorName }),
        ...(colorCode !== undefined && { colorCode }),
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
    console.error("Error updating product color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update product color variant",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete product color variant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);
    const { id } = await params;

    const existing = await prisma.productColorVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Product color variant not found",
        },
        { status: 404 },
      );
    }

    await prisma.productColorVariant.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product color variant deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting product color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete product color variant",
      },
      { status: 500 },
    );
  }
}
