# Sistem Barcode/QR Code TrackPro

## Overview

Sistem barcode TrackPro memungkinkan setiap user untuk melakukan aksi produksi dengan cara **scan barcode** menggunakan aplikasi scanner (Google Lens, Camera app, dll) tanpa perlu membuka browser dan mencari batch secara manual.

## Cara Kerja

### 1. Generate QR Code

- **Kepala Produksi** dapat generate QR code untuk setiap batch produksi
- QR code berisi URL: `https://yourdomain.com/batch/{batchId}`
- QR code bisa di-download atau di-print

### 2. Scan QR Code

- User menggunakan **Google Lens**, **Camera App**, atau **QR Scanner app** di HP mereka
- Scan QR code yang tertera di batch produksi
- Aplikasi scanner akan otomatis membuka URL di browser

### 3. Auto Authentication

- Jika user **belum login**, sistem akan redirect ke halaman login
- Setelah login, user otomatis diarahkan kembali ke halaman batch
- Jika user **sudah login**, langsung masuk ke halaman batch

### 4. Action Based on Role

Setiap role akan melihat aksi yang berbeda sesuai dengan tugas mereka:

#### **PEMOTONG (Cutter)**

- Melihat detail cutting task yang di-assign
- **Mulai Pemotongan** - Start task saat mulai kerja
- **Selesaikan Pemotongan** - Input:
  - Potongan selesai
  - Potongan reject
  - Sisa material (waste)
  - Catatan (opsional)

#### **PENJAHIT (Sewer)**

- Melihat detail sewing task yang di-assign
- **Mulai Penjahitan** - Start task saat mulai kerja
- **Selesaikan Penjahitan** - Input:
  - Jahitan selesai
  - Jahitan reject
  - Catatan (opsional)

#### **FINISHING (Finisher)**

- Melihat detail finishing task yang di-assign
- **Mulai Finishing** - Start task saat mulai kerja
- **Selesaikan Finishing** - Input:
  - Produk selesai
  - Produk reject
  - Catatan (opsional)

#### **KEPALA_PRODUKSI (Production Head)**

- Melihat full detail batch
- Melakukan verifikasi setiap tahap produksi
- Monitor progress real-time

#### **WAREHOUSE**

- Melihat batch yang sudah finishing
- Verifikasi produk jadi
- Update stock finished goods

## Workflow Example

### Scenario: Pemotongan Batch A-001

1. **Generate QR Code**

   - Kepala Produksi membuat batch "A-001"
   - Generate dan print QR code
   - Tempel QR code di area cutting

2. **Pemotong Scan QR**

   ```
   Pemotong: Pak Budi
   Action:
   1. Scan QR code dengan HP
   2. Browser terbuka: https://app.com/batch/a-001
   3. Login (jika belum)
   4. Melihat halaman batch A-001
   5. Klik "Mulai Pemotongan" → Task status: IN_PROGRESS
   ```

3. **Selesai Pemotongan**

   ```
   Setelah selesai memotong:
   1. Buka lagi halaman (dari history browser atau scan ulang)
   2. Input hasil:
      - Potongan selesai: 95 pcs
      - Reject: 5 pcs
      - Sisa material: 2.5 kg
      - Catatan: "Material berkualitas baik"
   3. Klik "Selesaikan Pemotongan"
   4. Status berubah: CUTTING_COMPLETED
   ```

4. **Verifikasi Kepala Produksi**

   ```
   Kepala Produksi scan QR yang sama:
   1. Melihat hasil pemotongan
   2. Verifikasi kualitas
   3. Approve atau Reject
   ```

5. **Lanjut ke Penjahit**
   ```
   Kepala Produksi assign ke penjahit
   Penjahit scan QR yang sama:
   1. Melihat sewing task
   2. Mulai penjahitan
   3. ... dst
   ```

## Technical Implementation

### File Structure

```
app/
├── batch/
│   └── [id]/
│       └── page.tsx          # Universal batch action page
├── api/
│   ├── cutting-tasks/
│   │   └── [id]/
│   │       ├── start/route.ts
│   │       └── complete/route.ts
│   ├── sewing-tasks/
│   │   └── [id]/
│   │       ├── start/route.ts
│   │       └── complete/route.ts
│   └── finishing-tasks/
│       └── [id]/
│           ├── start/route.ts
│           └── complete/route.ts
middleware.ts                  # Auth redirect handler
components/
└── qr-code-generator.tsx     # QR generator with URL
```

### QR Code Format

```
Before: {"id": "...", "type": "production-batch", ...}
After:  https://yourdomain.com/batch/abc123
```

### Middleware Logic

```typescript
// middleware.ts
if (pathname.startsWith("/batch/") && !authenticated) {
  redirect to: /auth/signin?callbackUrl=/batch/{id}
}
```

### Role-Based Rendering

```typescript
// app/batch/[id]/page.tsx
switch (user.role) {
  case "PEMOTONG": render CuttingActions
  case "PENJAHIT": render SewingActions
  case "FINISHING": render FinishingActions
  case "KEPALA_PRODUKSI": render VerificationActions
  case "WAREHOUSE": render WarehouseActions
}
```

## API Endpoints

### Start Task

```
POST /api/cutting-tasks/{id}/start
POST /api/sewing-tasks/{id}/start
POST /api/finishing-tasks/{id}/start

Response: { success: true, message: "Task started" }
```

### Complete Task

```
POST /api/cutting-tasks/{id}/complete
Body: {
  piecesCompleted: number,
  rejectPieces: number,
  wasteQty?: number,
  notes?: string
}

POST /api/sewing-tasks/{id}/complete
Body: {
  piecesCompleted: number,
  rejectPieces: number,
  notes?: string
}

POST /api/finishing-tasks/{id}/complete
Body: {
  piecesCompleted: number,
  rejectPieces: number,
  notes?: string
}

Response: { success: true, message: "Task completed" }
```

## Benefits

✅ **No Manual Search** - User tidak perlu cari batch manual di sistem
✅ **Fast Access** - Scan → Login → Action (3 steps)
✅ **Mobile Friendly** - Bisa pakai HP biasa, tidak perlu device khusus
✅ **Real-time Update** - Data langsung masuk ke sistem
✅ **Role-Based** - Setiap user hanya lihat aksi yang relevan
✅ **Audit Trail** - Semua aksi tercatat dengan timestamp dan user
✅ **Offline Ready** - QR code di-print, tetap bisa di-scan walau sistem offline

## Usage Tips

1. **Print QR Code besar** - Minimal 5x5 cm untuk scan yang mudah
2. **Laminate QR Code** - Agar tahan lama di area produksi
3. **Multiple QR** - Print beberapa QR, tempel di beberapa lokasi strategis
4. **Save to Home Screen** - User bisa save page ke home screen HP untuk akses cepat
5. **Bookmark** - Simpan URL batch di browser bookmark untuk re-access

## Security

- ✅ Authentication required untuk akses batch detail
- ✅ Role-based access control
- ✅ Task ownership validation (user hanya bisa update task mereka sendiri)
- ✅ Session management via NextAuth
- ✅ HTTPS only in production

## Troubleshooting

**Q: QR code tidak bisa di-scan**
A: Pastikan QR code cukup besar dan kontras tinggi (hitam-putih)

**Q: Setelah scan, muncul 404**
A: Batch mungkin sudah dihapus atau ID tidak valid

**Q: Tidak bisa login setelah scan**
A: Clear browser cache atau gunakan incognito mode

**Q: Tombol action tidak muncul**
A: Pastikan user sudah di-assign ke task yang sesuai
