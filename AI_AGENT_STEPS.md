# AI Agent Implementation Steps - TrackPro App

## 📋 Overview

Dokumen ini berisi step-by-step implementation plan untuk AI Agent agar dapat melaksanakan full workflow produksi dari awal hingga akhir dengan data tersimpan sempurna di database.

---

## ✅ FASE 0: VERIFIKASI SISTEM (Prerequisites)

### Step 0.1: Verifikasi Database Connection

```bash
# Check PostgreSQL running
npx prisma studio

# Verify connection
npx prisma db pull
```

**Expected Result:**

- ✅ Database connected
- ✅ All 14 tables visible
- ✅ Seed data available (6 users)

### Step 0.2: Verifikasi Authentication

```bash
# Test login for each role
# URL: http://localhost:3000/login

# Credentials:
- owner / password123
- gudang / password123
- produksi / password123
- pemotong / password123
- penjahit / password123
- finishing / password123
```

**Expected Result:**

- ✅ Login successful
- ✅ Auto-redirect to role dashboard
- ✅ Session persisted

### Step 0.3: Check Current Implementation Status

**✅ COMPLETED:**

- Authentication system (NextAuth + JWT)
- Product management (CRUD)
- Material management (CRUD)
- Material transactions (IN/OUT)
- Stock management
- Production batch creation dialog
- Production dashboard
- Quality control verification
- Database schema with relations

**🔄 IN PROGRESS:**

- Batch creation workflow (UI done, needs testing)

**⏳ PENDING:**

- Material allocation by warehouse
- Worker task assignment
- Task progress tracking
- Complete workflow integration

---

## 🎯 FASE 1: OWNER - SETUP MASTER DATA

### Step 1.1: Login sebagai Owner

**File:** `app/login/page.tsx`
**API:** `app/api/auth/[...nextauth]/route.ts`

```typescript
// Action:
1. Open http://localhost:3000/login
2. Username: owner
3. Password: password123
4. Click "Masuk"

// Expected:
- Redirect to /owner/dashboard
- Session created with role: OWNER
```

**Verification:**

```bash
# Check session
curl http://localhost:3000/api/auth/session
```

### Step 1.2: Buat Produk Baru

**File:** `app/owner/products/page.tsx`
**API:** `app/api/products/route.ts` (POST)

```typescript
// Navigate to /owner/products
// Click "Tambah Produk"

// Input Data:
{
  "name": "Kemeja Formal Lengan Panjang",
  "sku": "PROD-001", // Auto-generated atau manual
  "description": "Kemeja formal untuk pria",
  "price": 250000,
  "status": "ACTIVE"
}

// Add Materials (BOM):
1. Kain Katun - 2 meter
2. Benang Polyester - 0.5 roll
3. Kancing - 8 pieces
4. Label - 2 pieces

// Expected Result:
- Product created in database
- ProductMaterial relations created
- Navigate back to product list
```

**Database Changes:**

```sql
-- Check product created
SELECT * FROM products WHERE sku = 'PROD-001';

-- Check BOM
SELECT pm.*, m.name
FROM product_materials pm
JOIN materials m ON pm."materialId" = m.id
WHERE pm."productId" = '<product-id>';
```

### Step 1.3: Buat Produk Kedua (untuk variasi)

```typescript
{
  "name": "Celana Panjang Formal",
  "sku": "PROD-002",
  "description": "Celana formal untuk pria",
  "price": 300000,
  "status": "ACTIVE"
}

// Materials:
1. Kain Drill - 2.5 meter
2. Benang Polyester - 0.3 roll
3. Resleting - 1 piece
4. Kancing - 2 pieces
```

**Expected:** 2 products dengan BOM lengkap tersimpan

---

## 📦 FASE 2: KEPALA GUDANG - MANAGE STOK

### Step 2.1: Login sebagai Kepala Gudang

```typescript
// Logout owner
// Login: gudang / password123
// Redirect to /warehouse/dashboard
```

### Step 2.2: Input Stok Bahan Baku Masuk

**File:** `app/warehouse/stock/page.tsx`
**API:** `app/api/material-transactions/route.ts` (POST)

```typescript
// Navigate to /warehouse/stock
// Tab: "Transaksi Masuk"

// Transaction 1: Kain Katun
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 100, // meters
  "notes": "Pembelian dari supplier A",
  "referenceNumber": "PO-2025-001"
}

// Transaction 2: Kain Drill
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 80, // meters
  "notes": "Pembelian dari supplier B",
  "referenceNumber": "PO-2025-002"
}

// Transaction 3: Benang Polyester
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 50, // rolls
  "notes": "Stock replenishment",
  "referenceNumber": "PO-2025-003"
}

// Transaction 4: Kancing
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 500, // pieces
  "notes": "Bulk purchase",
  "referenceNumber": "PO-2025-004"
}

// Transaction 5: Resleting
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 200, // pieces
  "notes": "Bulk purchase",
  "referenceNumber": "PO-2025-005"
}

// Transaction 6: Label
{
  "materialId": "<material-id>",
  "type": "IN",
  "quantity": 300, // pieces
  "notes": "Custom label order",
  "referenceNumber": "PO-2025-006"
}
```

