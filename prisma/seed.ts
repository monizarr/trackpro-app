import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:iop@localhost:5432/trackpro-db-dev?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding for new workflow...");

  // Clean up existing data for fresh seeding
  await prisma.productionBatch.deleteMany({});

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create users
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

  console.log("✅ Created 7 users with different roles");

  // Create materials
  const kainKatun = await prisma.material.upsert({
    where: { code: "MAT-KAIN-001" },
    update: {},
    create: {
      code: "MAT-KAIN-001",
      name: "Kain Katun Premium",
      description: "Kain katun berkualitas tinggi",
      color: "Putih",
      unit: "METER",
      rollQuantity: 10,
      purchaseOrderNumber: "PO-2025-001",
      supplier: "CV Kain Nusantara",
      purchaseDate: new Date("2025-12-01"),
      createdById: owner.id,
    },
  });

  const kainKatunHijau = await prisma.material.upsert({
    where: { code: "MAT-KAIN-002" },
    update: {},
    create: {
      code: "MAT-KAIN-002",
      name: "Kain Katun Premium",
      description: "Kain katun berkualitas tinggi",
      color: "Hijau",
      unit: "METER",
      rollQuantity: 6,
      purchaseOrderNumber: "PO-2025-001",
      supplier: "CV Kain Nusantara",
      purchaseDate: new Date("2025-12-01"),
      createdById: owner.id,
    },
  });

  console.log("✅ Created 2 materials");

  // Create color variants
  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: { materialId: kainKatun.id, colorName: "Putih" },
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
      supplier: "PT Tekstil Jaya",
    },
  });

  await prisma.materialColorVariant.upsert({
    where: {
      materialId_colorName: { materialId: kainKatun.id, colorName: "Hitam" },
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
      supplier: "CV Kain Nusantara",
    },
  });

  console.log("✅ Created material color variants");

  // Create products
  const gamisPremium = await prisma.product.upsert({
    where: { sku: "PROD-GAMIS-001" },
    update: {},
    create: {
      sku: "PROD-GAMIS-001",
      name: "Gamis Premium Elegant",
      description: "Gamis premium dengan desain elegan",
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
      description: "Gamis casual untuk sehari-hari",
      price: 250000,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
      ],
      createdById: owner.id,
    },
  });

  console.log("✅ Created 2 products");

  // Create product color variants
  await prisma.productColorVariant.upsert({
    where: {
      productId_colorName: { productId: gamisPremium.id, colorName: "Putih" },
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
      productId_colorName: { productId: gamisPremium.id, colorName: "Hitam" },
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
      productId_colorName: { productId: gamisPremium.id, colorName: "Hijau" },
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
      productId_colorName: { productId: gamisCasual.id, colorName: "Putih" },
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
      productId_colorName: { productId: gamisCasual.id, colorName: "Navy" },
    },
    update: {},
    create: {
      productId: gamisCasual.id,
      colorName: "Navy",
      colorCode: "#000080",
    },
  });

  console.log("✅ Created product color variants");

  // ============================================================
  // BATCH 1: COMPLETED (full workflow)
  // ============================================================
  const today = new Date();
  const batch1Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-001`;

  const batch1 = await prisma.productionBatch.create({
    data: {
      batchSku: batch1Sku,
      productId: gamisPremium.id,
      totalRolls: 3,
      actualQuantity: 70,
      status: "COMPLETED",
      createdById: kepalaProduksi.id,
      completedDate: new Date(),
      timeline: {
        create: [
          { event: "BATCH_CREATED", details: "Batch dibuat - 70 pcs" },
          { event: "MATERIAL_ALLOCATED", details: "Material putih 3 roll" },
          { event: "ASSIGNED_TO_CUTTER", details: "Batch ke pemotong" },
          { event: "CUTTING_COMPLETED", details: "Pemotongan selesai" },
          { event: "CUTTING_VERIFIED", details: "Kepala Produksi verifikasi" },
          { event: "ASSIGNED_TO_SEWER", details: "Batch ke penjahit" },
          { event: "SEWING_COMPLETED", details: "Penjahitan selesai" },
          { event: "SEWING_VERIFIED", details: "Kepala Produksi verifikasi" },
          { event: "ASSIGNED_TO_FINISHING", details: "Ke finishing" },
          {
            event: "FINISHING_COMPLETED",
            details: "Finishing selesai - 65 good, 5 reject",
          },
          { event: "SUB_BATCH_SUBMITTED_TO_WAREHOUSE", details: "Ke gudang" },
          { event: "WAREHOUSE_VERIFIED", details: "Gudang verifikasi" },
          { event: "BATCH_COMPLETED", details: "Selesai" },
        ],
      },
      sizeColorRequests: {
        create: [
          { productSize: "M", color: "Putih", requestedPieces: 30 },
          { productSize: "L", color: "Putih", requestedPieces: 25 },
          { productSize: "XL", color: "Putih", requestedPieces: 15 },
        ],
      },
    },
  });

  // Material allocation
  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: batch1.id,
      materialId: kainKatun.id,
      color: "Putih",
      rollQuantity: 3,
      requestedQty: 150,
      status: "ALLOCATED",
    },
  });

  // Cutting task
  const batch1CuttingTask = await prisma.cuttingTask.create({
    data: {
      batchId: batch1.id,
      assignedToId: pemotong.id,
      materialReceived: 150,
      piecesCompleted: 70,
      status: "VERIFIED",
      notes: "Pemotongan lancar",
      completedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  // Sewing task
  const batch1SewingTask = await prisma.sewingTask.create({
    data: {
      batchId: batch1.id,
      assignedToId: penjahit.id,
      piecesReceived: 70,
      piecesCompleted: 70,
      status: "VERIFIED",
      notes: "Jahitan rapi",
      completedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  // Finishing task
  await prisma.finishingTask.create({
    data: {
      batchId: batch1.id,
      assignedToId: finishing.id,
      piecesReceived: 70,
      piecesCompleted: 70,
      rejectKotor: 2,
      rejectSobek: 1,
      rejectRusakJahit: 2,
      status: "VERIFIED",
      notes: "Finishing selesai - 65 good, 5 reject",
      completedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
      verifiedAt: new Date(),
      verifiedById: kepalaProduksi.id,
    },
  });

  // Sub-batch
  const batch1SubBatchSku = `${batch1Sku}-SUB-001`;
  const batch1SubBatch = await prisma.subBatch.create({
    data: {
      subBatchSku: batch1SubBatchSku,
      batchId: batch1.id,
      status: "COMPLETED",
      finishingGoodOutput: 65,
      rejectKotor: 2,
      rejectSobek: 1,
      rejectRusakJahit: 2,
      notes: "Finishing batch 1 - 65 good pieces",
      verifiedByProdAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
      submittedToWarehouseAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
      warehouseVerifiedAt: new Date(),
      warehouseVerifiedById: kepalaGudang.id,
      items: {
        create: [
          {
            productSize: "M",
            color: "Putih",
            goodQuantity: 28,
            rejectKotor: 1,
            rejectSobek: 1,
            rejectRusakJahit: 0,
          },
          {
            productSize: "L",
            color: "Putih",
            goodQuantity: 23,
            rejectKotor: 1,
            rejectSobek: 0,
            rejectRusakJahit: 1,
          },
          {
            productSize: "XL",
            color: "Putih",
            goodQuantity: 14,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 1,
          },
        ],
      },
    },
  });

  console.log("✅ BATCH 1: COMPLETED with full workflow");

  // ============================================================
  // BATCH 2: IN_FINISHING
  // ============================================================
  const batch2Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-002`;

  const batch2 = await prisma.productionBatch.create({
    data: {
      batchSku: batch2Sku,
      productId: gamisCasual.id,
      totalRolls: 2,
      actualQuantity: 50,
      status: "IN_FINISHING",
      createdById: kepalaProduksi.id,
      sizeColorRequests: {
        create: [
          { productSize: "M", color: "Hitam", requestedPieces: 20 },
          { productSize: "L", color: "Hitam", requestedPieces: 20 },
          { productSize: "XL", color: "Hitam", requestedPieces: 10 },
        ],
      },
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: batch2.id,
      materialId: kainKatun.id,
      color: "Hitam",
      rollQuantity: 2,
      requestedQty: 100,
      status: "ALLOCATED",
    },
  });

  await prisma.cuttingTask.create({
    data: {
      batchId: batch2.id,
      assignedToId: pemotong.id,
      materialReceived: 100,
      piecesCompleted: 50,
      status: "VERIFIED",
      completedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  await prisma.sewingTask.create({
    data: {
      batchId: batch2.id,
      assignedToId: penjahit2.id,
      piecesReceived: 50,
      piecesCompleted: 50,
      status: "VERIFIED",
      completedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  // Sub-batch at finishing (not completed yet)
  const batch2SubBatchSku = `${batch2Sku}-SUB-001`;
  await prisma.subBatch.create({
    data: {
      subBatchSku: batch2SubBatchSku,
      batchId: batch2.id,
      status: "CREATED",
      finishingGoodOutput: 0,
      notes: "Batch 2 - menunggu proses finishing",
      items: {
        create: [
          {
            productSize: "M",
            color: "Hitam",
            goodQuantity: 0,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 0,
          },
          {
            productSize: "L",
            color: "Hitam",
            goodQuantity: 0,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 0,
          },
          {
            productSize: "XL",
            color: "Hitam",
            goodQuantity: 0,
            rejectKotor: 0,
            rejectSobek: 0,
            rejectRusakJahit: 0,
          },
        ],
      },
    },
  });

  console.log("✅ BATCH 2: IN_FINISHING - waiting for finishing");

  // ============================================================
  // BATCH 3: SEWING_VERIFIED
  // ============================================================
  const batch3Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-003`;

  const batch3 = await prisma.productionBatch.create({
    data: {
      batchSku: batch3Sku,
      productId: gamisPremium.id,
      totalRolls: 2,
      actualQuantity: 50,
      status: "SEWING_VERIFIED",
      createdById: kepalaProduksi.id,
      sizeColorRequests: {
        create: [
          { productSize: "M", color: "Hijau", requestedPieces: 25 },
          { productSize: "L", color: "Hijau", requestedPieces: 15 },
          { productSize: "XL", color: "Hijau", requestedPieces: 10 },
        ],
      },
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: batch3.id,
      materialId: kainKatunHijau.id,
      color: "Hijau",
      rollQuantity: 2,
      requestedQty: 100,
      status: "ALLOCATED",
    },
  });

  await prisma.cuttingTask.create({
    data: {
      batchId: batch3.id,
      assignedToId: pemotong.id,
      materialReceived: 100,
      piecesCompleted: 50,
      status: "VERIFIED",
      completedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  await prisma.sewingTask.create({
    data: {
      batchId: batch3.id,
      assignedToId: penjahit.id,
      piecesReceived: 50,
      piecesCompleted: 50,
      status: "VERIFIED",
      completedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      verifiedById: kepalaProduksi.id,
    },
  });

  console.log("✅ BATCH 3: SEWING_VERIFIED - ready for finishing");

  // ============================================================
  // BATCH 4: ASSIGNED_TO_CUTTER (cutting in progress)
  // ============================================================
  const batch4Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-004`;

  const batch4 = await prisma.productionBatch.create({
    data: {
      batchSku: batch4Sku,
      productId: gamisCasual.id,
      totalRolls: 2,
      status: "ASSIGNED_TO_CUTTER",
      createdById: kepalaProduksi.id,
      sizeColorRequests: {
        create: [
          { productSize: "M", color: "Putih", requestedPieces: 30 },
          { productSize: "L", color: "Putih", requestedPieces: 20 },
        ],
      },
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: batch4.id,
      materialId: kainKatun.id,
      color: "Putih",
      rollQuantity: 2,
      requestedQty: 100,
      status: "ALLOCATED",
    },
  });

  await prisma.cuttingTask.create({
    data: {
      batchId: batch4.id,
      assignedToId: pemotong.id,
      materialReceived: 100,
      piecesCompleted: 25,
      status: "IN_PROGRESS",
      notes: "Pemotongan - 25 dari 50 pcs selesai",
      startedAt: new Date(today.getTime() - 6 * 60 * 60 * 1000),
    },
  });

  console.log("✅ BATCH 4: ASSIGNED_TO_CUTTER - cutting in progress");

  // ============================================================
  // BATCH 5: MATERIAL_ALLOCATED
  // ============================================================
  const batch5Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-005`;

  const batch5 = await prisma.productionBatch.create({
    data: {
      batchSku: batch5Sku,
      productId: gamisPremium.id,
      totalRolls: 3,
      status: "MATERIAL_ALLOCATED",
      createdById: kepalaProduksi.id,
      sizeColorRequests: {
        create: [
          { productSize: "S", color: "Hijau", requestedPieces: 40 },
          { productSize: "M", color: "Hijau", requestedPieces: 30 },
          { productSize: "L", color: "Hijau", requestedPieces: 20 },
        ],
      },
    },
  });

  await prisma.batchMaterialAllocation.create({
    data: {
      batchId: batch5.id,
      materialId: kainKatunHijau.id,
      color: "Hijau",
      rollQuantity: 3,
      requestedQty: 150,
      status: "ALLOCATED",
    },
  });

  console.log("✅ BATCH 5: MATERIAL_ALLOCATED - ready for cutting");

  // ============================================================
  // BATCH 6: PENDING
  // ============================================================
  const batch6Sku = `PROD-${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-006`;

  await prisma.productionBatch.create({
    data: {
      batchSku: batch6Sku,
      productId: gamisCasual.id,
      totalRolls: 0,
      status: "PENDING",
      createdById: kepalaProduksi.id,
      sizeColorRequests: {
        create: [
          { productSize: "M", color: "Navy", requestedPieces: 40 },
          { productSize: "L", color: "Navy", requestedPieces: 35 },
          { productSize: "XL", color: "Navy", requestedPieces: 25 },
        ],
      },
    },
  });

  console.log("✅ BATCH 6: PENDING - new batch");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📊 Batches created:");
  console.log("   • Batch 1: COMPLETED (full workflow with finished goods)");
  console.log("   • Batch 2: IN_FINISHING (at finishing stage)");
  console.log("   • Batch 3: SEWING_VERIFIED (ready for finishing)");
  console.log("   • Batch 4: ASSIGNED_TO_CUTTER (cutting in progress)");
  console.log("   • Batch 5: MATERIAL_ALLOCATED (ready for cutting)");
  console.log("   • Batch 6: PENDING (new batch)");
  console.log("\n📝 Test credentials:");
  console.log("   owner:        owner@trackpro.com / password123");
  console.log("   gudang:       gudang@trackpro.com / password123");
  console.log("   produksi:     produksi@trackpro.com / password123");
  console.log("   pemotong:     pemotong@trackpro.com / password123");
  console.log("   penjahit:     penjahit@trackpro.com / password123");
  console.log("   finishing:    finishing@trackpro.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
