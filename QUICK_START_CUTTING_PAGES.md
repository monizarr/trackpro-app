# 📋 Quick Reference - Halaman Task Pemotongan

## 🎯 2 Halaman Baru

### 1️⃣ HALAMAN LIST

**Path:** `/cutter/process`
**File:** `app/cutter/process/page.tsx`
**Tujuan:** Daftar task pemotongan

**Fitur:**

- Filter bulan
- Tabs status (Menunggu, Proses, Selesai, Terverifikasi)
- Kartu task (klik untuk buka detail)

**API:**

```
GET /api/cutting-tasks/me
```

---

### 2️⃣ HALAMAN DETAIL

**Path:** `/cutter/process/[id]`
**File:** `app/cutter/process/[id]/page.tsx`
**Tujuan:** Detail task + input hasil potong

**Fitur:**

- Info batch + progress bar
- Tombol "Mulai Pemotongan" (jika ASSIGNED_TO_CUTTER)
- Form input hasil potong (jika IN_CUTTING)
- Tabel per ukuran & warna
- Tombol "Simpan Progress" & "Submit untuk Verifikasi"
- Timeline riwayat
- Back button

**API:**

```
GET /api/cutting-tasks/[id]
GET /api/production-batches/[batchId]/timeline
PATCH /api/cutting-tasks/[id]/start
PATCH /api/cutting-tasks/[id]/progress
PATCH /api/cutting-tasks/[id]/complete
```

---

## 🔄 Workflow Singkat

```
List Page
  ↓ [Klik Task]
  ↓
Detail Page
  ├─ Status ASSIGNED_TO_CUTTER → [Mulai Pemotongan]
  ├─ Status IN_CUTTING → [Input Hasil]
  │  ├─ Simpan Progress (draft)
  │  └─ Submit untuk Verifikasi (final)
  ├─ Status CUTTING_COMPLETED → Alert (tunggu verifikasi)
  └─ [← Back] → Kembali ke List
```

---

## 📁 File Structure

```
app/cutter/process/
├── page.tsx              ← LIST (293 lines)
└── [id]/
    └── page.tsx          ← DETAIL (627 lines)
```

---

## 📚 Documentation

| File                                                                     | Tujuan                       |
| ------------------------------------------------------------------------ | ---------------------------- |
| [`CUTTER_PROCESS_GUIDE.md`](CUTTER_PROCESS_GUIDE.md)                     | 👥 User Guide (step-by-step) |
| [`CUTTING_TASK_REFACTORING.md`](CUTTING_TASK_REFACTORING.md)             | 🔧 Technical Details         |
| [`CUTTER_PROCESS_REFACTORING_LOG.md`](CUTTER_PROCESS_REFACTORING_LOG.md) | 📝 Changelog & Checklist     |
| [`CUTTING_TASK_PAGES_SUMMARY.md`](CUTTING_TASK_PAGES_SUMMARY.md)         | 📊 Visual Summary            |
| [`README_CUTTING_TASK_PAGES.md`](README_CUTTING_TASK_PAGES.md)           | ℹ️ Complete Overview         |

---

## 🚀 Testing Quick Checklist

- [ ] List page muncul dengan task
- [ ] Klik task → detail page muncul
- [ ] Status ASSIGNED_TO_CUTTER → tombol "Mulai"
- [ ] Klik "Mulai" → status jadi IN_CUTTING
- [ ] Form input terbuka
- [ ] Input qty & klik "Simpan" → tersimpan
- [ ] Klik "Submit" → status jadi CUTTING_COMPLETED
- [ ] Back button → list page
- [ ] Mobile responsive

---

## 🎨 Components Used

**UI Components (shadcn/ui):**

- Card, Badge, Button, Input, Alert, Tabs, Table

**Icons (lucide-react):**

- Clock, Play, CheckCircle, Zap, Loader2, AlertCircle, ArrowLeft, ChevronRight

**Navigation:**

- `useRouter` from `next/navigation`

**State:**

- `useState` for local state
- `useEffect` for data fetching

**Toast:**

- `useToast` from `@/hooks/use-toast`

---

## ✨ Key Improvements vs Before

| Aspek           | Sebelum          | Sesudah         |
| --------------- | ---------------- | --------------- |
| **Structure**   | 1 halaman mega   | 2 halaman fokus |
| **Code Lines**  | ~534             | ~220 + ~630     |
| **UI**          | Penuh & ramai    | Clean & focused |
| **Navigation**  | Inline selection | Clear routing   |
| **Mobile**      | Sulit            | Responsif       |
| **Maintenance** | Kompleks         | Mudah           |

---

## 🔗 Links

- **List Page:** `/cutter/process`
- **Detail Page:** `/cutter/process/[id]` (e.g., `/cutter/process/task-123`)
- **Sidebar Menu:** "Proses Pemotongan" → navigates to list

---

## 📞 Quick Troubleshooting

| Problem                 | Solution                                     |
| ----------------------- | -------------------------------------------- |
| List page blank         | Refresh F5, check API /cutting-tasks/me      |
| Detail page 404         | Pastikan task ID valid                       |
| Form tidak bisa submit  | Pastikan qty > 0, ada data sizeColorRequests |
| Timeline kosong         | Check API /production-batches/[id]/timeline  |
| Mobile tidak responsive | Clear cache, check CSS                       |

---

## ✅ Status

**Implementation:** ✅ COMPLETE
**Testing:** ✅ READY
**Documentation:** ✅ COMPLETE
**Deployment:** ✅ READY

---

**Last Updated:** 28 Jan 2025
**Version:** 1.0
**Status:** Production Ready 🚀