**Database Changes:**

```sql
-- Check transactions
SELECT * FROM material_transactions
WHERE type = 'IN'
ORDER BY "createdAt" DESC;

-- Check updated stock
SELECT code, name, "currentStock", unit
FROM materials;
```

**Expected Stock After Input:**

- Kain Katun: 100 meter
- Kain Drill: 80 meter
- Benang Polyester: 50 roll
- Kancing: 500 pieces
- Resleting: 200 pieces
- Label: 300 pieces

### Step 2.3: Verifikasi Stock Dashboard

```typescript
// Check /warehouse/dashboard
// Verify:
- Stock summary displays correctly
- Recent transactions visible
- Low stock alerts (if any)
```

---

## 🏭 FASE 3: KEPALA PRODUKSI - BUAT BATCH PRODUKSI

### Step 3.1: Login sebagai Kepala Produksi

```typescript
// Logout kepala gudang
// Login: produksi / password123
// Redirect to /production/dashboard
```

### Step 3.2: Buat Batch Produksi Pertama

**File:** `app/production/batch/page.tsx`
**API:** `app/api/production-batches/route.ts` (POST)

```typescript
// Navigate to /production/batch
// Click "Buat Batch Baru"

// Batch 1: Kemeja
{
  "productId": "<prod-001-id>",
  "targetQuantity": 50, // pieces
  "notes": "Order dari client A - deadline 2 minggu"
}

// System Auto-Generate:
- batchSku: "BATCH-20251203-001"
- status: "PENDING"
- Material allocations automatically calculated based on BOM

// Expected Material Needs (auto-calculated):
- Kain Katun: 50 × 2 = 100 meter
- Benang Polyester: 50 × 0.5 = 25 roll
- Kancing: 50 × 8 = 400 pieces
- Label: 50 × 2 = 100 pieces

// System checks stock availability:
✅ Kain Katun: Available (100/100)
✅ Benang: Available (50/25)
✅ Kancing: Available (500/400)
✅ Label: Available (300/100)
```

**Database Changes:**

```sql
-- Check batch created
SELECT * FROM production_batches WHERE "batchSku" = 'BATCH-20251203-001';

-- Check material allocations created
SELECT bma.*, m.name, m."currentStock"
FROM batch_material_allocations bma
JOIN materials m ON bma."materialId" = m.id
WHERE bma."batchId" = '<batch-id>'
AND bma.status = 'PENDING';
```

**Expected Result:**

- Production batch created with status "PENDING"
- 4 material allocation records created with status "PENDING"
- Material NOT yet deducted from stock (waiting warehouse allocation)

### Step 3.3: Buat Batch Kedua (Celana)

```typescript
// Batch 2: Celana
{
  "productId": "<prod-002-id>",
  "targetQuantity": 30, // pieces
  "notes": "Stock internal - tidak urgent"
}

// Auto-calculate materials:
- Kain Drill: 30 × 2.5 = 75 meter
- Benang: 30 × 0.3 = 9 roll
- Resleting: 30 × 1 = 30 pieces
- Kancing: 30 × 2 = 60 pieces
```

**Expected:** 2 batches created, awaiting material allocation

---

## 📋 FASE 4: KEPALA GUDANG - ALOKASI BAHAN

### Step 4.1: Kembali Login sebagai Kepala Gudang

```typescript
// Logout kepala produksi
// Login: gudang / password123
```

### Step 4.2: Lihat Permintaan Alokasi Material

**File:** `app/warehouse/allocation/page.tsx` (NEEDS TO BE CREATED)
**API:** `app/api/material-allocations/route.ts` (NEEDS TO BE CREATED)

```typescript
// Navigate to /warehouse/allocation
// View pending allocation requests

// Pending Requests:
1. BATCH-20251203-001 (Kemeja) - 4 materials
2. BATCH-20251203-002 (Celana) - 4 materials

// For each batch, display:
- Batch SKU
- Product name
- Target quantity
- List of materials with:
  * Material name
  * Requested quantity
  * Current stock
  * Allocation status
```

### Step 4.3: Approve dan Alokasi Material untuk Batch 1

**API:** `app/api/material-allocations/[id]/route.ts` (PATCH) (NEEDS TO BE CREATED)

