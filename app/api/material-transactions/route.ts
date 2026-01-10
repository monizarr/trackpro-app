import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");
    const type = searchParams.get("type"); // IN, OUT, ADJUSTMENT, RETURN
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (materialId) where.materialId = materialId;
    if (type) where.type = type;

    const transactions = await prisma.materialTransaction.findMany({
      where,
      include: {
        material: {
          select: {
            code: true,
            name: true,
            unit: true,
          },
        },
        user: {
          select: {
            name: true,
            role: true,
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
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    // console.log("Received request body:", JSON.stringify(body, null, 2));

    const {
      materialId,
      type,
      quantity,
      notes,
      rollQuantity,
      meterPerRoll,
      purchaseOrderNumber,
      supplier,
      purchaseDate,
      purchaseNotes,
    } = body;

    // Validate required fields
    if (!materialId || !type || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Material ID, type, and quantity are required",
        },
        { status: 400 }
      );
    }

    // Validate quantity is a valid number
    if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be a valid positive number",
        },
        { status: 400 }
      );
    }

    // NOTE: Stock management moved to MaterialColorVariant table
    // This endpoint is deprecated for stock IN/OUT operations
    // Use material-color-variants API instead
    return NextResponse.json(
      {
        success: false,
        error:
          "Material transactions are now managed through MaterialColorVariant. Please use /api/material-color-variants for stock operations.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create transaction",
      },
      { status: 500 }
    );
  }
}
