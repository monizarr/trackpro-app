import "dotenv/config";
import { prisma } from "../lib/prisma";

async function checkDatabase() {
  console.log("🔍 Checking Database...\n");

  // Check users
  console.log("===== USERS =====");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
  console.log(`Found ${users.length} users:`);
  users.forEach((user) => {
    console.log(
      `  - ${user.username} (${user.role}) - Active: ${user.isActive}`
    );
    console.log(`    ID: ${user.id}`);
  });

  // Check materials
  console.log("\n===== MATERIALS =====");
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      _count: {
        select: { colorVariants: true },
      },
    },
  });
  console.log(`Found ${materials.length} materials:`);
  materials.forEach((material) => {
    console.log(`  - ${material.code} - ${material.name}`);
    console.log(`    Color variants: ${material._count.colorVariants}`);
  });

  // Check material color variants
  console.log("\n===== MATERIAL COLOR VARIANTS =====");
  const variants = await prisma.materialColorVariant.findMany({
    select: {
      id: true,
      material: { select: { code: true, name: true } },
      colorName: true,
      stock: true,
      minimumStock: true,
    },
  });
  console.log(`Found ${variants.length} color variants:`);
  variants.forEach((variant) => {
    console.log(
      `  - ${variant.material.name} - ${variant.colorName}: ${variant.stock} (min: ${variant.minimumStock})`
    );
  });

  // Check products
  console.log("\n===== PRODUCTS =====");
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      isDeleted: true,
      _count: {
        select: { colorVariants: true },
      },
    },
  });
  console.log(`Found ${products.length} products:`);
  products.forEach((product) => {
    console.log(`  - ${product.sku} - ${product.name}`);
    console.log(
      `    Status: ${product.status}, Deleted: ${product.isDeleted}, Variants: ${product._count.colorVariants}`
    );
  });

  // Check production batches
  console.log("\n===== PRODUCTION BATCHES =====");
  const batches = await prisma.productionBatch.findMany({
    select: {
      id: true,
      batchSku: true,
      status: true,
      product: { select: { name: true } },
      createdBy: { select: { username: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${batches.length} recent batches:`);
  batches.forEach((batch) => {
    console.log(`  - ${batch.batchSku} (${batch.status})`);
    console.log(
      `    Product: ${batch.product.name}, Created by: ${batch.createdBy.username}`
    );
  });

  await prisma.$disconnect();
}

checkDatabase().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