```typescript
// Click "Alokasi" for Batch 1

// For each material allocation:
{
  "status": "ALLOCATED",
  "allocatedQty": <requestedQty>,
  "notes": "Material dialokasikan untuk produksi"
}

// System Actions:
1. Update batch_material_allocations.status = 'ALLOCATED'
2. Create material_transactions with type = 'OUT'
3. Deduct from materials.currentStock
4. Update production_batches.status = 'MATERIAL_ALLOCATED'
5. Create notification for Kepala Produksi
```

**Database Changes:**

```sql
-- Check allocations updated
SELECT * FROM batch_material_allocations
WHERE "batchId" = '<batch-1-id>' AND status = 'ALLOCATED';

-- Check material transactions (OUT)
SELECT * FROM material_transactions
WHERE type = 'OUT' AND "batchId" = '<batch-1-id>';

-- Check stock deducted
SELECT code, name, "currentStock" FROM materials;
-- Kain Katun: 100 - 100 = 0
-- Benang: 50 - 25 = 25
-- Kancing: 500 - 400 = 100
-- Label: 300 - 100 = 200

-- Check batch status updated
SELECT "batchSku", status FROM production_batches
WHERE id = '<batch-1-id>';
-- status should be 'MATERIAL_ALLOCATED'
```

### Step 4.4: Alokasi Material untuk Batch 2

```typescript
// Allocate for Batch 2 (Celana)
// Expected stock after:
- Kain Drill: 80 - 75 = 5 meter
- Benang: 25 - 9 = 16 roll
- Resleting: 200 - 30 = 170 pieces
- Kancing: 100 - 60 = 40 pieces
```

**Expected:** Semua material teralokasi, stock berkurang, batch status updated

---

## 👔 FASE 5: KEPALA PRODUKSI - ASSIGN KE PEMOTONG

### Step 5.1: Login kembali sebagai Kepala Produksi

```typescript
// Login: produksi / password123
```

### Step 5.2: Assign Batch ke Pemotong

**File:** `app/production/batch/page.tsx`
**API:** `app/api/production-batches/[id]/assign-cutter` (NEEDS TO BE CREATED)

```typescript
// Navigate to /production/batch
// View batches with status "MATERIAL_ALLOCATED"

// For Batch 1:
{
  "batchId": "<batch-1-id>",
  "assignedToId": "<pemotong-user-id>",
  "materialReceived": 100, // Kain Katun (meter)
  "notes": "Prioritas tinggi - deadline 2 minggu"
}

// System Actions:
1. Create cutting_task record
2. Update production_batches.status = 'ASSIGNED_TO_CUTTER'
3. Create notification for Pemotong
4. Set cutting_task.status = 'PENDING'
```

**Database Changes:**

```sql
-- Check cutting task created
SELECT * FROM cutting_tasks
WHERE "batchId" = '<batch-1-id>';

-- Verify fields:
INSERT INTO cutting_tasks {
  id: auto,
  batchId: '<batch-1-id>',
  assignedToId: '<pemotong-id>',
  materialReceived: 100,
  piecesCompleted: 0,
  rejectPieces: 0,
  wasteQty: null,
  status: 'PENDING',
  notes: 'Prioritas tinggi...',
  startedAt: null,
  completedAt: null,
  verifiedAt: null,
  verifiedById: null
}

-- Check batch status
SELECT status FROM production_batches WHERE id = '<batch-1-id>';
-- Should be 'ASSIGNED_TO_CUTTER'

-- Check notification created
SELECT * FROM notifications
WHERE "userId" = '<pemotong-id>'
ORDER BY "createdAt" DESC LIMIT 1;
```

### Step 5.3: Assign Batch 2 ke Pemotong

```typescript
// Same process for Batch 2
{
  "batchId": "<batch-2-id>",
  "assignedToId": "<pemotong-user-id>",
  "materialReceived": 75, // Kain Drill
  "notes": "Stock internal - tidak urgent"
}
```

---

## ✂️ FASE 6: PEMOTONG - PROSES PEMOTONGAN

### Step 6.1: Login sebagai Pemotong

```typescript
// Logout kepala produksi
// Login: pemotong / password123
// Redirect to /cutter/dashboard
```

### Step 6.2: Lihat Task yang Di-assign

**File:** `app/cutter/process/page.tsx` (NEEDS UPDATE)
**API:** `app/api/cutting-tasks/me` (NEEDS TO BE CREATED)

```typescript
// Navigate to /cutter/process
// View assigned tasks

// Display:
- Batch SKU
- Product name
- Target quantity
- Material received
- Status
- Notes
```

### Step 6.3: Mulai Proses Pemotongan Batch 1

**API:** `app/api/cutting-tasks/[id]/start` (NEEDS TO BE CREATED)

