# Multi-Select Size Implementation

## Overview

Form create batch sekarang menggunakan **Multi-Select** untuk pemilihan ukuran produk, menggantikan input manual satu per satu.

## Changes

### 1. New Component: MultiSelect

Created `components/ui/multi-select.tsx` - Custom multi-select component dengan features:

- **Dialog-based**: Click button untuk buka dialog pilihan ukuran
- **Checkbox selection**: Check/uncheck untuk pilih ukuran
- **Badge display**: Ukuran terpilih ditampilkan sebagai badge dengan X button
- **Visual feedback**: Check icon untuk item yang terpilih

### 2. Interface Changes

**Before:**

```typescript
interface SizeRequest {
  color: string;
  sizes: Array<{
    size: string;
    requestedPieces: number;
  }>;
}
```

**After:**

```typescript
interface SizeRequest {
  color: string;
  sizes: string[]; // Just array of size names
}
```

### 3. Input Jumlah Potongan Dihapus

**Alasan:**

- Jumlah potongan yang **sebenarnya** baru diketahui setelah proses pemotongan
- Pada tahap create batch, yang diperlukan hanya **request ukuran** apa saja
- Jumlah aktual akan diinput saat **konfirmasi hasil pemotongan**

**Impact pada API:**

```javascript
// Data yang dikirim ke API
{
  sizeColorRequests: [
    { productSize: "M", color: "Putih", requestedPieces: 0 },
    { productSize: "L", color: "Putih", requestedPieces: 0 },
    { productSize: "XL", color: "Putih", requestedPieces: 0 },
  ];
}
// requestedPieces set ke 0, akan diupdate saat konfirmasi
```

### 4. New UX Flow

**Step 1: Pilih Material & Warna**

```
Material: Kain Katun Premium
Warna: [Putih ▼]
Jumlah Roll: [3]
```

**Step 2: Pilih Ukuran (AUTO-GENERATED per warna)**

```
┌─ Warna: Putih ────────────────────────────┐
│ [Pilih ukuran untuk warna ini... ▼]      │
│                                            │
│ Selected: [M ×] [L ×] [XL ×]              │
│                                            │
│ Ukuran terpilih: M, L, XL                 │
└────────────────────────────────────────────┘
```

**Click button** → Dialog muncul:

```
┌─ Pilih Ukuran ────────────────┐
│                                │
│ ☑ XS                          │
│ ☑ S                           │
│ ☑ M     ✓                     │
│ ☑ L     ✓                     │
│ ☑ XL    ✓                     │
│ ☐ XXL                         │
│ ☐ XXXL                        │
│                                │
│           [Selesai]            │
└────────────────────────────────┘
```

### 5. Available Sizes

Predefined sizes dalam MultiSelect:

- XS
- S
- M
- L
- XL
- XXL
- XXXL

Easy to extend jika perlu size custom.

## Component Usage

```tsx
<MultiSelect
  options={["XS", "S", "M", "L", "XL", "XXL", "XXXL"]}
  selected={req.sizes}
  onChange={(sizes) => updateSizesForColor(req.color, sizes)}
  placeholder="Pilih ukuran untuk warna ini..."
/>
```

## Benefits

### 1. Faster Input

✅ Select multiple sizes dengan beberapa click
✅ Tidak perlu "Tambah Ukuran" berkali-kali
✅ Visual yang clear: badge untuk setiap ukuran terpilih

### 2. Better UX

✅ Dialog terpisah = fokus saat memilih
✅ Checkbox = clear indication apa yang terpilih
✅ Badge dengan X = easy remove individual size

### 3. Realistic Workflow

✅ Request dulu ukuran apa saja
✅ Jumlah aktual diinput saat hasil potong sudah jelas
✅ Sesuai dengan proses produksi real

### 4. Less Errors

✅ Standardized sizes (XS-XXXL)
✅ Tidak ada typo ukuran
✅ Validasi lebih simple: cukup cek array tidak kosong

## Validation

**Simple validation:**

```typescript
const invalidRequest = sizeRequests.find((req) => req.sizes.length === 0);
if (invalidRequest) {
  toast.error("Error", "Setiap warna harus memiliki minimal 1 ukuran");
}
```

## Example Data Flow

### Input

User pilih:

- Warna Putih: M, L, XL
- Warna Hijau: L, XL

### State

```json
{
  "sizeRequests": [
    { "color": "Putih", "sizes": ["M", "L", "XL"] },
    { "color": "Hijau", "sizes": ["L", "XL"] }
  ]
}
```

### API Payload (Flattened)

```json
{
  "sizeColorRequests": [
    { "productSize": "M", "color": "Putih", "requestedPieces": 0 },
    { "productSize": "L", "color": "Putih", "requestedPieces": 0 },
    { "productSize": "XL", "color": "Putih", "requestedPieces": 0 },
    { "productSize": "L", "color": "Hijau", "requestedPieces": 0 },
    { "productSize": "XL", "color": "Hijau", "requestedPieces": 0 }
  ]
}
```

## When to Fill requestedPieces?

**Later in the workflow:**

1. Pemotong melakukan pemotongan
2. Pemotong atau Kepala Produksi input hasil aktual:
   - Putih M: 30 pcs
   - Putih L: 25 pcs
   - Putih XL: 15 pcs
   - etc.
3. Data updated via `CuttingResult` model

## Files Changed

- `components/ui/multi-select.tsx` - NEW
- `components/create-batch-dialog.tsx` - Updated

## Testing

- [x] Multi-select dialog bisa dibuka
- [x] Checkbox bisa dipilih multiple
- [x] Badge muncul untuk setiap size terpilih
- [x] X pada badge bisa remove size
- [x] Auto-sync dengan material colors
- [x] Validation works (minimal 1 size)
- [x] API payload correct (requestedPieces: 0)

## Future Enhancements

1. **Custom sizes**: Allow user add custom size selain XS-XXXL
2. **Size templates**: Save frequently used size combinations
3. **Bulk operations**: "Select all sizes" button
4. **Size validation**: Warn if unusual size combination (e.g., only XXXL)
