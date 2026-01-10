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

  const penjahit2 = await prisma.user.upsert({
    where: { email: "penjahit2@trackpro.com" },
    update: {},
    create: {
      email: "penjahit2@trackpro.com",
      username: "penjahit2",
      password: hashedPassword,
      name: "Staff Penjahit 2",
      role: UserRole.PENJAHIT,
    },
  });
  console.log("✅ Created user: Penjahit 2");

  const penjahit3 = await prisma.user.upsert({
    where: { email: "penjahit3@trackpro.com" },
    update: {},
    create: {
      email: "penjahit3@trackpro.com",
      username: "penjahit3",
      password: hashedPassword,
      name: "Staff Penjahit 3",
      role: UserRole.PENJAHIT,
    },
  });
  console.log("✅ Created user: Penjahit 3");

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

  const finishing2 = await prisma.user.upsert({
    where: { email: "finishing2@trackpro.com" },
    update: {},
    create: {
      email: "finishing2@trackpro.com",
      username: "finishing2",
      password: hashedPassword,
      name: "Staff Finishing 2",
      role: UserRole.FINISHING,
    },
  });
  console.log("✅ Created user: Finishing 2");

  const finishing3 = await prisma.user.upsert({
    where: { email: "finishing3@trackpro.com" },
    update: {},
    create: {
      email: "finishing3@trackpro.com",
      username: "finishing3",
      password: hashedPassword,
      name: "Staff Finishing 3",
      role: UserRole.FINISHING,
    },
  });
  console.log("✅ Created user: Finishing 3");

  // Create sample materials (Bahan Baku)
  const kainKatun = await prisma.material.upsert({
    where: { code: "MAT-KAIN-001" },
    update: {},
    create: {
      code: "MAT-KAIN-001",
      name: "Kain Katun Premium",
      description: "Kain katun berkualitas tinggi untuk gamis",
      color: "Putih",
      unit: "METER",
      rollQuantity: 10,
      purchaseOrderNumber: "PO-2025-001",
      supplier: "CV Kain Nusantara",
      purchaseDate: new Date("2025-12-01"),
      purchaseNotes: "Pembelian awal untuk stok gudang",
      createdById: owner.id,
    },
  });

  const kainKatunHijau = await prisma.material.upsert({
    where: { code: "MAT-KAIN-002" },
    update: {},
    create: {
      code: "MAT-KAIN-002",
      name: "Kain Katun Premium",
      description: "Kain katun berkualitas tinggi untuk gamis",
      color: "Hijau",
      unit: "METER",
      rollQuantity: 6,
      purchaseOrderNumber: "PO-2025-001",
      supplier: "CV Kain Nusantara",
      purchaseDate: new Date("2025-12-01"),
      purchaseNotes: "Pembelian awal untuk stok gudang",
      createdById: owner.id,
    },
  });

  // Create material color variants
  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: {
        materialId: kainKatun.id,
        colorName: "Putih",
      },
    },
    update: {},
    create: {
      materialId: kainKatun.id,
      colorName: "Putih",
      colorCode: "#FFFFFF",
      stock: 500,
      minimumStock: 100,
      price: 35000,
      rollQuantity: 10,
      meterPerRoll: 50,
      purchaseOrderNumber: "PO-2026-001",
      purchaseDate: new Date("2026-01-01"),
      purchaseNotes: "Kain katun putih premium dari supplier utama",
      supplier: "PT Tekstil Jaya",
    },
  });

  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: {
        materialId: kainKatun.id,
        colorName: "Hitam",
      },
    },
    update: {},
    create: {
      materialId: kainKatun.id,
      colorName: "Hitam",
      colorCode: "#000000",
      stock: 250,
      minimumStock: 50,
      price: 38000,
      rollQuantity: 5,
      meterPerRoll: 50,
      purchaseOrderNumber: "PO-2026-002",
      purchaseDate: new Date("2026-01-01"),
      purchaseNotes: "Kain katun hitam berkualitas tinggi",
      supplier: "PT Tekstil Jaya",
    },
  });

  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: {
        materialId: kainKatunHijau.id,
        colorName: "Hijau",
      },
    },
    update: {},
    create: {
      materialId: kainKatunHijau.id,
      colorName: "Hijau",
      colorCode: "#008000",
      stock: 300,
      minimumStock: 80,
      price: 42000,
      rollQuantity: 6,
      meterPerRoll: 50,
      purchaseOrderNumber: "PO-2026-003",
      purchaseDate: new Date("2025-12-28"),
      purchaseNotes: "Kain katun hijau segar",
      supplier: "CV Kain Nusantara",
    },
  });

  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: {
        materialId: kainKatunHijau.id,
        colorName: "Hijau Tua",
      },
    },
    update: {},
    create: {
      materialId: kainKatunHijau.id,
      colorName: "Hijau Tua",
      colorCode: "#006400",
      stock: 150,
      minimumStock: 30,
      price: 40000,
      rollQuantity: 3,
      meterPerRoll: 50,
      purchaseOrderNumber: "PO-2026-004",
      purchaseDate: new Date("2025-12-28"),
      purchaseNotes: "Kain katun hijau tua elegant",
      supplier: "CV Kain Nusantara",
    },
  });

  console.log("✅ Created material color variants");

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

  // Create product color variants
  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: {
        productId: gamisPremium.id,
        colorName: "Putih",
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      colorName: "Putih",
      colorCode: "#FFFFFF",
    },
  });

  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: {
        productId: gamisPremium.id,
        colorName: "Hitam",
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      colorName: "Hitam",
      colorCode: "#000000",
    },
  });

  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: {
        productId: gamisPremium.id,
        colorName: "Hijau",
      },
    },
    update: {},
    create: {
      productId: gamisPremium.id,
      colorName: "Hijau",
      colorCode: "#008000",
    },
  });

  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: {
        productId: gamisCasual.id,
        colorName: "Putih",
      },
    },
    update: {},
    create: {
      productId: gamisCasual.id,
      colorName: "Putih",
      colorCode: "#FFFFFF",
    },
  });

  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: {
        productId: gamisCasual.id,
        colorName: "Navy",
      },
    },
    update: {},
    create: {
      productId: gamisCasual.id,
      colorName: "Navy",
      colorCode: "#000080",
    },
  });

  console.log("✅ Created product color variants");

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

  // Create sample production batch dengan alur baru
  const today = new Date();
  const batchSku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-001`;

  const productionBatch = await prisma.productionBatch.create({
    data: {
      batchSku,
      productId: gamisPremium.id,
      totalRolls: 5, // 3 roll putih + 2 roll hijau = 5 roll total
      status: "PENDING",
      createdById: kepalaProduksi.id,
      timeline: {
        create: {
          event: "BATCH_CREATED",
          details: "Batch produksi dibuat untuk Gamis Premium Elegant",
        },
      },
      // Request ukuran dan warna
      sizeColorRequests: {
        create: [
          {
            productSize: "M",
            color: "Putih",
            requestedPieces: 30,
          },
          {
            productSize: "L",
            color: "Putih",
            requestedPieces: 25,
          },
          {
            productSize: "XL",
            color: "Hijau",
            requestedPieces: 15,
          },
        ],
      },
    },
  });

  console.log("✅ Created sample production batch with size/color requests");

  // Create material allocation dengan warna
  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: productionBatch.id,
      materialId: kainKatun.id,
      color: "Putih",
      rollQuantity: 3,
      requestedQty: 150, // 3 roll * 50 meter per roll
      status: "REQUESTED",
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: productionBatch.id,
      materialId: kainKatunHijau.id,
      color: "Hijau",
      rollQuantity: 2,
      requestedQty: 100, // 2 roll * 50 meter per roll
      status: "REQUESTED",
    },
  });

  console.log("✅ Created material allocation requests with colors");

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