```typescript
// Click "Mulai" on Batch 1

{
  "taskId": "<cutting-task-1-id>",
  "startedAt": new Date()
}

// System Actions:
1. Update cutting_tasks.status = 'IN_PROGRESS'
2. Update cutting_tasks.startedAt = now()
3. Update production_batches.status = 'IN_CUTTING'
```

### Step 6.4: Update Progress Pemotongan

**API:** `app/api/cutting-tasks/[id]/progress` (NEEDS TO BE CREATED)

```typescript
// Simulate cutting progress
// Update every few pieces completed

// Progress Update 1:
{
  "taskId": "<cutting-task-1-id>",
  "piecesCompleted": 20,
  "rejectPieces": 1,
  "wasteQty": 2.5, // meter waste
  "notes": "Proses lancar"
}

// Progress Update 2:
{
  "piecesCompleted": 40,
  "rejectPieces": 2,
  "wasteQty": 5.0
}

// Final Update:
{
  "piecesCompleted": 49,
  "rejectPieces": 2, // Total 2 reject (target 50, completed 49+2=51)
  "wasteQty": 6.5,
  "notes": "Pemotongan selesai - 2 potongan reject karena cacat bahan"
}
```

### Step 6.5: Submit untuk Verifikasi

**API:** `app/api/cutting-tasks/[id]/complete` (NEEDS TO BE CREATED)

```typescript
// Click "Selesai & Submit Verifikasi"

{
  "taskId": "<cutting-task-1-id>",
  "completedAt": new Date(),
  "finalPiecesCompleted": 49,
  "finalRejectPieces": 2,
  "finalWasteQty": 6.5,
  "notes": "Total 49 pieces siap jahit, 2 reject"
}

// System Actions:
1. Update cutting_tasks.status = 'COMPLETED'
2. Update cutting_tasks.completedAt = now()
3. Update production_batches.status = 'CUTTING_COMPLETED'
4. Create notification for Kepala Produksi (verification needed)
```

**Database State:**

```sql
SELECT * FROM cutting_tasks WHERE id = '<task-1-id>';
-- status: 'COMPLETED'
-- piecesCompleted: 49
-- rejectPieces: 2
-- wasteQty: 6.5
-- completedAt: [timestamp]
-- verifiedAt: null (waiting verification)

SELECT status FROM production_batches WHERE id = '<batch-1-id>';
-- 'CUTTING_COMPLETED'
```

### Step 6.6: Proses Batch 2 (Similar)

```typescript
// Process Batch 2 with similar steps
// Final result:
{
  "piecesCompleted": 29,
  "rejectPieces": 1,
  "wasteQty": 3.0
}
```

---

## ✅ FASE 7: KEPALA PRODUKSI - VERIFIKASI PEMOTONGAN

### Step 7.1: Login kembali sebagai Kepala Produksi

```typescript
// Login: produksi / password123
```

### Step 7.2: Lihat Pending Verifications

**File:** `app/production/quality/page.tsx`
**API:** `app/api/production/quality` (GET)

```typescript
// Navigate to /production/quality
// View pending verifications for cutting

// Display:
- Batch SKU
- Product name
- Worker name
- Pieces completed
- Reject pieces
- Waste quantity
- Completed date
```

### Step 7.3: Approve Cutting Task Batch 1

**API:** `app/api/production/quality` (POST)

```typescript
// Click "Approve" on Batch 1 cutting

{
  "id": "<cutting-task-1-id>",
  "type": "CUTTING",
  "action": "approve"
}

// System Actions:
1. Update cutting_tasks.status = 'VERIFIED'
2. Update cutting_tasks.verifiedAt = now()
3. Update cutting_tasks.verifiedById = '<produksi-id>'
4. Update production_batches.status = 'CUTTING_VERIFIED'
5. Ready for next stage (sewing)
```

**Database State:**

```sql
SELECT status, "verifiedAt", "verifiedById"
FROM cutting_tasks WHERE id = '<task-1-id>';
-- status: 'VERIFIED'
-- verifiedAt: [timestamp]
-- verifiedById: '<produksi-user-id>'
```

### Step 7.4: Approve Batch 2

```typescript
// Approve Batch 2 cutting task
```

---

## 🧵 FASE 8: KEPALA PRODUKSI - ASSIGN KE PENJAHIT

### Step 8.1: Assign Verified Batch ke Penjahit

**File:** `app/production/batch/page.tsx`
**API:** `app/api/production-batches/[id]/assign-tailor` (NEEDS TO BE CREATED)

```typescript
// Navigate to /production/batch
// Filter: status = 'CUTTING_VERIFIED'

// Assign Batch 1 to Penjahit:
{
  "batchId": "<batch-1-id>",
  "assignedToId": "<penjahit-user-id>",
  "piecesReceived": 49, // From cutting (pieces completed)
  "notes": "Prioritas tinggi"
}

// System Actions:
1. Create sewing_task record
2. Update production_batches.status = 'IN_SEWING'
3. Create notification for Penjahit
4. Set sewing_task.status = 'PENDING'
```

