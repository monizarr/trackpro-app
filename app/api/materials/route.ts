import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG", "KEPALA_PRODUKSI"]);

    const materials = await prisma.material.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        unit: true,
        currentStock: true,
        minimumStock: true,
        rollQuantity: true,
        meterPerRoll: true,
        price: true,
        purchaseOrderNumber: true,
        supplier: true,
        purchaseDate: true,
        purchaseNotes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch materials",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const body = await request.json();
    const {
      code,
      name,
      description,
      unit,
      initialStock,
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
    if (!code || !name || minimumStock === undefined || price === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.material.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Material code already exists",
        },
        { status: 409 }
      );
    }

    const material = await prisma.material.create({
      data: {
        code,
        name,
        description,
        unit: "METER", // Force METER as default unit
        currentStock: initialStock ? parseFloat(initialStock.toString()) : 0,
        minimumStock: parseFloat(minimumStock.toString()),
        price: parseFloat(price.toString()),
        rollQuantity: rollQuantity ? parseFloat(rollQuantity.toString()) : null,
        meterPerRoll: meterPerRoll ? parseFloat(meterPerRoll.toString()) : null,
        purchaseOrderNumber: purchaseOrderNumber || null,
        supplier: supplier || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseNotes: purchaseNotes || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: material,
    });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create material",
      },
      { status: 500 }
    );
  }
}
