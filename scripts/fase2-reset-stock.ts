import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetStock() {
  console.log("🔄 RESETTING STOCK TO FASE 2 EXPECTED STATE\n");

  // Delete duplicate transactions (keep only 6 most recent)
  const gudang = await prisma.user.findFirst({
    where: { username: "gudang" },
  });

  if (!gudang) {
    throw new Error("Gudang user not found");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all transactions from today
  const todayTransactions = await prisma.materialTransaction.findMany({
    where: {
      userId: gudang.id,
      type: "IN",
      createdAt: {
        gte: today,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${todayTransactions.length} transactions from today`);

  if (todayTransactions.length > 6) {
    // Delete the older duplicates (keep last 6)
    const toDelete = todayTransactions.slice(6);
    console.log(`Deleting ${toDelete.length} duplicate transactions...\n`);

    for (const txn of toDelete) {
      // Reverse the stock change
      await prisma.material.update({
        where: { id: txn.materialId },
        data: {
          currentStock: {
            decrement: Number(txn.quantity),
          },
        },
      });

      // Delete transaction
      await prisma.materialTransaction.delete({
        where: { id: txn.id },
      });
    }

    console.log("✅ Duplicates removed\n");
  }

  // Show final stock
  const materials = await prisma.material.findMany({
    where: {
      code: {
        in: [
          "MAT-KAIN-001",
          "MAT-KAIN-002",
          "MAT-BENANG-001",
          "MAT-KANCING-001",
          "MAT-RESLETING-001",
          "MAT-LABEL-001",
        ],
      },
    },
    orderBy: { code: "asc" },
  });

  console.log("📊 Stock AFTER Reset:\n");

  const expected = {
    "MAT-KAIN-001": 600, // 500 + 100
    "MAT-KAIN-002": 80, // 0 + 80
    "MAT-BENANG-001": 90, // 40 + 50
    "MAT-KANCING-001": 1500, // 1000 + 500
    "MAT-RESLETING-001": 200, // 0 + 200
    "MAT-LABEL-001": 300, // 0 + 300
  };

  materials.forEach((m) => {
    const exp = expected[m.code as keyof typeof expected];
    const status = Number(m.currentStock) === exp ? "✅" : "❌";

    console.log(
      `   ${status} ${m.code}: ${
        m.currentStock
      } ${m.unit.toLowerCase()} (expected: ${exp})`
    );
  });

  const allCorrect = materials.every((m) => {
    return Number(m.currentStock) === expected[m.code as keyof typeof expected];
  });

  if (allCorrect) {
    console.log("\n🎉 Stock reset to correct FASE 2 state!\n");
  } else {
    console.log("\n⚠️  Stock levels still need adjustment\n");
  }
}

resetStock()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