**Database Changes:**

```sql
INSERT INTO sewing_tasks {
  id: auto,
  batchId: '<batch-1-id>',
  assignedToId: '<penjahit-id>',
  piecesReceived: 49,
  piecesCompleted: 0,
  rejectPieces: 0,
  status: 'PENDING',
  notes: 'Prioritas tinggi',
  startedAt: null,
  completedAt: null,
  verifiedAt: null
}
```

### Step 8.2: Assign Batch 2

```typescript
// Similar for Batch 2 with 29 pieces
```

---

## 🪡 FASE 9: PENJAHIT - PROSES PENJAHITAN

### Step 9.1: Login sebagai Penjahit

```typescript
// Logout kepala produksi
// Login: penjahit / password123
// Redirect to /tailor/dashboard
```

### Step 9.2: Mulai Penjahitan Batch 1

**File:** `app/tailor/process/page.tsx` (NEEDS UPDATE)
**API:** `app/api/sewing-tasks/[id]/start` (NEEDS TO BE CREATED)

```typescript
// View assigned tasks
// Click "Mulai" on Batch 1

{
  "taskId": "<sewing-task-1-id>",
  "startedAt": new Date()
}

// System Actions:
1. Update sewing_tasks.status = 'IN_PROGRESS'
2. Update sewing_tasks.startedAt = now()
```

### Step 9.3: Update Progress & Complete

**API:** `app/api/sewing-tasks/[id]/progress` (NEEDS TO BE CREATED)

```typescript
// Progress updates
{
  "piecesCompleted": 25,
  "rejectPieces": 0
}

// Final submission
{
  "taskId": "<sewing-task-1-id>",
  "completedAt": new Date(),
  "finalPiecesCompleted": 48,
  "finalRejectPieces": 1, // 1 reject during sewing
  "notes": "1 piece reject karena jahitan tidak rapi"
}

// System Actions:
1. Update sewing_tasks.status = 'COMPLETED'
2. Update sewing_tasks.completedAt = now()
3. Update production_batches.status = 'SEWING_COMPLETED'
4. Notify Kepala Produksi
```

### Step 9.4: Process Batch 2

```typescript
// Similar process
// Result: 28 completed, 1 reject
```

---

## ✅ FASE 10: KEPALA PRODUKSI - VERIFIKASI PENJAHITAN

### Step 10.1: Verify Sewing Tasks

**File:** `app/production/quality/page.tsx`
**API:** `app/api/production/quality` (POST)

```typescript
// Login: produksi / password123
// Navigate to /production/quality

// Approve Batch 1 sewing:
{
  "id": "<sewing-task-1-id>",
  "type": "SEWING",
  "action": "approve"
}

// System Actions:
1. Update sewing_tasks.status = 'VERIFIED'
2. Update sewing_tasks.verifiedAt = now()
3. Update sewing_tasks.verifiedById = '<produksi-id>'
4. Update production_batches.status = 'SEWING_VERIFIED'
```

### Step 10.2: Approve Batch 2

```typescript
// Same for Batch 2
```

---

## 🎨 FASE 11: KEPALA PRODUKSI - ASSIGN KE FINISHING

### Step 11.1: Assign to Finishing

**API:** `app/api/production-batches/[id]/assign-finishing` (NEEDS TO BE CREATED)

```typescript
// Assign Batch 1 to Finishing:
{
  "batchId": "<batch-1-id>",
  "assignedToId": "<finishing-user-id>",
  "piecesReceived": 48, // From sewing
  "notes": "Pastikan kualitas terjaga"
}

// System Actions:
1. Create finishing_task record
2. Update production_batches.status = 'IN_FINISHING'
3. Notify Finishing staff
```

**Database:**

```sql
INSERT INTO finishing_tasks {
  id: auto,
  batchId: '<batch-1-id>',
  assignedToId: '<finishing-id>',
  piecesReceived: 48,
  piecesCompleted: 0,
  rejectPieces: 0,
  status: 'PENDING'
}
```

### Step 11.2: Assign Batch 2

```typescript
// Similar with 28 pieces
```

---

## 🎁 FASE 12: FINISHING - PROSES AKHIR

### Step 12.1: Login sebagai Finishing

```typescript
// Login: finishing / password123
```

### Step 12.2: Process Finishing Batch 1

**File:** `app/finishing/process/page.tsx` (NEEDS UPDATE)
**API:** `app/api/finishing-tasks/[id]/start` (NEEDS TO BE CREATED)

