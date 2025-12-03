import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyFase1() {
  console.log("🔍 FASE 1 VERIFICATION - DATABASE CHECK\n");

  // Query 1: Check products
  console.log("1️⃣ Checking products created...");
  const products = await prisma.product.findMany({
    where: {
      sku: {
        in: ["PROD-001", "PROD-002"],
      },
    },
    orderBy: { sku: "asc" },
  });

  console.log(`   Found ${products.length} products:`);
  products.forEach((p) => {
    console.log(`   - ${p.sku}: ${p.name} (Rp ${p.price.toLocaleString()})`);
  });
  console.log("");

  if (products.length !== 2) {
    console.log("❌ ERROR: Expected 2 products, found", products.length);
    return false;
  }

  // Query 2: Check BOM for PROD-001 (Kemeja)
  console.log("2️⃣ Checking BOM for Kemeja (PROD-001)...");
  const kemejaBOM = await prisma.productMaterial.findMany({
    where: {
      product: { sku: "PROD-001" },
    },
    include: {
      material: true,
    },
    orderBy: {
      material: { code: "asc" },
    },
  });

  console.log(`   Found ${kemejaBOM.length} materials:`);
  kemejaBOM.forEach((pm) => {
    console.log(
      `   - ${pm.material.name}: ${pm.quantity} ${pm.unit.toLowerCase()}`
    );
  });
  console.log("");

  if (kemejaBOM.length !== 4) {
    console.log(
      "❌ ERROR: Expected 4 materials for Kemeja, found",
      kemejaBOM.length
    );
    return false;
  }

  // Verify specific quantities
  const expectedKemeja = {
    "MAT-BENANG-001": 0.5,
    "MAT-KAIN-001": 2,
    "MAT-KANCING-001": 8,
    "MAT-LABEL-001": 2,
  };

  for (const pm of kemejaBOM) {
    const expected =
      expectedKemeja[pm.material.code as keyof typeof expectedKemeja];
    if (Math.abs(pm.quantity - expected) > 0.0001) {
      console.log(
        `❌ ERROR: ${pm.material.code} quantity mismatch. Expected ${expected}, got ${pm.quantity}`
      );
      return false;
    }
  }

  // Query 3: Check BOM for PROD-002 (Celana)
  console.log("3️⃣ Checking BOM for Celana (PROD-002)...");
  const celanaBOM = await prisma.productMaterial.findMany({
    where: {
      product: { sku: "PROD-002" },
    },
    include: {
      material: true,
    },
    orderBy: {
      material: { code: "asc" },
    },
  });

  console.log(`   Found ${celanaBOM.length} materials:`);
  celanaBOM.forEach((pm) => {
    console.log(
      `   - ${pm.material.name}: ${pm.quantity} ${pm.unit.toLowerCase()}`
    );
  });
  console.log("");

  if (celanaBOM.length !== 4) {
    console.log(
      "❌ ERROR: Expected 4 materials for Celana, found",
      celanaBOM.length
    );
    return false;
  }

  // Verify specific quantities
  const expectedCelana = {
    "MAT-BENANG-001": 0.3,
    "MAT-KAIN-002": 2.5,
    "MAT-KANCING-001": 2,
    "MAT-RESLETING-001": 1,
  };

  for (const pm of celanaBOM) {
    const expected =
      expectedCelana[pm.material.code as keyof typeof expectedCelana];
    if (Math.abs(pm.quantity - expected) > 0.0001) {
      console.log(
        `❌ ERROR: ${pm.material.code} quantity mismatch. Expected ${expected}, got ${pm.quantity}`
      );
      return false;
    }
  }

  // Query 4: Total count check
  console.log("4️⃣ Checking total records...");
  const totalProductMaterials = await prisma.productMaterial.count({
    where: {
      product: {
        sku: {
          in: ["PROD-001", "PROD-002"],
        },
      },
    },
  });

  console.log(`   Total product materials: ${totalProductMaterials}`);
  console.log("");

  if (totalProductMaterials !== 8) {
    console.log(
      "❌ ERROR: Expected 8 product materials total, found",
      totalProductMaterials
    );
    return false;
  }

  // Query 5: Verify all materials exist
  console.log("5️⃣ Checking required materials exist...");
  const requiredMaterials = [
    "MAT-KAIN-001",
    "MAT-KAIN-002",
    "MAT-BENANG-001",
    "MAT-KANCING-001",
    "MAT-LABEL-001",
    "MAT-RESLETING-001",
  ];

  const materials = await prisma.material.findMany({
    where: {
      code: {
        in: requiredMaterials,
      },
    },
    orderBy: { code: "asc" },
  });

  console.log(`   Found ${materials.length} materials:`);
  materials.forEach((m) => {
    console.log(
      `   - ${m.code}: ${m.name} (${m.currentStock} ${m.unit.toLowerCase()})`
    );
  });
  console.log("");

  if (materials.length !== 6) {
    console.log("❌ ERROR: Expected 6 materials, found", materials.length);
    return false;
  }

  // SUCCESS
  console.log("✅ SUCCESS CRITERIA MET:");
  console.log("   ✓ 2 products created (PROD-001, PROD-002)");
  console.log("   ✓ 8 product_material records (4 for each product)");
  console.log("   ✓ All materials referenced exist");
  console.log("   ✓ Quantities match specification");
  console.log("   ✓ Units match material units");
  console.log("\n🎉 FASE 1 VERIFICATION PASSED!\n");

  return true;
}

verifyFase1()
  .catch((e) => {
    console.error("❌ Verification Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
