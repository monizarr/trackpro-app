# Halaman Task Pemotongan - Refactoring

## Struktur Baru

Halaman task pemotongan telah di-refactor menjadi dua halaman terpisah untuk pengalaman pengguna yang lebih baik:

### 1. **Halaman List** (`/cutter/process/page.tsx`)

Menampilkan daftar semua task pemotongan dengan fitur:

- Pengelompokan task berdasarkan status (Menunggu, Proses, Selesai, Terverifikasi)
- Filter berdasarkan bulan
- Kartu task yang menampilkan:
  - SKU batch (identitas unik)
  - Nama produk
  - Target quantity
  - Status badge
- Navigasi ke halaman detail dengan klik pada task

### 2. **Halaman Detail** (`/cutter/process/[id]/page.tsx`)

Menampilkan detail lengkap sebuah task pemotongan dengan fitur:

- Informasi batch (SKU, produk, target, progress)
- Progress bar untuk visualisasi persentase penyelesaian
- **Aksi Mulai Pemotongan** (jika status ASSIGNED_TO_CUTTER)
  - Tombol untuk memulai proses pemotongan
- **Aksi Input Hasil Pemotongan** (jika status IN_CUTTING)
  - Tabel input untuk memasukkan qty potongan per ukuran dan warna
  - Input catatan
  - Tombol "Simpan Progress" (save draft)
  - Tombol "Submit untuk Verifikasi" (submit & move to next status)
- Riwayat timeline aktivitas batch
- Tombol kembali ke halaman list

## Flow Pengguna

1. **Pemotong masuk ke halaman list**
   - Melihat daftar task yang ditugaskan
   - Filter berdasarkan bulan jika perlu
   - Klik salah satu task untuk membuka detail

2. **Di halaman detail - Task belum dimulai (ASSIGNED_TO_CUTTER)**
   - Lihat informasi batch
   - Klik "Mulai Pemotongan" → status berubah menjadi IN_CUTTING

3. **Di halaman detail - Task sedang berlangsung (IN_CUTTING)**
   - Lihat progress bar
   - Input hasil potongan per ukuran & warna
   - Bisa "Simpan Progress" untuk save draft
   - Klik "Submit untuk Verifikasi" ketika selesai

4. **Di halaman detail - Task sudah selesai**
   - Lihat alert yang menunjukkan task sudah selesai/terverifikasi
   - Riwayat lengkap timeline

## API yang Digunakan

### List Tasks

```
GET /api/cutting-tasks/me
```

Mengembalikan array CuttingTask untuk user yang login

### Get Detail Task

```
GET /api/cutting-tasks/[id]
```

Mengembalikan detail satu task dengan data batch terkait

### Start Cutting

```
PATCH /api/cutting-tasks/[id]/start
```

Mengubah status dari ASSIGNED_TO_CUTTER ke IN_CUTTING

### Save Progress

```
PATCH /api/cutting-tasks/[id]/progress
Body:
{
  cuttingResults: Array<{productSize, color, actualPieces}>,
  notes: string
}
```

### Complete Cutting

```
PATCH /api/cutting-tasks/[id]/complete
Body:
{
  cuttingResults: Array<{productSize, color, actualPieces}>,
  notes: string
}
```

Mengubah status dari IN_CUTTING ke CUTTING_COMPLETED

### Timeline

```
GET /api/production-batches/[batchId]/timeline
```

Menampilkan riwayat aktivitas batch

## Keuntungan Refactoring Ini

✅ **Lebih Fokus**: Setiap halaman punya tanggung jawab yang jelas
✅ **Navigasi Lebih Baik**: User dapat melihat list terlebih dahulu sebelum membuka detail
✅ **Mobile-Friendly**: Desain responsif di kedua halaman
✅ **Mengurangi Kompleksitas**: Logic di halaman list lebih sederhana
✅ **Reusable**: Halaman detail bisa digunakan dari berbagai entry points
✅ **Better UX**: User bisa kembali ke list dan membuka task yang lain dengan mudah

## Catatan Teknis

- Kedua halaman menggunakan hook `useRouter` dari `next/navigation`
- State management sederhana menggunakan `useState`
- Responsive design dengan Tailwind CSS (sm: breakpoint)
- Toast notifications untuk user feedback
- Skeleton loading untuk UX yang lebih baik
