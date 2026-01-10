# Dokumentasi Perubahan Alur Produksi TrackPro

## Tanggal: 30 Desember 2025

## Ringkasan Perubahan

Sistem TrackPro telah diperbarui dengan alur produksi baru yang lebih detail dan sesuai dengan praktik produksi garmen yang sebenarnya.

---

## 1. Perubahan Database Schema

### 1.1 Material (Bahan Baku)

**Perubahan:**

- ✅ Ditambahkan field `color` untuk mencatat warna bahan baku
- ✅ Index ditambahkan pada field `color` untuk performa query

**Alasan:**
Setiap bahan baku memiliki warna spesifik (Putih, Hijau, Hitam, dll) yang perlu dicatat untuk tracking produksi.

### 1.2 ProductionBatch

**Perubahan:**

- ❌ **Dihapus**: `targetQuantity` - tidak lagi menggunakan target pieces
- ✅ **Ditambah**: `totalRolls` - total roll bahan baku yang dibawa
- ✅ **Relasi baru**: `sizeColorRequests` - request ukuran dan warna
- ✅ **Relasi baru**: `cuttingResults` - hasil pemotongan aktual

**Alasan:**
Dalam praktik produksi, kepala produksi tidak menentukan target pieces terlebih dahulu, tetapi membawa sejumlah roll bahan baku ke pemotong, dan dari roll tersebut akan terealisasi menjadi sejumlah pieces.

### 1.3 BatchMaterialAllocation

**Perubahan:**

- ✅ **Ditambah**: `color` - warna material yang diminta
- ✅ **Ditambah**: `rollQuantity` - jumlah roll yang dibawa

**Contoh:**

```
Batch #1:
- Kain Katun Putih: 3 roll × 50 meter = 150 meter
- Kain Katun Hijau: 2 roll × 50 meter = 100 meter
Total: 5 roll
```

### 1.4 Model Baru: BatchSizeColorRequest

**Tujuan:** Mencatat permintaan ukuran dan warna dari kepala produksi ke pemotong

**Fields:**

- `productSize` - Ukuran produk (S, M, L, XL, XXL)
- `color` - Warna yang diminta
- `requestedPieces` - Jumlah potongan yang diminta

**Contoh:**

```
Request untuk Batch #1:
- Ukuran M, Putih: 30 pcs
- Ukuran L, Putih: 25 pcs
- Ukuran XL, Hijau: 15 pcs
Total request: 70 pcs
```

### 1.5 Model Baru: CuttingResult

**Tujuan:** Mencatat hasil pemotongan aktual dari pemotong

**Fields:**

- `productSize` - Ukuran hasil potong
- `color` - Warna hasil potong
- `actualPieces` - Jumlah potongan yang terealisasi
- `isConfirmed` - Status konfirmasi
- `confirmedById` - ID user yang konfirmasi
- `confirmedAt` - Waktu konfirmasi

**Contoh:**

```
Hasil Pemotongan Batch #1 (dari 5 roll):
- Ukuran M, Putih: 28 pcs (request: 30)
- Ukuran L, Putih: 26 pcs (request: 25)
- Ukuran XL, Hijau: 14 pcs (request: 15)
Total hasil: 68 pcs (dari request 70 pcs)
```

---

## 2. Alur Produksi Baru

### Skenario Contoh:

Kepala Produksi ingin membuat gamis:

- Ukuran M Putih
- Ukuran L Putih
- Ukuran XL Hijau

### Langkah-langkah:

#### Step 1: Kepala Produksi Membuat Batch

Kepala produksi membawa bahan baku:

- **3 roll** Kain Katun Putih (untuk M dan L)
- **2 roll** Kain Katun Hijau (untuk XL)
- **Total: 5 roll**

Request ukuran/warna:

- M Putih: 30 pcs
- L Putih: 25 pcs
- XL Hijau: 15 pcs

#### Step 2: Pemotong Melakukan Pemotongan

Pemotong menerima 5 roll dan memotong sesuai request.

**Dua Opsi Input:**

**Opsi A - Pemotong yang input:**

1. Pemotong melakukan pemotongan
2. Pemotong input hasil di sistem:
   - M Putih: 28 pcs
   - L Putih: 26 pcs
   - XL Hijau: 14 pcs
3. Status: `isConfirmed = false` (menunggu konfirmasi)

**Opsi B - Kepala Produksi yang input:**

1. Kepala produksi menghitung hasil potongan
2. Kepala produksi input langsung di sistem
3. Status: `isConfirmed = true` (auto-confirmed)

#### Step 3: Konfirmasi Kepala Produksi

