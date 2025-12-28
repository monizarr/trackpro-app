import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:iop@localhost:5432/trackpro-db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // Hash password
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create users with different roles
  const owner = await prisma.user.upsert({
    where: { email: "owner@trackpro.com" },
    update: {},
    create: {
      email: "owner@trackpro.com",
      username: "owner",
      password: hashedPassword,
      name: "Owner TrackPro",
      role: UserRole.OWNER,
    },
  });
  console.log("✅ Created user: Owner");

  const kepalaGudang = await prisma.user.upsert({
    where: { email: "gudang@trackpro.com" },
    update: {},
    create: {
      email: "gudang@trackpro.com",
      username: "gudang",
      password: hashedPassword,
      name: "Kepala Gudang",
      role: UserRole.KEPALA_GUDANG,
    },
  });
  console.log("✅ Created user: Kepala Gudang");

  const kepalaProduksi = await prisma.user.upsert({
    where: { email: "produksi@trackpro.com" },
    update: {},
    create: {
      email: "produksi@trackpro.com",
      username: "produksi",
      password: hashedPassword,
      name: "Kepala Produksi",
      role: UserRole.KEPALA_PRODUKSI,
    },
  });
  console.log("✅ Created user: Kepala Produksi");

  const pemotong = await prisma.user.upsert({
    where: { email: "pemotong@trackpro.com" },
    update: {},
    create: {
      email: "pemotong@trackpro.com",
      username: "pemotong",
      password: hashedPassword,
      name: "Staff Pemotong",
      role: UserRole.PEMOTONG,
    },
  });
  console.log("✅ Created user: Pemotong");

  const penjahit = await prisma.user.upsert({
    where: { email: "penjahit@trackpro.com" },
    update: {},
    create: {
      email: "penjahit@trackpro.com",
      username: "penjahit",
      password: hashedPassword,
      name: "Staff Penjahit",
      role: UserRole.PENJAHIT,
    },
  });
  console.log("✅ Created user: Penjahit");

  const finishing = await prisma.user.upsert({
    where: { email: "finishing@trackpro.com" },
    update: {},
    create: {
      email: "finishing@trackpro.com",
      username: "finishing",
      password: hashedPassword,
      name: "Staff Finishing",
      role: UserRole.FINISHING,
    },
  });
  console.log("✅ Created user: Finishing");

  // Create sample materials (Bahan Baku)
  const kainKatun = await prisma.material.upsert({
    where: { code: "MAT-KAIN-001" },
    update: {},
    create: {
      code: "MAT-KAIN-001",
      name: "Kain Katun Premium",
      description: "Kain katun berkualitas tinggi untuk gamis",
      unit: "METER",
      currentStock: 500,
      minimumStock: 100,
      rollQuantity: 10,
      meterPerRoll: 50,
      price: 50000,
      purchaseOrderNumber: "PO-2025-001",
      supplier: "CV Kain Nusantara",
      purchaseDate: new Date("2025-12-01"),
      purchaseNotes: "Pembelian awal untuk stok gudang",
      createdById: owner.id,
    },
  });

  const benang = await prisma.material.upsert({
    where: { code: "MAT-BENANG-001" },
    update: {},
    create: {
      code: "MAT-BENANG-001",
      name: "Benang Jahit Premium",
      description: "Benang jahit kuat dan tahan lama",
      unit: "METER",
      currentStock: 200,
      minimumStock: 50,
      price: 15000,
      purchaseOrderNumber: "PO-2025-002",
      supplier: "PT Benang Jaya",
      purchaseDate: new Date("2025-12-02"),
      createdById: owner.id,
    },
  });

  console.log("✅ Created sample materials");

  // Create sample products
  const gamisPremium = await prisma.product.upsert({
    where: { sku: "PROD-GAMIS-001" },
    update: {},
    create: {
      sku: "PROD-GAMIS-001",
      name: "Gamis Premium Elegant",
      description: "Gamis premium dengan desain elegan dan nyaman dipakai",
      price: 350000,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
      ],
      createdById: owner.id,
    },
  });

  const gamisCasual = await prisma.product.upsert({
    where: { sku: "PROD-GAMIS-002" },
    update: {},
    create: {
      sku: "PROD-GAMIS-002",
      name: "Gamis Casual Daily",
      description: "Gamis casual untuk pemakaian sehari-hari",
      price: 250000,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
      ],
      createdById: owner.id,
    },
  });

  console.log("✅ Created sample products");

  // Link materials to products
  await prisma.productMaterial.upsert({
    where: {
      productId_materialId: {
        productId: gamisPremium.id,
        materialId: kainKatun.id,
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      materialId: kainKatun.id,
      quantity: 2.5,
      unit: "METER",
    },
  });

  await prisma.productMaterial.upsert({
    where: {
      productId_materialId: {
        productId: gamisPremium.id,
        materialId: benang.id,
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      materialId: benang.id,
      quantity: 1,
      unit: "ROLL",
    },
  });

  await prisma.productMaterial.upsert({
    where: {
      productId_materialId: {
        productId: gamisPremium.id,
        materialId: kainKatun.id,
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      materialId: kainKatun.id,
      quantity: 10,
      unit: "PIECE",
    },
  });

  console.log("✅ Linked materials to products");

  // Create sample production batch
  const today = new Date();
  const batchSku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-001`;

  const productionBatch = await prisma.productionBatch.create({
    data: {
      batchSku,
      productId: gamisPremium.id,
      targetQuantity: 100,
      status: "PENDING",
      createdById: kepalaProduksi.id,
      timeline: {
        create: {
          event: "BATCH_CREATED",
          details: "Batch produksi dibuat untuk Gamis Premium Elegant",
        },
      },
    },
  });

  console.log("✅ Created sample production batch");

  // Create material allocation request
  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: productionBatch.id,
      materialId: kainKatun.id,
      requestedQty: 250, // 2.5 meter per product * 100 products
      status: "REQUESTED",
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: productionBatch.id,
      materialId: benang.id,
      requestedQty: 100, // 1 roll per product * 100 products
      status: "REQUESTED",
    },
  });

  console.log("✅ Created material allocation requests");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📝 Test accounts created:");
  console.log("   Owner:           owner@trackpro.com / password123");
  console.log("   Kepala Gudang:   gudang@trackpro.com / password123");
  console.log("   Kepala Produksi: produksi@trackpro.com / password123");
  console.log("   Pemotong:        pemotong@trackpro.com / password123");
  console.log("   Penjahit:        penjahit@trackpro.com / password123");
  console.log("   Finishing:       finishing@trackpro.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
