import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        materials: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        productionBatches: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            createdBy: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch product",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;
    const body = await request.json();
    const { sku, name, price, description, status, materials } = body;

    // Validate required fields
    if (!sku || !name || !price) {
      return NextResponse.json(
        {
          success: false,
          error: "SKU, name, and price are required",
        },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // Check if SKU is already taken by another product
    if (sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku,
          NOT: {
            id,
          },
        },
      });

      if (skuExists) {
        return NextResponse.json(
          {
            success: false,
            error: "SKU already exists",
          },
          { status: 400 }
        );
      }
    }

    // Update product and materials in a transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Delete existing material relations
      await tx.productMaterial.deleteMany({
        where: { productId: id },
      });

      // Update product
      const product = await tx.product.update({
        where: { id },
        data: {
          sku,
          name,
          price,
          description,
          status: status?.toUpperCase() || "ACTIVE",
          materials: materials
            ? {
                create: materials.map((m: any) => ({
                  materialId: m.materialId,
                  quantity: m.quantity,
                  unit: m.unit || "PCS",
                })),
              }
            : undefined,
        },
        include: {
          materials: {
            include: {
              material: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  unit: true,
                  currentStock: true,
                },
              },
            },
          },
        },
      });

      return product;
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update product",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER"]);

    const { id } = await params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        productionBatches: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // Check if product has production batches
    if (existingProduct.productionBatches.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete product with existing production batches",
        },
        { status: 400 }
      );
    }

    // Delete product and its material relations
    await prisma.$transaction(async (tx) => {
      // Delete material relations
      await tx.productMaterial.deleteMany({
        where: { productId: id },
      });

      // Delete product
      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete product",
      },
      { status: 500 }
    );
  }
}
