import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function inputStock() {
  console.log("📦 FASE 2: KEPALA GUDANG - MANAGE STOK\n");

  // Get Kepala Gudang user
  const gudang = await prisma.user.findFirst({
    where: { username: "gudang" },
  });

  if (!gudang) {
    throw new Error("Kepala Gudang user not found. Please run seed first.");
  }

  console.log("✅ Kepala Gudang user found:", gudang.name);
  console.log("");

  // Check if transactions already exist today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingTransactions = await prisma.materialTransaction.count({
    where: {
      userId: gudang.id,
      type: "IN",
      createdAt: {
        gte: today,
      },
    },
  });

  if (existingTransactions >= 6) {
    console.log("⚠️  WARNING: Stock transactions already exist for today!");
    console.log(`   Found ${existingTransactions} existing IN transactions`);
    console.log("   Skipping to avoid duplicate entries...\n");

    // Just show current stock
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

    console.log("📊 Current Stock:\n");
    materials.forEach((m) => {
      console.log(
        `   ${m.code} (${m.name}): ${m.currentStock} ${m.unit.toLowerCase()}`
      );
    });

    console.log("\n✅ FASE 2 Already Completed (transactions exist)\n");
    return { transactions: existingTransactions, materials };
  }

  // Get all materials
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

  console.log("📊 Stock BEFORE transactions:\n");
  materials.forEach((m) => {
    console.log(
      `   ${m.code} (${m.name}): ${m.currentStock} ${m.unit.toLowerCase()}`
    );
  });
  console.log("");

  // Transaction data
  const transactions = [
    {
      code: "MAT-KAIN-001",
      name: "Kain Katun Premium",
      quantity: 100,
      notes: "Pembelian dari supplier A",
      referenceNumber: "PO-2025-001",
    },
    {
      code: "MAT-KAIN-002",
      name: "Kain Drill",
      quantity: 80,
      notes: "Pembelian dari supplier B",
      referenceNumber: "PO-2025-002",
    },
    {
      code: "MAT-BENANG-001",
      name: "Benang Jahit Premium",
      quantity: 50,
      notes: "Stock replenishment",
      referenceNumber: "PO-2025-003",
    },
    {
      code: "MAT-KANCING-001",
      name: "Kancing Kayu",
      quantity: 500,
      notes: "Bulk purchase",
      referenceNumber: "PO-2025-004",
    },
    {
      code: "MAT-RESLETING-001",
      name: "Resleting Celana",
      quantity: 200,
      notes: "Bulk purchase",
      referenceNumber: "PO-2025-005",
    },
    {
      code: "MAT-LABEL-001",
      name: "Label Brand",
      quantity: 300,
      notes: "Custom label order",
      referenceNumber: "PO-2025-006",
    },
  ];

  console.log("💾 Creating material IN transactions...\n");

  for (const txn of transactions) {
    const material = materials.find((m) => m.code === txn.code);
    if (!material) {
      console.log(`❌ Material ${txn.code} not found`);
      continue;
    }

    // Create transaction
    const transaction = await prisma.materialTransaction.create({
      data: {
        materialId: material.id,
        type: "IN",
        quantity: txn.quantity,
        unit: material.unit,
        notes: txn.notes,
        userId: gudang.id,
      },
    });

    // Update stock
    const updatedMaterial = await prisma.material.update({
      where: { id: material.id },
      data: {
        currentStock: {
          increment: txn.quantity,
        },
      },
    });

    console.log(
      `   ✅ ${txn.name}: +${txn.quantity} ${material.unit.toLowerCase()}`
    );
    console.log(`      Notes: ${txn.notes}`);
    console.log(
      `      Stock: ${material.currentStock} → ${
        updatedMaterial.currentStock
      } ${material.unit.toLowerCase()}`
    );
    console.log("");
  }

  // Show final stock
  const updatedMaterials = await prisma.material.findMany({
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

  console.log("📊 Stock AFTER transactions:\n");
  updatedMaterials.forEach((m) => {
    const expected = {
      "MAT-KAIN-001": 600, // 500 + 100
      "MAT-KAIN-002": 80, // 0 + 80
      "MAT-BENANG-001": 90, // 40 + 50
      "MAT-KANCING-001": 1500, // 1000 + 500
      "MAT-RESLETING-001": 200, // 0 + 200
      "MAT-LABEL-001": 300, // 0 + 300
    };

    const exp = expected[m.code as keyof typeof expected];
    const status = Number(m.currentStock) === exp ? "✅" : "❌";

    console.log(
      `   ${status} ${m.code} (${m.name}): ${
        m.currentStock
      } ${m.unit.toLowerCase()} (expected: ${exp})`
    );
  });

  // Verification
  console.log("\n✅ VERIFICATION:\n");

  const transactionCount = await prisma.materialTransaction.count({
    where: {
      type: "IN",
      userId: gudang.id,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  console.log(`   ✓ Transactions created: ${transactionCount}/6`);

  // Check stock accuracy
  const stockAccurate = updatedMaterials.every((m) => {
    const expected = {
      "MAT-KAIN-001": 600,
      "MAT-KAIN-002": 80,
      "MAT-BENANG-001": 90,
      "MAT-KANCING-001": 1500,
      "MAT-RESLETING-001": 200,
      "MAT-LABEL-001": 300,
    };
    return Number(m.currentStock) === expected[m.code as keyof typeof expected];
  });

  if (stockAccurate) {
    console.log("   ✓ All stock levels correct");
    console.log("\n🎉 FASE 2 COMPLETED SUCCESSFULLY!\n");
  } else {
    console.log("   ❌ Some stock levels incorrect");
    console.log("\n⚠️ Warning: Stock verification failed\n");
  }

  return { transactions: transactionCount, materials: updatedMaterials };
}

inputStock()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
