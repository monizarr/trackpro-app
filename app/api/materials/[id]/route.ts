import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { id } = await params;

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
            batch: {
              select: {
                batchSku: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: material,
    });
  } catch (error) {
    console.error("Error fetching material:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch material",
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
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { id } = await params;
    const body = await request.json();
    const {
      code,
      name,
      description,
      unit,
      minimumStock,
      price,
      rollQuantity,
      meterPerRoll,
      purchaseOrderNumber,
      supplier,
      purchaseDate,
      purchaseNotes,
    } = body;

    // Validate required fields
    if (!code || !name || !minimumStock || !price) {
      return NextResponse.json(
        {
          success: false,
          error: "Code, name, minimum stock, and price are required",
        },
        { status: 400 }
      );
    }

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
    });

    if (!existingMaterial) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found",
        },
        { status: 404 }
      );
    }

    // Check if code is already taken by another material
    if (code !== existingMaterial.code) {
      const codeExists = await prisma.material.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          {
            success: false,
            error: "Material code already exists",
          },
          { status: 400 }
        );
      }
    }

    // Update material
    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: {
        code,
        name,
        description,
        unit: "METER", // Force METER as unit
        rollQuantity: rollQuantity ? parseFloat(rollQuantity.toString()) : null,
        purchaseOrderNumber: purchaseOrderNumber || null,
        supplier: supplier || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseNotes: purchaseNotes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
    });
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update material",
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
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { id } = await params;

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
      include: {
        products: true,
        batchAllocations: true,
        transactions: true,
      },
    });

    if (!existingMaterial) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found",
        },
        { status: 404 }
      );
    }

    // Check if material is being used
    if (existingMaterial.products.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete material that is being used in products",
        },
        { status: 400 }
      );
    }

    if (existingMaterial.batchAllocations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete material that has production batch allocations",
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false instead of hard delete
    // This preserves transaction history
    const deletedMaterial = await prisma.material.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Material deleted successfully",
      data: deletedMaterial,
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete material",
      },
      { status: 500 }
    );
  }
}
