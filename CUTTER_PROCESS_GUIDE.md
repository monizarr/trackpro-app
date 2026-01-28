# Panduan Penggunaan Halaman Task Pemotongan

## Untuk Pemotong (Kepala Pemotong)

### Akses Halaman

Masuk ke menu **Proses Pemotongan** dari sidebar. Ini akan membuka halaman daftar task.

### Halaman Daftar (List View)

```
🏠 Daftar Task Pemotongan
├─ Filter Bulan (opsional)
├─ Tab Status
│  ├─ Menunggu (⏰ Belum dimulai)
│  ├─ Proses (▶️ Sedang dikerjakan)
│  ├─ Selesai (✅ Selesai, tunggu verifikasi)
│  └─ Terverifikasi (⚡ Sudah diverifikasi)
└─ Daftar Task (klik untuk buka detail)
```

**Cara menggunakan:**

1. Filter bulan jika perlu (default: bulan sekarang)
2. Pilih tab status untuk melihat task yang ingin dikerjakan
3. Klik kartu task untuk membuka halaman detail

**Info di Kartu Task:**

- SKU Batch (contoh: PROD-20250128-001)
- Nama Produk
- Target Quantity
- Status Badge

---

### Halaman Detail (Detail View)

```
← PROD-20250128-001: Kemeja Pria Regular

📊 INFO BATCH
├─ Target Qty: 100 pcs
├─ Selesai: 0 pcs
├─ Roll Diterima: 5
└─ Progress: 0%

🔧 AKSI
├─ Mulai Pemotongan (jika belum dimulai)
├─ Input Hasil Pemotongan (jika sedang dikerjakan)
│  ├─ Tabel input per ukuran & warna
│  ├─ Catatan
│  ├─ Tombol Simpan Progress
│  └─ Tombol Submit untuk Verifikasi
└─ Status Selesai (jika sudah selesai)

📅 RIWAYAT PROGRESS
└─ Timeline aktivitas batch
```

---

## Workflow Lengkap

### ✅ TAHAP 1: Task Ditugaskan (Status: ASSIGNED_TO_CUTTER)

**Apa yang dilihat:**

- Halaman detail dengan tombol "Mulai Pemotongan"
- Info batch (SKU, produk, target, roll diterima)

**Aksi yang dilakukan:**

1. Tekan tombol "Mulai Pemotongan"
2. Sistem akan mengubah status menjadi IN_CUTTING
3. Halaman akan di-refresh otomatis

---

### ✅ TAHAP 2: Sedang Pemotongan (Status: IN_CUTTING)

**Apa yang dilihat:**

- Progress bar showing 0% → 100% completion
- Tabel input untuk setiap ukuran & warna

**Contoh Tabel:**

```
┌──────────┬─────────┬──────┐
│ Ukuran   │ Warna   │ Qty  │
├──────────┼─────────┼──────┤
│ S        │ Merah   │ [25] │
│ M        │ Merah   │ [30] │
│ L        │ Merah   │ [20] │
│ XL       │ Merah   │ [15] │
├──────────┼─────────┼──────┤
│          │ TOTAL   │  90  │
└──────────┴─────────┴──────┘
```

**Aksi yang bisa dilakukan:**

**Option A: Simpan Progress (Draft)**

- Input qty untuk setiap ukuran
- Tambah catatan jika ada masalah
- Klik "Simpan Progress" → data tersimpan, bisa dilanjutkan nanti
- Status tetap IN_CUTTING

**Option B: Submit untuk Verifikasi (Final)**

- Pastikan semua qty sudah benar
- Tambah catatan jika perlu
- Klik "Submit untuk Verifikasi"
- Status berubah ke CUTTING_COMPLETED
- Menunggu Ka. Produksi verifikasi

---

### ✅ TAHAP 3: Menunggu Verifikasi (Status: CUTTING_COMPLETED)

**Apa yang dilihat:**

- Alert: "Task ini sudah selesai dan menunggu verifikasi"
- Tidak ada aksi input lagi
- Bisa lihat timeline riwayat

---

### ✅ TAHAP 4: Sudah Diverifikasi (Status: CUTTING_VERIFIED)

**Apa yang dilihat:**

- Alert: "Task ini sudah terverifikasi"
- Task siap untuk tahap penjahitan berikutnya
- Riwayat timeline lengkap

---

## Tips & Trik

### 💡 Tip 1: Filter Efisien

Gunakan filter bulan jika ada banyak task. Ini membantu fokus pada pekerjaan bulan tertentu.

### 💡 Tip 2: Simpan Progress

Jangan harus selesai dalam satu kali duduk. Bisa "Simpan Progress" berkali-kali, lalu submit final ketika benar-benar selesai.

### 💡 Tip 3: Catatan Penting

Jika ada masalah atau informasi khusus saat pemotongan, tulis di kolom "Catatan". Contoh:

- "Material sedikit kusut, sudah ditangani"
- "Ada scrap 5 meter pada roll 3"
- "Hasil potong lebih baik dari target"

### 💡 Tip 4: Cek Riwayat Timeline

Timeline menunjukkan kapan batch dibuat, material dialokasikan, dsb. Berguna untuk tracking waktu proses.

---

## Troubleshooting

### ❌ Tombol "Mulai Pemotongan" tidak aktif?

- Pastikan status task adalah ASSIGNED_TO_CUTTER
- Refresh halaman
- Hubungi Ka. Produksi jika masih error

### ❌ Tidak bisa submit hasil?

- Pastikan total qty > 0
- Pastikan sudah input qty untuk semua ukuran/warna
- Cek koneksi internet

### ❌ Halaman error/blank?

- Refresh halaman (Ctrl+R)
- Cek kembali apakah task masih ada di list
- Hubungi admin jika masih error

---

## FAQ

**Q: Bisa kembali ke list tanpa submit?**
A: Ya, klik tombol panah "<" di kiri atas. Progress yang sudah disimpan akan tersimpan.

**Q: Apakah qty harus persis sesuai target?**
A: Tidak harus. Bisa kurang atau lebih, yang penting masuk di dalam table yang ada.

**Q: Boleh ubah qty setelah submit?**
A: Tidak. Setelah submit, Ka. Produksi akan verifikasi. Jika ada koreksi, hubungi Ka. Produksi untuk adjust.

**Q: Bagaimana jika ada reject/cacat saat potong?**
A: Reject ditangani di tahap Finishing, bukan di pemotongan. Masukkan saja qty potongan yang baik.

---

## Kontak Support

Jika ada pertanyaan atau masalah teknis, hubungi:

- **Kepala Produksi**: Untuk masalah bisnis
- **Admin IT**: Untuk masalah teknis/sistem
