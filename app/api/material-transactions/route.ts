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

    // Get material to check stock and unit
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    console.log("Material fetched for transaction:", material);

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: "Material not found",
        },
        { status: 404 }
      );
    }

    // Validate stock for OUT transactions
    if (type === "OUT" && Number(material.currentStock) < Number(quantity)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient stock",
        },
        { status: 400 }
      );
    }

    // Create transaction and update stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare transaction data
      const transactionData: any = {
        materialId,
        type,
        quantity: parseFloat(quantity.toString()),
        unit: material.unit,
        notes: notes || null,
        userId: session.user.id,
      };

      // Add purchase info only for type IN
      if (type === "IN") {
        if (
          rollQuantity !== undefined &&
          rollQuantity !== null &&
          rollQuantity !== ""
        ) {
          transactionData.rollQuantity = parseFloat(rollQuantity.toString());
        }
        if (
          meterPerRoll !== undefined &&
          meterPerRoll !== null &&
          meterPerRoll !== ""
        ) {
          transactionData.meterPerRoll = parseFloat(meterPerRoll.toString());
        }
        if (purchaseOrderNumber) {
          transactionData.purchaseOrderNumber = purchaseOrderNumber;
        }
        if (supplier) {
          transactionData.supplier = supplier;
        }
        if (purchaseDate) {
          transactionData.purchaseDate = new Date(purchaseDate);
        }
        if (purchaseNotes) {
          transactionData.purchaseNotes = purchaseNotes;
        }
      }

      console.log(
        "Creating transaction with data:",
        JSON.stringify(transactionData, null, 2)
      );

      // Create transaction record
      const transaction = await tx.materialTransaction.create({
        data: transactionData,
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
            },
          },
        },
      });

      // Update material stock
      let newStock = Number(material.currentStock);
      if (type === "IN") {
        newStock += Number(quantity);
      } else if (type === "OUT") {
        newStock -= Number(quantity);
      } else if (type === "ADJUSTMENT") {
        newStock = Number(quantity); // Set to exact quantity
      } else if (type === "RETURN") {
        newStock += Number(quantity);
      }

      // Update material - also update roll quantity and purchase info if type is IN
      const updateData: any = {
        currentStock: newStock,
      };

      // If this is a stock IN transaction, update material's purchase info
      if (type === "IN") {
        if (rollQuantity) {
          updateData.rollQuantity = material.rollQuantity
            ? Number(material.rollQuantity) +
              parseFloat(rollQuantity.toString())
            : parseFloat(rollQuantity.toString());
        }
        if (meterPerRoll)
          updateData.meterPerRoll = parseFloat(meterPerRoll.toString());
        if (purchaseOrderNumber)
          updateData.purchaseOrderNumber = purchaseOrderNumber;
        if (supplier) updateData.supplier = supplier;
        if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
        if (purchaseNotes) updateData.purchaseNotes = purchaseNotes;
      }

      await tx.material.update({
        where: { id: materialId },
        data: updateData,
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
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
