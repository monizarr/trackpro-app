# Color Variant System - Implementation Guide

## Overview

Sistem varian warna untuk material dan produk telah diimplementasikan untuk menggantikan input manual warna dengan dropdown yang mengambil data dari database.

## Database Schema

### Material Color Variants

```prisma
model MaterialColorVariant {
  id          String   @id @default(cuid())
  materialId  String
  colorName   String   // Nama warna (Putih, Hitam, Merah, dll)
  colorCode   String?  // Kode warna (hex color atau custom code)
  stock       Decimal  @db.Decimal(15, 3) // Stock untuk warna ini
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  material Material @relation(fields: [materialId], references: [id], onDelete: Cascade)

  @@unique([materialId, colorName])
  @@index([materialId])
  @@index([colorName])
  @@map("material_color_variants")
}
```

### Product Color Variants

```prisma
model ProductColorVariant {
  id          String   @id @default(cuid())
  productId   String
  colorName   String   // Nama warna produk (Putih, Hitam, Merah, dll)
  colorCode   String?  // Kode warna (hex color atau custom code)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, colorName])
  @@index([productId])
  @@index([colorName])
  @@map("product_color_variants")
}
```

## API Endpoints

### Material Color Variants

#### GET `/api/material-color-variants`

Get list of material color variants

- Query params: `materialId` (optional) - Filter by material ID
- Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "materialId": "...",
      "colorName": "Putih",
      "colorCode": "#FFFFFF",
      "stock": 500,
      "isActive": true,
      "material": {
        "id": "...",
        "name": "Kain Katun Premium",
        "code": "MAT-KAIN-001",
        "unit": "METER"
      }
    }
  ]
}
```

#### POST `/api/material-color-variants`

Create new material color variant

- Required roles: OWNER, KEPALA_GUDANG
- Body:

```json
{
  "materialId": "...",
  "colorName": "Putih",
  "colorCode": "#FFFFFF",
  "stock": 500
}
```

### Product Color Variants

#### GET `/api/product-variants`

Get list of product color variants

- Query params: `productId` (optional) - Filter by product ID
- Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "productId": "...",
      "colorName": "Putih",
      "colorCode": "#FFFFFF",
      "isActive": true,
      "product": {
        "id": "...",
        "name": "Gamis Premium Elegant",
        "sku": "PROD-GAMIS-001"
      }
    }
  ]
}
```

#### POST `/api/product-variants`

Create new product color variant

- Required roles: OWNER, KEPALA_PRODUKSI
- Body:

```json
{
  "productId": "...",
  "colorName": "Putih",
  "colorCode": "#FFFFFF"
}
```

## Usage in Create Batch Dialog

Dialog `create-batch-dialog.tsx` sekarang:

1. **Material Color Selection**: Ketika memilih material, dropdown warna akan diisi otomatis dengan varian warna yang tersedia untuk material tersebut

   - Menampilkan nama warna dan stock yang tersedia
   - Hanya menampilkan warna yang `isActive: true`

2. **Product Color Selection**: Ketika memilih produk, dropdown warna untuk request ukuran & warna akan diisi dengan varian warna produk
   - Menampilkan nama warna yang tersedia untuk produk
   - Hanya menampilkan warna yang `isActive: true`

## Sample Data (Seed)

Sample data sudah ditambahkan di `prisma/seed.ts`:

### Material Color Variants

- Kain Katun Premium: Putih, Hitam
- Kain Katun Premium (Hijau): Hijau, Hijau Tua

### Product Color Variants

- Gamis Premium Elegant: Putih, Hitam, Hijau
- Gamis Casual Daily: Putih, Navy

## Migration

Migration sudah dibuat: `20260101054301_add_color_variants`

Untuk apply:

```bash
npx prisma migrate dev
npx prisma generate
npx tsx prisma/seed.ts
```

## Benefits

1. **Konsistensi Data**: Warna yang digunakan konsisten karena berasal dari sumber yang sama
2. **Validasi**: Hanya warna yang tersedia yang bisa dipilih
3. **Tracking Stock**: Stock per warna material dapat di-track dengan lebih akurat
4. **User Experience**: Lebih mudah memilih warna dari dropdown daripada mengetik manual
5. **Reporting**: Memudahkan analisis data berdasarkan warna produk/material

## Future Enhancements

1. **UI untuk Manage Color Variants**: Tambahkan halaman admin untuk CRUD varian warna
2. **Color Picker**: Tambahkan color picker untuk memilih `colorCode`
3. **Stock Integration**: Update stock varian warna otomatis saat material transaction
4. **Image Preview**: Tambahkan preview gambar untuk setiap varian warna
5. **Default Colors**: Sistem untuk set default colors per kategori produk/material
