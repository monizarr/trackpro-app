import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "KEPALA_GUDANG") {
      return NextResponse.json(
        { error: "Only KEPALA_GUDANG can access finished goods" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type"); // 'FINISHED' or 'REJECT'

    const where = typeParam ? { type: typeParam as "FINISHED" | "REJECT" } : {};

    const finishedGoods = await prisma.finishedGood.findMany({
      where,
      include: {
        batch: {
          include: {
            product: true,
          },
        },
        subBatch: {
          select: {
            id: true,
            subBatchSku: true,
          },
        },
        verifiedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        verifiedAt: "desc",
      },
    });

    return NextResponse.json(finishedGoods);
  } catch (error) {
    console.error("Error fetching finished goods:", error);
    return NextResponse.json(
      { error: "Failed to fetch finished goods" },
      { status: 500 },
    );
  }
}
