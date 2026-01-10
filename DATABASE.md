# TrackPro Database Documentation

## 📊 Database Schema Overview

Database ini dirancang optimal untuk mendukung sistem manajemen produksi garmen dengan fitur tracking lengkap, role-based access control, dan audit trail.

### 🗄️ Database Information

- **Database Name**: `trackpro-db`
- **Database Type**: PostgreSQL
- **ORM**: Prisma 7.0.1
- **Host**: localhost:5432

---

## 👥 User Roles

Sistem mendukung 6 role berbeda:

| Role              | Description     | Access Level                                          |
| ----------------- | --------------- | ----------------------------------------------------- |
| `OWNER`           | Pemilik bisnis  | Full access - Dashboard, Products, Materials, Reports |
| `KEPALA_GUDANG`   | Kepala Gudang   | Material management, stock allocation                 |
| `KEPALA_PRODUKSI` | Kepala Produksi | Production batch management, quality control          |
| `PEMOTONG`        | Staff Pemotong  | Cutting tasks and progress updates                    |
| `PENJAHIT`        | Staff Penjahit  | Sewing tasks and progress updates                     |
| `FINISHING`       | Staff Finishing | Finishing tasks and final quality check               |

---

## 📋 Database Tables

### 1. **users** - User Management & Authentication

```prisma
- id: String (cuid)
- username: String (unique)
- email: String (unique)
- password: String (bcrypt hashed)
- name: String
- role: UserRole enum
- isActive: Boolean
- createdAt, updatedAt
```

**Indexes**: email, username, role

### 2. **products** - Product Catalog

```prisma
- id, sku (unique)
- name, description
- price: Decimal
- status: ACTIVE | INACTIVE | DISCONTINUED
- images: String[] (array of URLs)
- isDeleted: Boolean (soft delete)
- createdById: FK to users
```

**Features**:

- Soft delete support
- Multiple images per product
- SKU-based identification

### 3. **materials** - Bahan Baku (Raw Materials)

```prisma
- id, code (unique)
- name, description
- unit: METER | YARD | KILOGRAM | GRAM | PIECE | ROLL | BOX
- currentStock: Decimal
- minimumStock: Decimal (for low-stock alerts)
- price: Decimal
- createdById: FK to users
```

**Features**:

- Real-time stock tracking
- Low-stock notifications support
- Multiple unit types

### 4. **product_materials** - Product Bill of Materials (BOM)

```prisma
- productId, materialId (composite unique)
- quantity: Decimal
- unit: MaterialUnit
```

**Purpose**: Defines which materials and quantities are needed per product.

### 5. **material_transactions** - Stock Movement History

```prisma
- materialId: FK
- type: IN | OUT | ADJUSTMENT | RETURN
- quantity: Decimal
- batchId: FK (optional, for production usage)
- userId: FK (who performed the transaction)
- notes: String
- createdAt
```

**Features**:

- Complete audit trail
- Links transactions to production batches
- Supports various transaction types

### 6. **production_batches** - Batch Produksi

```prisma
- id, batchSku (unique, format: PROD-YYYYMMDD-XXX)
- productId: FK
- targetQuantity, actualQuantity, rejectQuantity: Int
- status: 13 different statuses tracking entire workflow
- startDate, completedDate
- createdById: FK
```

**Status Flow**:

1. PENDING → 2. MATERIAL_REQUESTED → 3. MATERIAL_ALLOCATED →
2. ASSIGNED_TO_CUTTER → 5. IN_CUTTING → 6. CUTTING_COMPLETED →
3. CUTTING_VERIFIED → 8. IN_SEWING → 9. SEWING_COMPLETED →
4. SEWING_VERIFIED → 11. IN_FINISHING → 12. FINISHING_COMPLETED →
5. COMPLETED

### 7. **batch_material_allocations** - Material Allocation Requests

```prisma
- batchId, materialId
- requestedQty, allocatedQty: Decimal
- status: REQUESTED | APPROVED | REJECTED | ALLOCATED
```

**Purpose**: Kepala Produksi requests materials, Kepala Gudang allocates.

### 8. **cutting_tasks** - Pemotongan Tasks

```prisma
- batchId: FK (unique)
- assignedToId: FK to users (PEMOTONG role)
- materialReceived, piecesCompleted, rejectPieces, wasteQty
- status: PENDING | IN_PROGRESS | COMPLETED | VERIFIED | REJECTED
- startedAt, completedAt, verifiedAt
```

### 9. **sewing_tasks** - Penjahitan Tasks

```prisma
- batchId: FK (unique)
- assignedToId: FK to users (PENJAHIT role)
- piecesReceived, piecesCompleted, rejectPieces
- status, notes
- startedAt, completedAt, verifiedAt
```

### 10. **finishing_tasks** - Finishing Tasks

```prisma
- batchId: FK (unique)
- assignedToId: FK to users (FINISHING role)
- piecesReceived, piecesCompleted, rejectPieces
- status, notes
- startedAt, completedAt
```

### 11. **quality_checks** - Quality Control Records

```prisma
- batchId: FK
- stage: CUTTING | SEWING | FINISHING | FINAL
- status: PASSED | FAILED | NEED_REWORK
- passedQty, failedQty, reworkQty
- remarks
- checkedAt
```

