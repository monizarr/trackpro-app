import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET - List material color variants
export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG", "KEPALA_PRODUKSI"]);
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");

    const where = materialId
      ? { materialId, isActive: true }
      : { isActive: true };

    const variants = await prisma.materialColorVariant.findMany({
      where,
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
      orderBy: { colorName: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: variants,
    });
  } catch (error: unknown) {
    console.error("Error fetching material color variants:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch material color variants",
      },
      { status: 500 },
    );
  }
}

// POST - Create material color variant
export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const body = await request.json();
    const {
      materialId,
      colorName,
      colorCode,
      stock,
      minimumStock,
      price,
      rollQuantity,
      meterPerRoll,
      purchaseOrderNumber,
      purchaseDate,
      purchaseNotes,
      supplier,
      unit,
    } = body;

    if (!materialId || !colorName) {
      return NextResponse.json(
        {
          success: false,
          error: "Material ID and color name are required",
        },
        { status: 400 },
      );
    }

    // Check if variant already exists
    const existing = await prisma.materialColorVariant.findUnique({
      where: {
        materialId_colorName: {
          materialId,
          colorName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Color variant already exists for this material",
        },
        { status: 400 },
      );
    }

    const variant = await prisma.materialColorVariant.create({
      data: {
        materialId,
        colorName,
        colorCode: colorCode || null,
        stock: stock || 0,
        minimumStock: minimumStock || 0,
        price: price || 0,
        rollQuantity: rollQuantity || null,
        meterPerRoll: meterPerRoll || null,
        purchaseOrderNumber: purchaseOrderNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseNotes: purchaseNotes || null,
        supplier: supplier || null,
        unit: unit || "YARD",
      },
      include: {
        material: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: variant,
      message: `Varian warna ${colorName} berhasil ditambahkan`,
    });
  } catch (error: unknown) {
    console.error("Error creating material color variant:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create material color variant",
      },
      { status: 500 },
    );
  }
}