```typescript
// Start task
{
  "taskId": "<finishing-task-1-id>",
  "startedAt": new Date()
}

// Progress updates
{
  "piecesCompleted": 30,
  "rejectPieces": 0
}

// Complete
{
  "taskId": "<finishing-task-1-id>",
  "completedAt": new Date(),
  "finalPiecesCompleted": 47,
  "finalRejectPieces": 1, // Final QC reject
  "notes": "1 piece reject QC final - kancing rusak"
}

// System Actions:
1. Update finishing_tasks.status = 'COMPLETED'
2. Update finishing_tasks.completedAt = now()
3. Update production_batches.status = 'FINISHING_COMPLETED'
4. Notify Kepala Produksi for final verification
```

### Step 12.3: Process Batch 2

```typescript
// Result: 28 completed, 0 reject
```

---

## ✅ FASE 13: KEPALA PRODUKSI - VERIFIKASI FINAL

### Step 13.1: Final Verification Batch 1

**API:** `app/api/production/quality` (POST)

```typescript
// Login: produksi / password123

// Approve Batch 1 finishing:
{
  "id": "<finishing-task-1-id>",
  "type": "FINISHING",
  "action": "approve"
}

// System Actions:
1. Update finishing_tasks.status = 'VERIFIED'
2. Update finishing_tasks.verifiedAt = now()
3. Update finishing_tasks.verifiedById = '<produksi-id>'
4. Update production_batches.status = 'COMPLETED'
5. Update production_batches.actualQuantity = 47
6. Update production_batches.rejectQuantity = 3 (2+1+1)
7. Update production_batches.completedDate = now()
8. Create final audit log
```

**Final Database State for Batch 1:**

```sql
SELECT * FROM production_batches WHERE id = '<batch-1-id>';
-- batchSku: 'BATCH-20251203-001'
-- productId: '<prod-001-id>'
-- targetQuantity: 50
-- actualQuantity: 47
-- rejectQuantity: 3
-- status: 'COMPLETED'
-- completedDate: [timestamp]

SELECT * FROM cutting_tasks WHERE "batchId" = '<batch-1-id>';
-- status: 'VERIFIED'
-- piecesCompleted: 49
-- rejectPieces: 2

SELECT * FROM sewing_tasks WHERE "batchId" = '<batch-1-id>';
-- status: 'VERIFIED'
-- piecesCompleted: 48
-- rejectPieces: 1

SELECT * FROM finishing_tasks WHERE "batchId" = '<batch-1-id>';
-- status: 'VERIFIED'
-- piecesCompleted: 47
-- rejectPieces: 1

-- Material usage tracking
SELECT * FROM material_transactions
WHERE "batchId" = '<batch-1-id>' AND type = 'OUT';
-- All materials used recorded
```

### Step 13.2: Complete Batch 2

```typescript
// Final state:
- targetQuantity: 30
- actualQuantity: 28
- rejectQuantity: 2 (1+1+0)
- status: 'COMPLETED'
```

---

## 📊 FASE 14: OWNER - VIEW REPORTS

### Step 14.1: Login sebagai Owner

```typescript
// Login: owner / password123
```

### Step 14.2: View Production Dashboard

**File:** `app/owner/dashboard/page.tsx`
**API:** `app/api/stocks` (GET)

```typescript
// Navigate to /owner/dashboard

// View:
1. Completed batches: 2
2. Total pieces produced: 75 (47 + 28)
3. Total rejects: 5 (3 + 2)
4. Efficiency: 93.75% (75/80)
5. Material usage summary
6. Production timeline
```

### Step 14.3: View Detailed Batch Report

**File:** `app/owner/production-batches/[id]/page.tsx`

```typescript
// Click on Batch 1 for details

// Display:
- Batch Information
- Product details
- Material allocations
- Timeline:
  * Created: [date]
  * Material allocated: [date]
  * Cutting: [start] - [end]
  * Cutting verified: [date]
  * Sewing: [start] - [end]
  * Sewing verified: [date]
  * Finishing: [start] - [end]
  * Finishing verified: [date]
  * Completed: [date]
- Quality metrics per stage
- Worker assignments
- Reject analysis
```

### Step 14.4: View Stock Status

**File:** `app/owner/stocks/page.tsx`

```typescript
// Current stock after production:
- Kain Katun: 0 meter (started 100, used 100)
- Kain Drill: 5 meter (started 80, used 75)
- Benang: 16 roll (started 50, used 34)
- Kancing: 40 pieces (started 500, used 460)
- Resleting: 170 pieces (started 200, used 30)
- Label: 200 pieces (started 300, used 100)

// Low stock alerts:
⚠️ Kain Katun: Habis - perlu restock
⚠️ Kancing: Low stock
```

---

## 🎯 FASE 15: VERIFICATION & AUDIT

### Step 15.1: Verify Data Integrity

**Check Production Flow:**