**Purpose**: Quality control at each production stage.

### 12. **batch_timeline** - Production Timeline Tracking

```prisma
- batchId: FK
- event: TimelineEvent enum (16 different events)
- details: String
- createdAt
```

**Features**:

- Complete history of batch lifecycle
- Audit trail for production process
- Used for analytics and bottleneck detection

### 13. **notifications** - User Notifications

```prisma
- userId: FK
- type: LOW_STOCK | BATCH_ASSIGNMENT | VERIFICATION_NEEDED | etc.
- title, message, link
- isRead: Boolean
- createdAt
```

**Use Cases**:

- Low stock alerts
- Task assignments
- Verification requests
- Deadline reminders

### 14. **audit_logs** - System Audit Trail

```prisma
- userId: FK
- action: CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT | APPROVE | REJECT
- entity: String (table name)
- entityId: String (record ID)
- oldValues, newValues: Json
- ipAddress, userAgent
- createdAt
```

**Features**:

- Complete activity logging
- JSON diff of changes
- User tracking with IP and User Agent

---

## 🔐 Security Features

1. **Password Security**: Bcrypt hashing with salt
2. **SQL Injection Prevention**: Prisma prepared statements
3. **Soft Delete**: Products use `isDeleted` flag
4. **Audit Trail**: All critical actions logged
5. **Index Optimization**: Strategic indexes on frequently queried fields

---

## 📈 Performance Optimization

### Indexes Created:

- **users**: email, username, role
- **products**: sku, status, createdById
- **materials**: code, currentStock, minimumStock
- **material_transactions**: materialId, type, createdAt, batchId
- **production_batches**: batchSku, status, productId, createdAt
- **batch_material_allocations**: batchId, status
- **tasks (cutting/sewing/finishing)**: status, assignedToId
- **quality_checks**: batchId, stage
- **batch_timeline**: batchId, createdAt
- **notifications**: userId, isRead, createdAt
- **audit_logs**: userId, entity, createdAt

### Query Optimization:

- Foreign key constraints for data integrity
- Composite unique indexes where needed
- Cascade deletes for related data cleanup

---

## 🧪 Test Data

Database sudah di-seed dengan:

### Users (Password: `password123`):

- owner@trackpro.com (OWNER)
- gudang@trackpro.com (KEPALA_GUDANG)
- produksi@trackpro.com (KEPALA_PRODUKSI)
- pemotong@trackpro.com (PEMOTONG)
- penjahit@trackpro.com (PENJAHIT)
- finishing@trackpro.com (FINISHING)

### Materials:

- MAT-KAIN-001: Kain Katun Premium (500 meter)
- MAT-BENANG-001: Benang Jahit Premium (200 roll)
- MAT-KANCING-001: Kancing Kayu (1000 piece)

### Products:

- PROD-GAMIS-001: Gamis Premium Elegant (Rp 350,000)
- PROD-GAMIS-002: Gamis Casual Daily (Rp 250,000)

### Production Batch:

- PROD-YYYYMMDD-001: Sample batch with material requests

---

## 🛠️ Database Commands

```bash
# Generate Prisma Client
pnpm db:generate

# Create new migration
pnpm db:migrate

# Seed database
pnpm db:seed

# Open Prisma Studio (GUI)
pnpm db:studio

# Reset database (WARNING: Deletes all data)
pnpm db:reset
```

---

## 📊 Entity Relationship Diagram (ERD)

```
users (1) ──────────> (N) products
users (1) ──────────> (N) materials
users (1) ──────────> (N) production_batches
users (1) ──────────> (N) material_transactions
users (1) ──────────> (N) cutting_tasks
users (1) ──────────> (N) sewing_tasks
users (1) ──────────> (N) finishing_tasks
users (1) ──────────> (N) notifications
users (1) ──────────> (N) audit_logs

products (N) <───────> (N) materials (via product_materials)
products (1) ──────────> (N) production_batches

materials (1) ──────────> (N) material_transactions
materials (1) ──────────> (N) batch_material_allocations

production_batches (1) ──> (N) material_transactions
production_batches (1) ──> (N) batch_material_allocations
production_batches (1) ──> (1) cutting_task
production_batches (1) ──> (1) sewing_task
production_batches (1) ──> (1) finishing_task
production_batches (1) ──> (N) quality_checks
production_batches (1) ──> (N) batch_timeline
```

---

## 🚀 Next Steps

1. **Implement Authentication**: NextAuth.js with Prisma adapter
2. **Create API Routes**: RESTful APIs for all entities
3. **Add Real-time Updates**: WebSocket for live notifications
4. **Implement Caching**: Redis for frequently accessed data
5. **Add Backup Strategy**: Automated daily backups
6. **Setup Monitoring**: Database query performance monitoring

---

## 📝 Notes

- All decimal fields use `Decimal(15,2)` for currency and `Decimal(15,3)` for quantities
- Timestamps use `DateTime` with automatic `@default(now())` and `@updatedAt`
- All IDs use `cuid()` for security and sortability
- Foreign keys have proper `onDelete` cascades where appropriate
- Enums are used for fixed-value fields to ensure data integrity
