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
        rollQuantity: true,
        purchaseOrderNumber: true,
        supplier: true,
        purchaseDate: true,
        purchaseNotes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        colorVariants: {
          select: {
            id: true,
            colorName: true,
            colorCode: true,
            stock: true,
            minimumStock: true,
            isActive: true,
          },
          where: {
            isActive: true,
          },
        },
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

    // Validate session has user ID
    if (!session?.user?.id) {
      console.error("Session missing user ID:", session);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session - user ID not found",
        },
        { status: 401 }
      );
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      console.error("User not found in database:", session.user.id);
      return NextResponse.json(
        { success: false, error: "User not found - please login again" },
        { status: 401 }
      );
    }

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
    if (!code || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Code and name are required",
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

    console.log("Creating material with createdById:", session.user.id);
    console.log("Session user:", session.user);

    const material = await prisma.material.create({
      data: {
        code,
        name,
        description,
        unit: "METER", // Force METER as default unit
        rollQuantity: rollQuantity ? parseFloat(rollQuantity.toString()) : null,
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