```sql
-- Verify complete workflow for Batch 1
SELECT
  pb."batchSku",
  pb.status,
  pb."targetQuantity",
  pb."actualQuantity",
  pb."rejectQuantity",
  ct.status as cutting_status,
  ct."piecesCompleted" as cutting_pieces,
  st.status as sewing_status,
  st."piecesCompleted" as sewing_pieces,
  ft.status as finishing_status,
  ft."piecesCompleted" as finishing_pieces
FROM production_batches pb
LEFT JOIN cutting_tasks ct ON pb.id = ct."batchId"
LEFT JOIN sewing_tasks st ON pb.id = st."batchId"
LEFT JOIN finishing_tasks ft ON pb.id = ft."batchId"
WHERE pb."batchSku" = 'BATCH-20251203-001';

-- Expected Result:
-- batchSku: BATCH-20251203-001
-- status: COMPLETED
-- targetQuantity: 50
-- actualQuantity: 47
-- rejectQuantity: 3
-- cutting_status: VERIFIED (49 pieces)
-- sewing_status: VERIFIED (48 pieces)
-- finishing_status: VERIFIED (47 pieces)
```

**Check Material Traceability:**

```sql
-- Track material usage for Batch 1
SELECT
  m.name as material_name,
  bma."requestedQty",
  bma."allocatedQty",
  bma.status as allocation_status,
  mt.quantity as transaction_qty,
  mt.type as transaction_type,
  mt."createdAt"
FROM batch_material_allocations bma
JOIN materials m ON bma."materialId" = m.id
JOIN material_transactions mt ON mt."batchId" = bma."batchId"
  AND mt."materialId" = bma."materialId"
WHERE bma."batchId" = '<batch-1-id>'
ORDER BY m.name;

-- Verify each material:
-- 1. requestedQty = allocatedQty
-- 2. transaction type = 'OUT'
-- 3. transaction qty = allocatedQty
```

**Check Audit Trail:**

```sql
-- View all actions for production workflow
SELECT
  al.action,
  al.entity,
  u.name as user_name,
  u.role,
  al."createdAt"
FROM audit_logs al
JOIN users u ON al."userId" = u.id
WHERE al.entity IN ('batch', 'cutting', 'sewing', 'finishing')
  AND al."createdAt" >= '2025-12-03'
ORDER BY al."createdAt";

-- Expected actions in sequence:
-- 1. OWNER: product created
-- 2. KEPALA_GUDANG: material IN transactions
-- 3. KEPALA_PRODUKSI: batch created
-- 4. KEPALA_GUDANG: material allocated
-- 5. KEPALA_PRODUKSI: assigned to cutter
-- 6. PEMOTONG: cutting completed
-- 7. KEPALA_PRODUKSI: cutting verified
-- 8. KEPALA_PRODUKSI: assigned to tailor
-- 9. PENJAHIT: sewing completed
-- 10. KEPALA_PRODUKSI: sewing verified
-- 11. KEPALA_PRODUKSI: assigned to finishing
-- 12. FINISHING: finishing completed
-- 13. KEPALA_PRODUKSI: finishing verified (batch completed)
```

### Step 15.2: Verify Notifications

```sql
-- Check notifications sent to each user
SELECT
  u.name,
  u.role,
  n.type,
  n.title,
  n.message,
  n."isRead",
  n."createdAt"
FROM notifications n
JOIN users u ON n."userId" = u.id
WHERE n."createdAt" >= '2025-12-03'
ORDER BY n."createdAt";

-- Expected notifications:
-- 1. KEPALA_PRODUKSI: Material allocated for batch
-- 2. PEMOTONG: New cutting task assigned
-- 3. KEPALA_PRODUKSI: Cutting task completed (needs verification)
-- 4. PENJAHIT: New sewing task assigned
-- 5. KEPALA_PRODUKSI: Sewing task completed (needs verification)
-- 6. FINISHING: New finishing task assigned
-- 7. KEPALA_PRODUKSI: Finishing task completed (needs verification)
-- 8. OWNER: Batch production completed
```

---

## 📝 SUMMARY: COMPLETE WORKFLOW CHECKLIST

### ✅ Data Created Throughout Workflow:

**Products:**

- [x] 2 products created with BOM

**Materials:**

- [x] 6 material types with stock

**Material Transactions:**

- [x] 6 IN transactions (stock input)
- [x] 8 OUT transactions (2 batches × 4 materials each)

**Production Batches:**

- [x] 2 batches created
- [x] Status progression tracked
- [x] Actual vs target quantities recorded

**Material Allocations:**

- [x] 8 allocation records (2 batches × 4 materials)
- [x] All allocated and consumed

**Tasks:**

- [x] 2 cutting tasks (created, progressed, completed, verified)
- [x] 2 sewing tasks (created, progressed, completed, verified)
- [x] 2 finishing tasks (created, progressed, completed, verified)

