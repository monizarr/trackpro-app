import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// POST - Create stock transaction for material color variant
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);
    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const {
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
    if (!type || quantity === undefined || quantity === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Type dan quantity wajib diisi",
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["IN", "OUT", "ADJUSTMENT", "RETURN"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type harus salah satu dari: IN, OUT, ADJUSTMENT, RETURN",
        },
        { status: 400 }
      );
    }

    // Validate quantity
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity harus berupa angka positif",
        },
        { status: 400 }
      );
    }

    // Get current variant
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
          error: "Varian tidak ditemukan",
        },
        { status: 404 }
      );
    }

    // Calculate new stock based on transaction type
    const currentStock = Number(variant.stock);
    let newStock = currentStock;

    switch (type) {
      case "IN":
      case "RETURN":
        newStock = currentStock + qty;
        break;
      case "OUT":
        if (currentStock < qty) {
          return NextResponse.json(
            {
              success: false,
              error: `Stok tidak mencukupi. Stok saat ini: ${currentStock} ${variant.material.unit}`,
            },
            { status: 400 }
          );
        }
        newStock = currentStock - qty;
        break;
      case "ADJUSTMENT":
        // For adjustment, quantity is the new stock value
        newStock = qty;
        break;
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      stock: newStock,
    };

    // Update purchase info if type is IN
    if (type === "IN") {
      if (rollQuantity !== undefined && rollQuantity !== null) {
        updateData.rollQuantity = Number(rollQuantity);
      }
      if (meterPerRoll !== undefined && meterPerRoll !== null) {
        updateData.meterPerRoll = Number(meterPerRoll);
      }
      if (purchaseOrderNumber) {
        updateData.purchaseOrderNumber = purchaseOrderNumber;
      }
      if (supplier) {
        updateData.supplier = supplier;
      }
      if (purchaseDate) {
        updateData.purchaseDate = new Date(purchaseDate);
      }
      if (purchaseNotes) {
        updateData.purchaseNotes = purchaseNotes;
      }
    }

    // Update variant stock
    const updatedVariant = await prisma.materialColorVariant.update({
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

    // Create transaction log in MaterialTransaction table
    await prisma.materialTransaction.create({
      data: {
        materialId: variant.materialId,
        type: type,
        quantity: qty,
        unit: variant.material.unit,
        notes: notes || `Transaksi ${type} untuk varian ${variant.colorName}`,
        rollQuantity:
          type === "IN" && rollQuantity ? Number(rollQuantity) : null,
        meterPerRoll:
          type === "IN" && meterPerRoll ? Number(meterPerRoll) : null,
        purchaseOrderNumber: type === "IN" ? purchaseOrderNumber || null : null,
        supplier: type === "IN" ? supplier || null : null,
        purchaseDate:
          type === "IN" && purchaseDate ? new Date(purchaseDate) : null,
        purchaseNotes: type === "IN" ? purchaseNotes || null : null,
        userId: session.user.id,
      },
    });

    const typeLabels: Record<string, string> = {
      IN: "Stok Masuk",
      OUT: "Stok Keluar",
      ADJUSTMENT: "Penyesuaian",
      RETURN: "Retur",
    };

    return NextResponse.json({
      success: true,
      data: updatedVariant,
      message: `${typeLabels[type]} berhasil dicatat. Stok baru: ${newStock} ${variant.material.unit}`,
    });
  } catch (error: unknown) {
    console.error("Error processing transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Gagal memproses transaksi",
      },
      { status: 500 }
    );
  }
}