Jika opsi A (pemotong yang input):

- Kepala produksi review hasil
- Kepala produksi konfirmasi hasil pemotongan
- Status berubah: `isConfirmed = true`

Jika opsi B (kepala produksi yang input):

- Langkah ini skip (sudah auto-confirmed)

---

## 3. Perubahan API

### 3.1 POST /api/production-batches

**Request Body Baru:**

```json
{
  "productId": "xxx",
  "notes": "...",
  "materialAllocations": [
    {
      "materialId": "yyy",
      "color": "Putih",
      "rollQuantity": 3,
      "requestedQty": 150
    },
    {
      "materialId": "yyy",
      "color": "Hijau",
      "rollQuantity": 2,
      "requestedQty": 100
    }
  ],
  "sizeColorRequests": [
    {
      "productSize": "M",
      "color": "Putih",
      "requestedPieces": 30
    },
    {
      "productSize": "L",
      "color": "Putih",
      "requestedPieces": 25
    },
    {
      "productSize": "XL",
      "color": "Hijau",
      "requestedPieces": 15
    }
  ]
}
```

**Perubahan dari sebelumnya:**

- ❌ Tidak ada lagi `targetQuantity`
- ✅ Material allocation include `color` dan `rollQuantity`
- ✅ Ditambahkan `sizeColorRequests`

### 3.2 GET /api/production-batches

**Response Include:**

- `sizeColorRequests[]` - Request ukuran/warna
- `cuttingResults[]` - Hasil pemotongan
- Material allocations dengan field `color`

### 3.3 API Baru: /api/cutting-results

#### POST /api/cutting-results

**Request:**

```json
{
  "batchId": "xxx",
  "results": [
    {
      "productSize": "M",
      "color": "Putih",
      "actualPieces": 28
    },
    {
      "productSize": "L",
      "color": "Putih",
      "actualPieces": 26
    },
    {
      "productSize": "XL",
      "color": "Hijau",
      "actualPieces": 14
    }
  ]
}
```

**Logic:**

- Jika dibuat oleh `KEPALA_PRODUKSI`: auto-confirmed
- Jika dibuat oleh `PEMOTONG`: `isConfirmed = false`
- Update `batch.actualQuantity` dengan total pieces

