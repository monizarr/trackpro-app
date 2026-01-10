# Material Color Variant Tracking System

## Ringkasan

Sistem tracking varian warna material untuk memastikan setiap batch produksi mencatat detail material yang digunakan (termasuk warna spesifik) dan melakukan validasi stok berdasarkan varian warna.

## Fitur Utama

### 1. Material Color Variants

Setiap material dapat memiliki multiple color variants dengan tracking stok terpisah:

```typescript
MaterialColorVariant {
  id: string
  materialId: string
  colorName: string      // Nama warna (Putih, Hitam, Hijau, dll)
  colorCode: string      // Kode hex color (#FFFFFF, #000000, dll)
  stock: number          // Stock dalam METER
  minimumStock: number   // Minimum stock dalam METER (untuk validasi)
}
```

**Contoh data:**

- Kain Katun → Putih (500m), Hitam (250m)
- Kain Katun Hijau → Hijau (300m), Hijau Tua (150m)

### 2. Batch Material Color Allocations

Setiap production batch menyimpan detail alokasi material per varian warna:

```typescript
BatchMaterialColorAllocation {
  id: string
  batchId: string
  materialColorVariantId: string  // Link ke specific color variant
  rollQuantity: number            // Jumlah roll yang dibawa
  allocatedQty: number            // Total meter (rollQuantity * meterPerRoll)
  meterPerRoll: number            // Default: 95 meter
}
```

## Workflow Create Batch

### 1. User Memilih Material dan Warna

Di `create-batch-dialog.tsx`:

- User pilih material dari daftar materials yang diperlukan produk
- Dropdown warna diisi dari API `/api/material-color-variants?materialId=xxx`
- Menampilkan stok tersedia untuk setiap warna

### 2. Input Jumlah Roll

- User input jumlah roll yang akan dibawa
- System otomatis konversi: **1 roll = 95 meter** (default)
- Contoh: 2 roll = 190 meter

### 3. Validasi Stok

**Frontend Validation:**

```typescript
// Check if required meters exceeds available stock
const requiredMeters = rollQuantity * 95;
if (requiredMeters > availableStock) {
  toast.error(
    `Stok tidak cukup. Butuh ${requiredMeters}m, tersedia ${availableStock}m`
  );
}
```

**Backend Validation (API):**

```typescript
// 1. Check stock availability
if (variant.stock < requestedQty) {
  return error("Insufficient stock");
}

// 2. Check minimum stock
if (variant.stock - requestedQty < variant.minimumStock) {
  return error("Allocation will cause stock to fall below minimum");
}
```

### 4. Update Stock

Setelah batch created, stock material color variant otomatis berkurang:

```typescript
await prisma.materialColorVariant.update({
  where: { id: materialColorVariantId },
  data: {
    stock: { decrement: allocatedQty },
  },
});
```

## API Endpoints

### GET /api/material-color-variants

Fetch color variants untuk material tertentu:

```typescript
GET /api/material-color-variants?materialId=xxx

Response:
{
  success: true,
  data: [
    {
      id: "variant-1",
      materialId: "mat-1",
      colorName: "Putih",
      colorCode: "#FFFFFF",
      stock: 500,
      minimumStock: 100
    }
  ]
}
```

### POST /api/production-batches

Create batch dengan material color allocations:

```typescript
POST /api/production-batches

Body:
{
  productId: "prod-1",
  materialColorAllocations: [
    {
      materialId: "mat-1",
      materialColorVariantId: "variant-1",
      color: "Putih",
      rollQuantity: 2,
      requestedQty: 190,  // 2 * 95
      meterPerRoll: 95
    }
  ],
  sizeColorRequests: [...]
}
```

**Proses:**

1. Validate stock availability
2. Check minimum stock threshold
3. Create batch record
4. Create BatchMaterialColorAllocation records
5. Decrement MaterialColorVariant stock
6. Return success

## Database Schema

### MaterialColorVariant Table

```sql
CREATE TABLE material_color_variants (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_code TEXT,
  stock DECIMAL(15,3) NOT NULL,      -- Stok dalam METER
  minimum_stock DECIMAL(15,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(material_id, color_name),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
```

### BatchMaterialColorAllocation Table

```sql
CREATE TABLE batch_material_color_allocations (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  material_color_variant_id TEXT NOT NULL,
  roll_quantity INTEGER NOT NULL,
  allocated_qty DECIMAL(15,3) NOT NULL,
  meter_per_roll DECIMAL(15,3) DEFAULT 95,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (material_color_variant_id) REFERENCES material_color_variants(id)
);
```

