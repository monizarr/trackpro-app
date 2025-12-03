import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyFase2() {
  console.log("🔍 FASE 2 VERIFICATION - DATABASE CHECK\n");

  // Get Kepala Gudang user
  const gudang = await prisma.user.findFirst({
    where: { username: "gudang" },
  });

  if (!gudang) {
    throw new Error("Kepala Gudang user not found");
  }

  // Query 1: Check IN transactions
  console.log("1️⃣ Checking material IN transactions...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactions = await prisma.materialTransaction.findMany({
    where: {
      userId: gudang.id,
      type: "IN",
      createdAt: {
        gte: today,
      },
    },
    include: {
      material: true,
    },
    orderBy: {
      material: { code: "asc" },
    },
  });

  console.log(`   Found ${transactions.length} IN transactions:`);
  transactions.forEach((t) => {
    console.log(
      `   - ${t.material.name}: +${t.quantity} ${t.unit.toLowerCase()}`
    );
    if (t.notes) {
      console.log(`     Notes: ${t.notes}`);
    }
  });
  console.log("");

  if (transactions.length !== 6) {
    console.log(
      "❌ ERROR: Expected 6 transactions, found",
      transactions.length
    );
    return false;
  }

  // Verify specific transactions
  const expectedTransactions = {
    "MAT-KAIN-001": { qty: 100, unit: "METER" },
    "MAT-KAIN-002": { qty: 80, unit: "METER" },
    "MAT-BENANG-001": { qty: 50, unit: "ROLL" },
    "MAT-KANCING-001": { qty: 500, unit: "PIECE" },
    "MAT-RESLETING-001": { qty: 200, unit: "PIECE" },
    "MAT-LABEL-001": { qty: 300, unit: "PIECE" },
  };

  for (const t of transactions) {
    const expected =
      expectedTransactions[
        t.material.code as keyof typeof expectedTransactions
      ];
    if (!expected) {
      console.log(`❌ ERROR: Unexpected transaction for ${t.material.code}`);
      return false;
    }

    if (Number(t.quantity) !== expected.qty) {
      console.log(
        `❌ ERROR: ${t.material.code} quantity mismatch. Expected ${expected.qty}, got ${t.quantity}`
      );
      return false;
    }

    if (t.unit !== expected.unit) {
      console.log(
        `❌ ERROR: ${t.material.code} unit mismatch. Expected ${expected.unit}, got ${t.unit}`
      );
      return false;
    }
  }

  // Query 2: Check material stock levels
  console.log("2️⃣ Checking material stock levels...");

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

  console.log(`   Found ${materials.length} materials:`);
  materials.forEach((m) => {
    console.log(`   - ${m.name}: ${m.currentStock} ${m.unit.toLowerCase()}`);
  });
  console.log("");

  // Verify stock levels
  const expectedStock = {
    "MAT-KAIN-001": 600, // 500 + 100
    "MAT-KAIN-002": 80, // 0 + 80
    "MAT-BENANG-001": 90, // 40 + 50
    "MAT-KANCING-001": 1500, // 1000 + 500
    "MAT-RESLETING-001": 200, // 0 + 200
    "MAT-LABEL-001": 300, // 0 + 300
  };

  for (const m of materials) {
    const expected = expectedStock[m.code as keyof typeof expectedStock];
    if (Number(m.currentStock) !== expected) {
      console.log(
        `❌ ERROR: ${m.code} stock mismatch. Expected ${expected}, got ${m.currentStock}`
      );
      return false;
    }
  }

  // Query 3: Verify stock calculation
  console.log("3️⃣ Verifying stock calculation accuracy...");

  for (const m of materials) {
    // Get initial stock from seed (before today's transactions)
    const initialStock = {
      "MAT-KAIN-001": 500,
      "MAT-KAIN-002": 0,
      "MAT-BENANG-001": 40,
      "MAT-KANCING-001": 1000,
      "MAT-RESLETING-001": 0,
      "MAT-LABEL-001": 0,
    };

    const initial = initialStock[m.code as keyof typeof initialStock];

    // Get total IN transactions for this material
    const totalIn = transactions
      .filter((t) => t.materialId === m.id)
      .reduce((sum, t) => sum + Number(t.quantity), 0);

    const calculatedStock = initial + totalIn;
    const actualStock = Number(m.currentStock);

    if (calculatedStock !== actualStock) {
      console.log(
        `❌ ERROR: ${m.code} calculation mismatch. Initial ${initial} + IN ${totalIn} = ${calculatedStock}, but actual is ${actualStock}`
      );
      return false;
    }

    console.log(
      `   ✓ ${
        m.code
      }: ${initial} + ${totalIn} = ${actualStock} ${m.unit.toLowerCase()}`
    );
  }
  console.log("");

  // Query 4: Check transaction metadata
  console.log("4️⃣ Checking transaction metadata...");

  const allHaveNotes = transactions.every((t) => t.notes && t.notes.length > 0);
  const allHaveUserId = transactions.every((t) => t.userId === gudang.id);
  const allHaveCorrectType = transactions.every((t) => t.type === "IN");

  console.log(`   ✓ All transactions have notes: ${allHaveNotes}`);
  console.log(`   ✓ All transactions by Kepala Gudang: ${allHaveUserId}`);
  console.log(`   ✓ All transactions type = IN: ${allHaveCorrectType}`);
  console.log("");

  if (!allHaveNotes || !allHaveUserId || !allHaveCorrectType) {
    console.log("❌ ERROR: Some transaction metadata is incorrect");
    return false;
  }

  // SUCCESS
  console.log("✅ SUCCESS CRITERIA MET:");
  console.log("   ✓ 6 material IN transactions created");
  console.log("   ✓ All transaction quantities correct");
  console.log("   ✓ All transaction units correct");
  console.log("   ✓ All stock levels updated correctly");
  console.log("   ✓ Stock calculations accurate");
  console.log("   ✓ Transaction metadata complete");
  console.log("\n🎉 FASE 2 VERIFICATION PASSED!\n");

  // Display expected stock for next phase
  console.log("📋 Stock Available for Fase 3 (Batch Creation):\n");
  materials.forEach((m) => {
    console.log(`   - ${m.name}: ${m.currentStock} ${m.unit.toLowerCase()}`);
  });
  console.log("");

  return true;
}

verifyFase2()
  .catch((e) => {
    console.error("❌ Verification Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