**Notifications:**

- [x] ~14-16 notifications sent to relevant users

**Audit Logs:**

- [x] ~20-25 audit entries tracking all major actions

### 🎯 Success Criteria:

1. ✅ Complete workflow from product creation to final QC
2. ✅ All data relationships intact (foreign keys valid)
3. ✅ Material stock accurately tracked (IN/OUT)
4. ✅ Production traceability (batch → tasks → results)
5. ✅ Quality control at each stage
6. ✅ Reject tracking per stage
7. ✅ Worker assignments recorded
8. ✅ Timestamps for all major events
9. ✅ Notifications delivered
10. ✅ Audit trail complete

---

## 🚀 NEXT STEPS FOR AI AGENT

### Priority 1: Create Missing API Endpoints

**Material Allocation:**

```typescript
// app/api/material-allocations/route.ts (GET - list pending)
// app/api/material-allocations/[id]/route.ts (PATCH - allocate)
```

**Task Assignment:**

```typescript
// app/api/production-batches/[id]/assign-cutter/route.ts (POST)
// app/api/production-batches/[id]/assign-tailor/route.ts (POST)
// app/api/production-batches/[id]/assign-finishing/route.ts (POST)
```

**Task Management:**

```typescript
// app/api/cutting-tasks/me/route.ts (GET - my tasks)
// app/api/cutting-tasks/[id]/start/route.ts (PATCH)
// app/api/cutting-tasks/[id]/progress/route.ts (PATCH)
// app/api/cutting-tasks/[id]/complete/route.ts (PATCH)

// Similar for sewing-tasks and finishing-tasks
```

### Priority 2: Update UI Components

**Warehouse Allocation Page:**

```typescript
// app/warehouse/allocation/page.tsx - NEW
// View pending allocations, approve, track stock
```

**Worker Process Pages:**

```typescript
// app/cutter/process/page.tsx - UPDATE
// app/tailor/process/page.tsx - UPDATE
// app/finishing/process/page.tsx - UPDATE
// Add start, progress, complete functionality
```

**Production Assignment:**

```typescript
// app/production/batch/page.tsx - UPDATE
// Add assign to cutter/tailor/finishing actions
```

### Priority 3: Implement Business Logic

1. **Material Allocation Logic:**

   - Check stock availability
   - Reserve materials
   - Create OUT transactions
   - Update stock
   - Update batch status

2. **Task Assignment Logic:**

   - Create task record
   - Link to worker
   - Send notification
   - Update batch status

3. **Task Progress Logic:**

   - Track real-time progress
   - Allow incremental updates
   - Validate data (pieces completed ≤ target)

4. **Verification Logic:**
   - Quality control checks
   - Approve/reject functionality
   - Move to next stage
   - Final completion

### Priority 4: Notifications & Audit

1. **Notification System:**

   - Create notification on key events
   - Mark as read functionality
   - Real-time updates (optional: WebSocket)

2. **Audit Logging:**
   - Log all CRUD operations
   - Track user actions
   - Timestamp everything

### Priority 5: Reporting & Analytics

1. **Dashboard Enhancements:**

   - Real-time production metrics
   - Efficiency calculations
   - Bottleneck detection

2. **Reports:**
   - Production summary
   - Material usage
   - Worker productivity
   - Quality metrics
   - Export to PDF/Excel

---

## 🧪 TESTING CHECKLIST

### Test Case 1: Happy Path

- [ ] Complete Batch 1 workflow without any errors
- [ ] All stages completed
- [ ] Data integrity maintained

### Test Case 2: Stock Shortage

- [ ] Try to allocate when stock insufficient
- [ ] System should prevent allocation
- [ ] Display warning message

### Test Case 3: High Reject Rate

- [ ] Simulate high rejects at cutting (>20%)
- [ ] Check if verification flags this
- [ ] System should alert

### Test Case 4: Concurrent Batches

- [ ] Process multiple batches simultaneously
- [ ] Ensure no data collision
- [ ] Stock calculations accurate

### Test Case 5: Worker Load

- [ ] Assign multiple tasks to same worker
- [ ] Display workload properly
- [ ] Prevent over-assignment (optional)

---

## 📦 DELIVERABLES

When fully implemented, the system will have:

1. ✅ **Complete CRUD** for all entities
2. ✅ **Full workflow** from start to finish
3. ✅ **Role-based access control**
4. ✅ **Material traceability**
5. ✅ **Production tracking**
6. ✅ **Quality control**
7. ✅ **Notifications**
8. ✅ **Audit trail**
9. ✅ **Reporting**
10. ✅ **Data integrity**

---

**END OF IMPLEMENTATION GUIDE**

_This document provides a complete roadmap for AI Agent to implement the full TrackPro production workflow with proper database persistence and data integrity._
