import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://zar:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createProducts() {
  console.log("🎯 FASE 1: OWNER - SETUP MASTER DATA\n");

  // Get Owner user
  const owner = await prisma.user.findFirst({
    where: { username: "owner" },
  });

  if (!owner) {
    throw new Error("Owner user not found. Please run seed first.");
  }

  console.log("✅ Owner user found:", owner.name);

  // Get all materials
  const kainKatun = await prisma.material.findFirst({
    where: { code: "MAT-KAIN-001" },
  });
  const benang = await prisma.material.findFirst({
    where: { code: "MAT-BENANG-001" },
  });
  const kancing = await prisma.material.findFirst({
    where: { code: "MAT-KANCING-001" },
  });
  const label = await prisma.material.findFirst({
    where: { code: "MAT-LABEL-001" },
  });
  const kainDrill = await prisma.material.findFirst({
    where: { code: "MAT-KAIN-002" },
  });
  const resleting = await prisma.material.findFirst({
    where: { code: "MAT-RESLETING-001" },
  });

  if (!kainKatun || !benang || !kancing || !label || !kainDrill || !resleting) {
    throw new Error("Some materials not found. Please run seed first.");
  }

  console.log("✅ All required materials found\n");

  // Step 1.2: Create Product 1 - Kemeja Formal
  console.log("📦 Creating Product 1: Kemeja Formal Lengan Panjang");

  const kemeja = await prisma.product.create({
    data: {
      sku: "PROD-001",
      name: "Kemeja Formal Lengan Panjang",
      description: "Kemeja formal untuk pria",
      price: 250000,
      status: "ACTIVE",
      createdById: owner.id,
      materials: {
        create: [
          {
            materialId: kainKatun.id,
            quantity: 2,
            unit: "METER",
          },
          {
            materialId: benang.id,
            quantity: 0.5,
            unit: "ROLL",
          },
          {
            materialId: kancing.id,
            quantity: 8,
            unit: "PIECE",
          },
          {
            materialId: label.id,
            quantity: 2,
            unit: "PIECE",
          },
        ],
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

  console.log("✅ Product created:");
  console.log(`   SKU: ${kemeja.sku}`);
  console.log(`   Name: ${kemeja.name}`);
  console.log(`   Price: Rp ${kemeja.price.toLocaleString()}`);
  console.log(`   Materials (BOM):`);
  kemeja.materials.forEach((pm) => {
    console.log(
      `     - ${pm.material.name}: ${pm.quantity} ${pm.unit.toLowerCase()}`
    );
  });
  console.log("");

  // Step 1.3: Create Product 2 - Celana Panjang
  console.log("📦 Creating Product 2: Celana Panjang Formal");

  const celana = await prisma.product.create({
    data: {
      sku: "PROD-002",
      name: "Celana Panjang Formal",
      description: "Celana formal untuk pria",
      price: 300000,
      status: "ACTIVE",
      createdById: owner.id,
      materials: {
        create: [
          {
            materialId: kainDrill.id,
            quantity: 2.5,
            unit: "METER",
          },
          {
            materialId: benang.id,
            quantity: 0.3,
            unit: "ROLL",
          },
          {
            materialId: resleting.id,
            quantity: 1,
            unit: "PIECE",
          },
          {
            materialId: kancing.id,
            quantity: 2,
            unit: "PIECE",
          },
        ],
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

  console.log("✅ Product created:");
  console.log(`   SKU: ${celana.sku}`);
  console.log(`   Name: ${celana.name}`);
  console.log(`   Price: Rp ${celana.price.toLocaleString()}`);
  console.log(`   Materials (BOM):`);
  celana.materials.forEach((pm) => {
    console.log(
      `     - ${pm.material.name}: ${pm.quantity} ${pm.unit.toLowerCase()}`
    );
  });
  console.log("");

  // Verification
  console.log("✅ VERIFICATION: Database Check\n");

  const productCount = await prisma.product.count({
    where: {
      sku: {
        in: ["PROD-001", "PROD-002"],
      },
    },
  });

  const productMaterialCount = await prisma.productMaterial.count({
    where: {
      productId: {
        in: [kemeja.id, celana.id],
      },
    },
  });

  console.log(`   ✓ Products created: ${productCount}/2`);
  console.log(`   ✓ Product materials created: ${productMaterialCount}/8`);

  if (productCount === 2 && productMaterialCount === 8) {
    console.log("\n🎉 FASE 1 COMPLETED SUCCESSFULLY!\n");
  } else {
    console.log("\n⚠️ Warning: Some data may be missing\n");
  }

  return { kemeja, celana };
}

createProducts()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