#### GET /api/cutting-results?batchId=xxx

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "productSize": "M",
      "color": "Putih",
      "actualPieces": 28,
      "isConfirmed": false,
      "confirmedBy": null,
      "confirmedAt": null
    }
  ]
}
```

#### POST /api/cutting-results/[id]/confirm

**Purpose:** Kepala Produksi mengkonfirmasi hasil pemotongan

**Response:**

```json
{
  "success": true,
  "message": "Hasil pemotongan berhasil dikonfirmasi"
}
```

---

## 4. Perubahan UI

### 4.1 Component Baru: CreateBatchDialog

**Lokasi:** `components/create-batch-dialog.tsx`

**Fitur:**

1. **Section Bahan Baku:**

   - Pilih material
   - Input warna
   - Input jumlah roll
   - Tombol tambah/hapus bahan

2. **Section Request Ukuran/Warna:**

   - Input ukuran (M, L, XL, dll)
   - Input warna
   - Input jumlah potongan yang diharapkan
   - Tombol tambah/hapus request

3. **Summary:**
   - Total roll yang dibawa
   - Total potongan yang diharapkan

**Validasi:**

- Semua field harus diisi
- Roll quantity > 0
- Requested pieces > 0

### 4.2 Update Cutting Process Page

**TODO (belum diimplementasi):**

- Form input hasil pemotongan per ukuran/warna
- Tampilkan request vs actual
- Button konfirmasi untuk kepala produksi

---

## 5. Migration & Seed Data

### Migration

```bash
npx prisma migrate dev --name add_material_color_and_batch_size_tracking
```

**Perubahan:**

1. Tambah `color` ke `materials`
2. Ubah `production_batches`: hapus `targetQuantity`, tambah `totalRolls`
3. Tambah `color` dan `rollQuantity` ke `batch_material_allocations`
4. Buat tabel baru `batch_size_color_requests`
5. Buat tabel baru `cutting_results`

### Seed Data

**Contoh data yang dibuat:**

1. Material dengan warna:

   - Kain Katun Putih
   - Kain Katun Hijau

2. Batch dengan request:
   - 5 roll total (3 putih + 2 hijau)
   - Request: M Putih (30), L Putih (25), XL Hijau (15)

---

## 6. Testing

### Test Credentials

Sama seperti sebelumnya:

```
produksi@trackpro.com / password123 (KEPALA_PRODUKSI)
pemotong@trackpro.com / password123 (PEMOTONG)
```

### Test Scenario

#### 1. Buat Batch Baru

Login sebagai `produksi@trackpro.com`:

1. Buka halaman Batch Management
2. Klik "Buat Batch Baru"
3. Pilih produk
4. Tambah bahan baku:
   - Kain Katun, Putih, 3 roll
   - Kain Katun, Hijau, 2 roll
5. Tambah request:
   - M, Putih, 30 pcs
   - L, Putih, 25 pcs
   - XL, Hijau, 15 pcs
6. Simpan batch

#### 2. Input Hasil Pemotongan (Opsi A - Pemotong)

Login sebagai `pemotong@trackpro.com`:

1. Buka task pemotongan
2. Input hasil:
   - M, Putih: 28 pcs
   - L, Putih: 26 pcs
   - XL, Hijau: 14 pcs
3. Submit (status: waiting confirmation)

Login kembali sebagai `produksi@trackpro.com`: 4. Review hasil 5. Konfirmasi hasil pemotongan

#### 3. Input Hasil Pemotongan (Opsi B - Kepala Produksi)

Login sebagai `produksi@trackpro.com`:

1. Buka batch detail
2. Input hasil pemotongan langsung
3. Simpan (auto-confirmed)

---

## 7. Ringkasan Keuntungan Alur Baru

### ✅ Kelebihan:

1. **Lebih realistis**: Sesuai praktik produksi sebenarnya
2. **Tracking detail**: Warna, ukuran, dan roll tercatat dengan jelas
3. **Fleksibel**: Kepala produksi atau pemotong bisa input hasil
4. **Auto-confirmation**: Jika kepala produksi yang input, langsung confirmed
5. **Traceability**: Setiap roll material dan hasil potongan ter-track dengan baik

### 📊 Data yang Tercatat:

- Material apa yang dibawa (dengan warna dan jumlah roll)
- Request ukuran/warna yang diinginkan
- Hasil pemotongan aktual per ukuran/warna
- Siapa yang input hasil (pemotong atau kepala produksi)
- Siapa yang konfirmasi (jika pemotong yang input)

---

## 8. File yang Dimodifikasi

### Database

- ✅ `prisma/schema.prisma` - Update schema
- ✅ `prisma/seed.ts` - Update seed data

### API

- ✅ `app/api/production-batches/route.ts` - Update GET & POST
- ✅ `app/api/cutting-results/route.ts` - API baru
- ✅ `app/api/cutting-results/[id]/confirm/route.ts` - Confirmation endpoint

### Components

- ✅ `components/create-batch-dialog.tsx` - Dialog baru untuk create batch

### Pages (TODO)

- 🔲 `app/production/batch/page.tsx` - Integrate CreateBatchDialog
- 🔲 `app/cutter/process/page.tsx` - Update cutting process form

---

## 9. Next Steps

### Priority 1 - High Priority:

1. Update `app/production/batch/page.tsx` untuk gunakan `CreateBatchDialog`
2. Update `app/cutter/process/page.tsx` untuk input hasil pemotongan per ukuran/warna
3. Tambah konfirmasi UI untuk kepala produksi

### Priority 2 - Medium Priority:

1. Update detail batch view untuk tampilkan size/color requests
2. Update detail batch view untuk tampilkan cutting results
3. Tambah comparison view (request vs actual)

### Priority 3 - Nice to Have:

1. Export report hasil pemotongan
2. Analytics dashboard untuk efficiency rate
3. QR Code per size/color untuk tracking lebih detail

---

## 10. API Reference Quick Guide

### Buat Batch Baru

```typescript
POST /api/production-batches
{
  productId: string,
  materialAllocations: Array<{
    materialId: string,
    color: string,
    rollQuantity: number,
    requestedQty: number
  }>,
  sizeColorRequests: Array<{
    productSize: string,
    color: string,
    requestedPieces: number
  }>,
  notes?: string
}
```

### Input Hasil Pemotongan

```typescript
POST /api/cutting-results
{
  batchId: string,
  results: Array<{
    productSize: string,
    color: string,
    actualPieces: number
  }>
}
```

### Konfirmasi Hasil

```typescript
POST / api / cutting - results / [id] / confirm;
```

---

## Kontak

Untuk pertanyaan lebih lanjut, hubungi tim development TrackPro.

---

**Dokumentasi Dibuat:** 30 Desember 2025  
**Versi:** 2.0  
**Status:** ✅ Database & API Complete, 🔲 UI Updates In Progress