## Konversi Roll ke Meter

**Formula:**

```
Total Meter = Jumlah Roll × Meter per Roll
```

**Default:** 1 roll = 95 meter

**Contoh:**

- 2 roll = 2 × 95 = 190 meter
- 5 roll = 5 × 95 = 475 meter

**Validasi:**

```typescript
const METER_PER_ROLL = 95;

// User input: 3 roll
// Available stock: 250m
// Required: 3 × 95 = 285m
// Result: INVALID (285m > 250m available)

// User input: 2 roll
// Available stock: 250m
// Minimum stock: 50m
// Required: 2 × 95 = 190m
// Remaining: 250 - 190 = 60m
// Result: VALID (60m > 50m minimum)
```

## Test Data (Seed)

Material color variants dengan minimum stock:

```typescript
// Kain Katun - Putih
{
  colorName: "Putih",
  stock: 500,      // 500 meter tersedia
  minimumStock: 100 // Alert jika < 100 meter
}

// Kain Katun - Hitam
{
  colorName: "Hitam",
  stock: 250,
  minimumStock: 50
}

// Kain Katun Hijau - Hijau
{
  colorName: "Hijau",
  stock: 300,
  minimumStock: 80
}

// Kain Katun Hijau - Hijau Tua
{
  colorName: "Hijau Tua",
  stock: 150,
  minimumStock: 30
}
```

## Integration Points

### Frontend Components

**create-batch-dialog.tsx:**

- Fetch material color variants saat material dipilih
- Display dropdown dengan format: "Putih (Stok: 500 METER)"
- Validasi stok sebelum submit
- Set `materialColorVariantId` saat warna dipilih

### API Routes

**production-batches/route.ts:**

- Accept `materialColorAllocations` array
- Validate stock availability
- Create BatchMaterialColorAllocation records
- Update MaterialColorVariant stock

### Database Queries

**Get batch with color allocations:**

```typescript
const batch = await prisma.productionBatch.findUnique({
  where: { id: batchId },
  include: {
    materialColorAllocations: {
      include: {
        materialColorVariant: {
          include: {
            material: true,
          },
        },
      },
    },
  },
});
```

## Backward Compatibility

Sistem masih maintain `BatchMaterialAllocation` (legacy) untuk backward compatibility:

- New batches: Populate both `materialColorAllocations` AND `materialAllocations`
- Old batches: Still work with `materialAllocations` only
- Migration path: Gradually migrate old batches to use color variants

## Future Enhancements

1. **Dynamic Meter per Roll:** Allow different meter per roll values per material
2. **Stock Alerts:** Notify when stock approaches minimum threshold
3. **Restock Management:** Track when and how much to reorder
4. **Color Variant Analytics:** Report which colors are most used
5. **Batch History:** Track all batches that used specific color variant

## Testing

### Manual Test Scenario

1. Login sebagai Kepala Produksi
2. Go to "Kelola Batch Produksi"
3. Click "Buat Batch Baru"
4. Pilih produk "Gamis Premium Elegant"
5. Tambah bahan:
   - Material: Kain Katun
   - Warna: Putih (should show "Stok: 500 METER")
   - Jumlah Roll: 2
6. Klik "Buat Batch"

**Expected:**

- ✅ Validation passes (2 × 95 = 190m < 500m available)
- ✅ Batch created successfully
- ✅ Stock Putih updated: 500 - 190 = 310m
- ✅ BatchMaterialColorAllocation record created

### Test with Insufficient Stock

1. Try allocating 6 rolls of Putih (6 × 95 = 570m)
2. **Expected:** Error "Insufficient stock. Required: 570m, Available: 500m"

### Test Minimum Stock Violation

1. Allocate 5 rolls of Putih (5 × 95 = 475m)
2. Remaining: 500 - 475 = 25m
3. Minimum: 100m
4. **Expected:** Error "Allocation will cause Putih to fall below minimum stock (100m)"

## Migration Notes

**Migration:** `20260101073338_add_material_color_tracking`

**Changes:**

1. Added `minimumStock` field to `MaterialColorVariant`
2. Added `BatchMaterialColorAllocation` table
3. Added relation in `ProductionBatch`

**Run:**

```bash
npx prisma migrate dev --name add_material_color_tracking
npx prisma generate
npx prisma db seed
```
