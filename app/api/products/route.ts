import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    // Allow all authenticated users to view products
    const session = await requireAuth();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const products = await prisma.product.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate available stock for each product by querying FinishedGood separately
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const finishedGoods = await prisma.finishedGood.findMany({
          where: {
            productId: product.id,
            type: "FINISHED",
          },
          select: {
            quantity: true,
          },
        });

        const availableStock = finishedGoods.reduce(
          (sum, fg) => sum + fg.quantity,
          0
        );

        return {
          ...product,
          availableStock,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: productsWithStock,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["OWNER"]);

    const body = await request.json();
    const { sku, name, description, price, materials } = body;

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

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product with this SKU already exists",
        },
        { status: 400 }
      );
    }

    // Create product with materials
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || "",
        price: parseFloat(price),
        createdById: session.user.id,
        materials: {
          create:
            materials?.map(
              (material: { materialId: string; quantity: number }) => ({
                materialId: material.materialId,
                quantity: material.quantity,
                unit: "METER", // Default unit, you may want to fetch this from material
              })
            ) || [],
        },
      },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create product",
      },
      { status: 500 }
    );
  }
}
