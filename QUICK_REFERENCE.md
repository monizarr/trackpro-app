# 📚 TrackPro - Quick Reference Guide

## 🔐 User Credentials

```
Owner:           owner / password123
Kepala Gudang:   gudang / password123
Kepala Produksi: produksi / password123
Pemotong:        pemotong / password123
Penjahit:        penjahit / password123
Finishing:       finishing / password123
```

## 🎯 Testing Workflow Scripts

All scripts are located in `/scripts` folder:

```bash
# Phase 3-5: Batch Creation to Assignment
npx tsx scripts/fase3-create-batches.ts
npx tsx scripts/fase4-allocate-materials.ts
npx tsx scripts/fase5-assign-cutter.ts

# Phase 6-8: Cutting Workflow
npx tsx scripts/fase6-8-cutting-to-sewing.ts

# Phase 9-10: Sewing Workflow
npx tsx scripts/fase9-10-sewing.ts

# Phase 11-14: Finishing to Completion
npx tsx scripts/fase11-14-finishing-to-completion.ts

# Phase 15: Verification & Audit
npx tsx scripts/fase15-verification-audit.ts

# Reset to Phase 3 (for testing)
npx tsx scripts/reset-to-fase3.ts
```

## 📡 API Endpoints Reference

### Cutting Tasks

```
GET    /api/cutting-tasks/me              - Get my cutting tasks
PATCH  /api/cutting-tasks/[id]/start      - Start cutting task
PATCH  /api/cutting-tasks/[id]/progress   - Update progress
PATCH  /api/cutting-tasks/[id]/complete   - Complete task
```

### Sewing Tasks

```
GET    /api/sewing-tasks/me               - Get my sewing tasks
PATCH  /api/sewing-tasks/[id]/start       - Start sewing task
PATCH  /api/sewing-tasks/[id]/progress    - Update progress
PATCH  /api/sewing-tasks/[id]/complete    - Complete task
```

### Finishing Tasks

```
GET    /api/finishing-tasks/me            - Get my finishing tasks
PATCH  /api/finishing-tasks/[id]/start    - Start finishing task
PATCH  /api/finishing-tasks/[id]/progress - Update progress
PATCH  /api/finishing-tasks/[id]/complete - Complete task
```

### Batch Assignments

```
POST   /api/production-batches/[id]/assign-tailor    - Assign to tailor
POST   /api/production-batches/[id]/assign-finishing - Assign to finishing
```

### Quality Control

```
GET    /api/production/quality            - Get pending verifications
POST   /api/production/quality            - Approve/Reject tasks
```

## 🔄 Workflow Sequence

```
1. Owner: Create Product with BOM
2. Kepala Gudang: Input Material Stock (IN transactions)
3. Kepala Produksi: Create Production Batch
4. Kepala Gudang: Allocate Materials (OUT transactions)
5. Kepala Produksi: Assign to Pemotong
6. Pemotong: Start → Progress → Complete Cutting
7. Kepala Produksi: Verify Cutting
8. Kepala Produksi: Assign to Penjahit
9. Penjahit: Start → Progress → Complete Sewing
10. Kepala Produksi: Verify Sewing
11. Kepala Produksi: Assign to Finishing
12. Finishing: Start → Progress → Complete Finishing
13. Kepala Produksi: Verify Finishing (Batch COMPLETED)
14. Owner: View Reports & Analytics
15. System: Audit & Verification
```

## 📊 Batch Status Flow

```
PENDING
  ↓
MATERIAL_ALLOCATED
  ↓
ASSIGNED_TO_CUTTER
  ↓
IN_CUTTING
  ↓
CUTTING_COMPLETED
  ↓
CUTTING_VERIFIED
  ↓
IN_SEWING
  ↓
SEWING_COMPLETED
  ↓
SEWING_VERIFIED
  ↓
IN_FINISHING
  ↓
FINISHING_COMPLETED
  ↓
COMPLETED
```

## 🗄️ Database Quick Queries

### Check Production Status

```sql
SELECT
  "batchSku",
  status,
  "targetQuantity",
  "actualQuantity",
  "rejectQuantity"
FROM production_batches;
```

### Check Material Stock

```sql
SELECT
  name,
  "currentStock",
  unit,
  "minStock"
FROM materials;
```

### Check All Tasks

```sql
-- Cutting
SELECT * FROM cutting_tasks ORDER BY "createdAt" DESC;

-- Sewing
SELECT * FROM sewing_tasks ORDER BY "createdAt" DESC;

-- Finishing
SELECT * FROM finishing_tasks ORDER BY "createdAt" DESC;
```

### Check Notifications

```sql
SELECT
  u.name,
  n.type,
  n.title,
  n."isRead",
  n."createdAt"
FROM notifications n
JOIN users u ON n."userId" = u.id
ORDER BY n."createdAt" DESC;
```

## 🛠️ Troubleshooting

### Issue: Stock not updating

**Solution:** Check material_transactions table for OUT records

### Issue: Task not appearing

**Solution:** Verify batch status matches expected stage

### Issue: Notification not received

**Solution:** Check if user role matches expected recipient

### Issue: Cannot allocate materials

**Solution:** Ensure currentStock >= requestedQty

## 📈 Performance Metrics

### Current System Capacity

- **Batches Completed:** 2
- **Total Production:** 73 pieces
- **Efficiency:** 91.25%
- **Reject Rate:** 8.75%
- **Average Time:** 0.58 hours/batch

## 🎨 UI Routes (To Be Implemented)

```
/owner/dashboard          - Owner dashboard
/owner/products           - Product management
/owner/stocks             - Stock overview

/warehouse/dashboard      - Warehouse dashboard
/warehouse/stock          - Stock management
/warehouse/allocation     - Material allocation

/production/dashboard     - Production dashboard
/production/batch         - Batch management
/production/quality       - Quality verification

/cutter/dashboard         - Cutter dashboard
/cutter/process           - Cutting tasks

/tailor/dashboard         - Tailor dashboard
/tailor/process           - Sewing tasks

/finishing/dashboard      - Finishing dashboard
/finishing/process        - Finishing tasks
```

## 🚀 Next Steps

1. **UI Development:** Build frontend pages for each role
2. **Real-time Updates:** Implement WebSocket for live notifications
3. **Reports:** Create detailed analytics and export features
4. **Mobile App:** Build mobile version for workers
5. **Barcode/QR:** Implement scanning for material tracking
6. **Advanced Analytics:** AI-powered insights and predictions

---

**For detailed implementation guide, see:** `AI_AGENT_STEPS.md`  
**For complete results, see:** `IMPLEMENTATION_COMPLETE.md`
