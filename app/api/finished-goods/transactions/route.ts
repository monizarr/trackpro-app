import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    const type = searchParams.get("type"); // IN, OUT, ADJUSTMENT
    const productId = searchParams.get("productId");

    // Default to current month if not provided
    const now = new Date();
    const targetMonth =
      month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [year, monthNum] = targetMonth.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const where: Record<string, unknown> = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (type) where.type = type;
    if (productId) where.productId = productId;

    // Get transactions
    const transactions = await prisma.finishedGoodTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        batch: {
          select: {
            batchSku: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate daily summary grouped by date
    const dailyMap = new Map<
      string,
      {
        date: string;
        totalIn: number;
        totalOut: number;
        totalAdjustment: number;
        transactions: typeof transactions;
      }
    >();

    for (const tx of transactions) {
      const dateKey = new Date(tx.date).toISOString().split("T")[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalIn: 0,
          totalOut: 0,
          totalAdjustment: 0,
          transactions: [],
        });
      }

      const day = dailyMap.get(dateKey)!;
      day.transactions.push(tx);

      if (tx.type === "IN") day.totalIn += tx.quantity;
      else if (tx.type === "OUT") day.totalOut += tx.quantity;
      else if (tx.type === "ADJUSTMENT") day.totalAdjustment += tx.quantity;
    }

    // Convert to array sorted by date descending
    const dailySummary = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Monthly summary
    const monthlySummary = {
      month: targetMonth,
      totalIn: transactions
        .filter((t) => t.type === "IN")
        .reduce((sum, t) => sum + t.quantity, 0),
      totalOut: transactions
        .filter((t) => t.type === "OUT")
        .reduce((sum, t) => sum + t.quantity, 0),
      totalAdjustment: transactions
        .filter((t) => t.type === "ADJUSTMENT")
        .reduce((sum, t) => sum + t.quantity, 0),
      transactionCount: transactions.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        monthlySummary,
        dailySummary,
        transactions,
      },
    });
  } catch (error) {
    console.error("Error fetching finished good transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch finished good transactions",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);

    const body = await request.json();
    const {
      productId,
      type,
      quantity,
      notes,
      reference,
      destination,
      batchId,
      date,
    } = body;

    // Validate required fields
    if (!productId || !type || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Product, type, dan quantity wajib diisi",
        },
        { status: 400 },
      );
    }

    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type harus IN, OUT, atau ADJUSTMENT",
        },
        { status: 400 },
      );
    }

    if (isNaN(Number(quantity)) || Number(quantity) === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity harus angka valid dan tidak boleh 0",
        },
        { status: 400 },
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Produk tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const transaction = await prisma.finishedGoodTransaction.create({
      data: {
        productId,
        type,
        quantity: Math.abs(Number(quantity)),
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        reference: reference || null,
        destination: destination || null,
        batchId: batchId || null,
        userId: session.user.id,
      },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `Transaksi ${type === "IN" ? "masuk" : type === "OUT" ? "keluar" : "penyesuaian"} berhasil dicatat`,
    });
  } catch (error) {
    console.error("Error creating finished good transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal membuat transaksi barang jadi",
      },
      { status: 500 },
    );
  }
}
