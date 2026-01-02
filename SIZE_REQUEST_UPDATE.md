# Update: Form Request Ukuran (Jan 1, 2026)

## Perubahan Workflow Create Batch

### Sebelumnya

Form terpisah untuk "Request Ukuran & Warna" di mana user harus:

- Input ukuran (S/M/L/XL)
- Pilih warna dari dropdown produk
- Input jumlah potongan
- Setiap kombinasi ukuran-warna memerlukan entry terpisah

**Masalah:**

- Warna di request bisa berbeda dengan warna material yang dipilih
- User harus input warna berkali-kali untuk ukuran berbeda
- Tidak ada korelasi langsung antara bahan baku dengan request produksi

### Sekarang

Form "Request Ukuran" yang otomatis sync dengan warna material:

1. **User memilih material & warna di bagian Bahan Baku**

   - Material: Kain Katun Premium
   - Warna: Putih (dari dropdown varian warna material)
   - Jumlah Roll: 3

2. **Sistem otomatis membuat section Request Ukuran untuk warna tersebut**

   - Section "Warna: Putih" muncul otomatis
   - User bisa tambah multiple ukuran:
     - M: 30 pcs
     - L: 25 pcs
     - XL: 15 pcs

3. **Auto Sync**
   - Jika user tambah warna baru di bahan baku (misal: Hijau), section baru "Warna: Hijau" muncul
   - Jika user hapus warna material, section request ukuran untuk warna itu juga hilang
   - Tidak mungkin request ukuran untuk warna yang tidak ada di bahan baku

## Code Changes

### Interface Changes

**Sebelum:**

```typescript
interface SizeColorRequest {
  productSize: string;
  color: string;
  requestedPieces: number;
}
```

**Sekarang:**

```typescript
interface SizeRequest {
  color: string; // Dari material allocation
  sizes: Array<{
    size: string;
    requestedPieces: number;
  }>;
}
```

### State Management

Ditambahkan `useEffect` untuk auto-sync:

```typescript
useEffect(() => {
  const selectedColors = materialAllocations
    .filter((alloc) => alloc.color)
    .map((alloc) => alloc.color);

  setSizeRequests((prev) => {
    const filtered = prev.filter((req) => selectedColors.includes(req.color));

    const existingColors = filtered.map((req) => req.color);
    const newColors = selectedColors.filter(
      (color) => !existingColors.includes(color)
    );

    const newRequests = newColors.map((color) => ({
      color,
      sizes: [{ size: "", requestedPieces: 0 }],
    }));

    return [...filtered, ...newRequests];
  });
}, [materialAllocations.map((alloc) => alloc.color).join(",")]);
```

### UI Structure

**Sekarang:**

```
┌─ Bahan Baku yang Dibawa ─────────────┐
│ Material: Kain Katun                 │
│ Warna: [Putih ▼] (Stok: 500 METER)  │
│ Jumlah Roll: [3]                     │
└──────────────────────────────────────┘

┌─ Request Ukuran (Warna: Putih) ──────┐
│ [+ Tambah Ukuran]                    │
│                                       │
│ Ukuran: [M]  Jumlah: [30]  [🗑]      │
│ Ukuran: [L]  Jumlah: [25]  [🗑]      │
│ Ukuran: [XL] Jumlah: [15]  [🗑]      │
│                                       │
│ Subtotal Putih: 70 pcs               │
└──────────────────────────────────────┘

Total Potongan: 70 pcs
```

## Benefits

### 1. Data Consistency

✅ Warna di request **selalu sama** dengan warna material yang dipilih
✅ Tidak mungkin terjadi mismatch antara warna bahan dengan warna produk

### 2. Better UX

✅ User tidak perlu input warna berulang-ulang
✅ Clear visual grouping: ukuran dikelompokkan per warna
✅ Auto-sync mengurangi manual work

### 3. Business Logic Clarity

✅ Jelas bahwa ukuran adalah breakdown dari bahan baku
✅ Satu warna bahan → multiple ukuran (lebih realistic)
✅ Memudahkan tracking: berapa meter bahan untuk berapa pcs produk

### 4. Scalability

✅ Mudah untuk menambahkan validasi (misal: total pcs vs estimasi dari meter)
✅ Mudah untuk add forecast: "3 roll @ 50m = 150m → estimasi 60 pcs"
✅ Foundation untuk fitur waste calculation

## Example Flow

### Skenario: Buat batch Gamis dengan 2 warna

**Step 1: Pilih Product**

- Produk: Gamis Premium Elegant

**Step 2: Tambah Bahan Baku**

- Bahan #1:
  - Material: Kain Katun Premium
  - Warna: Putih ✅ (Stok: 500 METER)
  - Jumlah Roll: 3
- Bahan #2:
  - Material: Kain Katun Premium
  - Warna: Hijau ✅ (Stok: 300 METER)
  - Jumlah Roll: 2

**Step 3: Request Ukuran (AUTO-GENERATED)**

Section "Warna: Putih" muncul otomatis:

- M: 30 pcs
- L: 25 pcs
- XL: 15 pcs
- Subtotal: 70 pcs

Section "Warna: Hijau" muncul otomatis:

- L: 20 pcs
- XL: 10 pcs
- Subtotal: 30 pcs

**Total: 100 pcs**

**Step 4: Submit**
Data yang dikirim ke API (di-flatten):

```json
{
  "materialAllocations": [
    {
      "materialId": "...",
      "color": "Putih",
      "rollQuantity": 3,
      "requestedQty": 150
    },
    {
      "materialId": "...",
      "color": "Hijau",
      "rollQuantity": 2,
      "requestedQty": 100
    }
  ],
  "sizeColorRequests": [
    { "productSize": "M", "color": "Putih", "requestedPieces": 30 },
    { "productSize": "L", "color": "Putih", "requestedPieces": 25 },
    { "productSize": "XL", "color": "Putih", "requestedPieces": 15 },
    { "productSize": "L", "color": "Hijau", "requestedPieces": 20 },
    { "productSize": "XL", "color": "Hijau", "requestedPieces": 10 }
  ]
}
```

## API Compatibility

✅ Backend API **tidak perlu diubah**
✅ Data tetap dalam format `BatchSizeColorRequest[]`
✅ Frontend hanya mengubah cara user input data

## Testing Checklist

- [x] Add material → section request ukuran muncul
- [x] Remove material → section request ukuran hilang
- [x] Change material color → section update otomatis
- [x] Add multiple sizes to one color
- [x] Remove size from request
- [x] Validation: size & pieces required
- [x] Total calculation correct
- [x] Data flattening correct before API call

## Migration Notes

Tidak ada database migration diperlukan. Hanya perubahan frontend di `create-batch-dialog.tsx`.

File yang diubah:

- `components/create-batch-dialog.tsx`
- `COLOR_VARIANT_SYSTEM.md` (dokumentasi)
