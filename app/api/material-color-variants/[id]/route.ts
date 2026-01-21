import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - Get single material color variant
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG", "KEPALA_PRODUKSI"]);
    const params = await context.params;
    const { id } = params;

    const variant = await prisma.materialColorVariant.findUnique({
      where: { id },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
          },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          error: "Material color variant not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error: unknown) {
    console.error("Error fetching material color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch material color variant",
      },
      { status: 500 },
    );
  }
}

// PATCH - Update material color variant
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    // Check if variant exists
    const existing = await prisma.materialColorVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Material color variant not found",
        },
        { status: 404 },
      );
    }

    // Fields yang bisa diupdate (tidak termasuk stock, materialId, colorName)
    const updateData: any = {};

    if (body.colorCode !== undefined)
      updateData.colorCode = body.colorCode || null;
    if (body.minimumStock !== undefined)
      updateData.minimumStock = body.minimumStock;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.rollQuantity !== undefined)
      updateData.rollQuantity = body.rollQuantity || null;
    if (body.meterPerRoll !== undefined)
      updateData.meterPerRoll = body.meterPerRoll || null;
    if (body.purchaseOrderNumber !== undefined)
      updateData.purchaseOrderNumber = body.purchaseOrderNumber || null;
    if (body.purchaseDate !== undefined)
      updateData.purchaseDate = body.purchaseDate
        ? new Date(body.purchaseDate)
        : null;
    if (body.purchaseNotes !== undefined)
      updateData.purchaseNotes = body.purchaseNotes || null;
    if (body.supplier !== undefined)
      updateData.supplier = body.supplier || null;
    if (body.unit !== undefined) updateData.unit = body.unit;

    const variant = await prisma.materialColorVariant.update({
      where: { id },
      data: updateData,
      include: {
        material: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: variant,
      message: "Varian warna berhasil diperbarui",
    });
  } catch (error: unknown) {
    console.error("Error updating material color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update material color variant",
      },
      { status: 500 },
    );
  }
}

// DELETE - Soft delete material color variant
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const params = await context.params;
    const { id } = params;

    // Check if variant exists
    const existing = await prisma.materialColorVariant.findUnique({
      where: { id },
      include: {
        batchAllocations: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Material color variant not found",
        },
        { status: 404 },
      );
    }

    // Check if variant is used in any batch allocations
    if (existing.batchAllocations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete variant that is used in production batches. Deactivate instead.",
        },
        { status: 400 },
      );
    }

    // Soft delete - set isActive to false
    await prisma.materialColorVariant.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Varian warna berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("Error deleting material color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete material color variant",
      },
      { status: 500 },
    );
  }
}
