# TrackPro - AI Agent Instructions

## Project Overview

Full-stack garment production management system tracking materials through cutting → sewing → finishing → warehouse verification. Built with **Next.js 16** (App Router), **PostgreSQL**, **Prisma ORM**, and **NextAuth v4** for role-based access control.

## Core Architecture

### Database-First Design

- **Single source of truth**: Prisma schema (`prisma/schema.prisma`) defines ALL data structures
- **After schema changes**: Always run `npx prisma generate` before accessing Prisma Client
- **Material units**: ALL materials use METER as primary unit (enforced at API level in `app/api/materials/route.ts`)
- **Soft deletes**: Products and materials use `isActive`/`isDeleted` flags, never hard delete

### Role-Based Workflow (6 Roles)

```
OWNER → Kepala Produksi → Kepala Gudang → Pemotong → Penjahit → Finishing
```

**Critical auth pattern** (used in ALL protected API routes):

```typescript
import { requireRole } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const session = await requireRole(["OWNER", "KEPALA_GUDANG"]);
  // session.user.id is now available
}
```

### Production Batch State Machine

Status progression is **strictly sequential** (enforced in `app/api/production-batches/[id]/route.ts`):

```
PENDING → MATERIAL_REQUESTED (optional) → MATERIAL_ALLOCATED → ASSIGNED_TO_CUTTER →
CUTTING_COMPLETED → CUTTING_VERIFIED → ASSIGNED_TO_SEWER → IN_SEWING →
SEWING_COMPLETED → SEWING_VERIFIED → [Sub-Batch at Finishing] →
IN_FINISHING → FINISHING_COMPLETED → SUBMITTED_TO_WAREHOUSE →
WAREHOUSE_VERIFIED → COMPLETED
```

**Key State Transitions:**

1. **PENDING/MATERIAL_REQUESTED** → **MATERIAL_ALLOCATED**: Confirm batch to allocate materials
2. **MATERIAL_ALLOCATED** → **ASSIGNED_TO_CUTTER**: Assign to Kepala Pemotong (creates CuttingTask)
3. **ASSIGNED_TO_CUTTER** → **CUTTING_COMPLETED**: Ka. Pemotong/Ka. Prod inputs cutting results (NO REJECT at cutting stage)
4. **CUTTING_COMPLETED** → **CUTTING_VERIFIED**: Owner/Ka. Prod verifies cutting quality
5. **CUTTING_VERIFIED** → **ASSIGNED_TO_SEWER**: Assign to Ka. Penjahit (starts sewing)
6. **IN_SEWING** → **SEWING_COMPLETED**: Ka. Penjahit inputs sewing results (NO REJECT at sewing stage)
7. **SEWING_COMPLETED** → **SEWING_VERIFIED**: Owner/Ka. Prod verifies sewing quality
8. **SEWING_VERIFIED** → **Sub-Batches at Finishing**: Create sub-batches for partial finishing outputs
9. **IN_FINISHING** → **FINISHING_COMPLETED**: Ka. Finishing inputs results (can be partial). **This is where rejects are identified** (kotor/dirty, sobek/torn, rusak jahit/sewing damage)
10. **FINISHING_COMPLETED** → **SUBMITTED_TO_WAREHOUSE**: Ka. Prod submits finished goods to warehouse (can be partial batches)
11. **SUBMITTED_TO_WAREHOUSE** → **WAREHOUSE_VERIFIED**: Owner/Ka. Gudang verifies quantity/quality
12. **WAREHOUSE_VERIFIED** → **COMPLETED**: When ALL finishing output equals warehouse input

**Important Notes:**

- **Never skip states**. Each transition updates `ProductionBatch.status` and creates audit logs.
- **NO rejects at Cutting and Sewing stages** - quality issues are identified at Finishing
- **Sub-Batches are at FINISHING** (not sewing) - used to track partial finishing batches being sent to warehouse
- **No individual worker assignment** - focus is on coordination between heads (Ka. Produksi, Ka. Pemotong, Ka. Penjahit, Ka. Finishing, Ka. Gudang)
- Steps 9-11 (Finishing → Warehouse) are **iterative** until all sewing output is processed
- Owner and Kepala Produksi can perform all production actions (assign, verify, input results)

**Reject/Defect Handling at Finishing:**

- **Kotor (Dirty)**: Re-production by washing at warehouse
- **Sobek (Torn)**: Bad Stock (BS) - stored separately
- **Rusak Jahit (Sewing Damage)**: Bad Stock (BS) - stored separately

## Development Workflows

### Database Operations

```bash
# After schema.prisma changes
npx prisma migrate dev        # Creates migration + applies
npx prisma generate           # Regenerates Prisma Client

# Reset & seed (development only)
npx prisma migrate reset      # Drops DB, runs migrations, seeds

# Inspect DB
npx prisma studio             # GUI at http://localhost:5555
```

### Running the App

```bash
pnpm dev                      # Starts on port 3000
pnpm build                    # Production build
```

### Test Credentials (from `prisma/seed.ts`)

```
owner / password123 (OWNER)
gudang / password123 (KEPALA_GUDANG)
produksi / password123 (KEPALA_PRODUKSI)
pemotong / password123 (PEMOTONG)
penjahit / password123 (PENJAHIT)
penjahit2 / password123 (PENJAHIT)
penjahit3 / password123 (PENJAHIT)
finishing / password123 (FINISHING)
finishing2 / password123 (FINISHING)
finishing3 / password123 (FINISHING)
gudang / password123 (WAREHOUSE_VERIFIER)
```

## Critical Patterns

### API Response Format

**Always** use this structure (established in `app/api/stocks/route.ts`):

```typescript
return NextResponse.json({
  success: true,
  data: result,
});

// On error
return NextResponse.json(
  {
    success: false,
    error: "Error message",
  },
  { status: 400 },
);
```

### Toast Notifications

Use custom wrapper (`lib/toast.ts`) instead of sonner directly:

```typescript
import { toast } from "@/lib/toast";

toast.success("Title", "Description");
toast.error("Error", "Details");
toast.warning("Warning", "Details");
toast.info("Info", "Details");
```

### Form Handling Pattern

See `app/owner/stocks/page.tsx` for complete example:

```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);

  try {
    const response = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (data.success) {
      await refetchData(); // Refresh lists
      setIsDialogOpen(false);
      resetForm();
      toast.success("Success", "Operation completed");
    } else {
      toast.error("Failed", data.error);
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error("Error", "Operation failed");
  } finally {
    setIsSaving(false);
  }
};
```

### Mobile-First Responsive Pattern

**All dialogs and grids** must be mobile-responsive (see `MOBILE_RESPONSIVE_UPDATE.md`):

```typescript
// Dialogs
<DialogContent className="max-w-[95vw] sm:max-w-lg">

// Grids (1 column mobile, 2 desktop)
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// Buttons (stack vertical on mobile)
<div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
```

### Material Transactions with Purchase Info

When `type === "IN"`, **always** include purchase tracking fields:

```typescript
{
  materialId: string,
  type: "IN" | "OUT" | "ADJUSTMENT" | "RETURN",
  quantity: number,
  notes?: string,
  // Only for type="IN"
  rollQuantity?: number,
  meterPerRoll?: number,
  purchaseOrderNumber?: string,
  supplier?: string,
  purchaseDate?: string,
  purchaseNotes?: string
}
```

**Do not send** `unit` field - API determines it from material record.

## Component & File Structure

### shadcn/ui Components

Located in `components/ui/`. Use for ALL UI elements:

- Dialog, AlertDialog (modals)
- Button, Input, Label, Textarea, Select
- Card, Badge, Separator, Tabs
- Custom `Select` is HTML wrapper (not Radix Select)

### Layout Components

- `components/layout/sidebar.tsx` - Role-specific navigation
- `components/layout/header.tsx` - Breadcrumb + mobile menu
- Each role has dedicated sidebar: `cutter-sidebar.tsx`, `production-sidebar.tsx`, etc.

### API Route Organization

```
app/api/
├── materials/                 # Material CRUD
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/route.ts         # GET (detail), PATCH (update), DELETE
├── material-transactions/     # Stock movements
├── production-batches/        # Batch management
│   ├── [id]/
│   │   ├── allocate/         # Material allocation
│   │   ├── confirm/          # Confirm batch
│   │   └── assign-tailor/    # Assign to roles
├── cutting-tasks/[id]/        # Task state updates
│   ├── start/
│   ├── progress/
│   └── complete/
└── sewing-tasks/[id]/         # Similar structure
```

## Testing Production Workflow

### Phase-by-Phase Testing

Scripts in `scripts/` directory test complete workflow:

```bash
npx tsx scripts/fase3-create-batches.ts      # Create batch
npx tsx scripts/fase4-allocate-materials.ts   # Allocate materials
npx tsx scripts/fase6-8-cutting-to-sewing.ts  # Cutting workflow
npx tsx scripts/fase9-10-sewing.ts            # Sewing workflow
npx tsx scripts/run-all-phases.ts             # Run all phases
```

### Status Verification

Check batch progression in Prisma Studio or via:

```typescript
GET / api / production - batches / [id] / timeline;
```

## Common Pitfalls

1. **Prisma Client out of sync**: After schema changes, always `npx prisma generate`
2. **Unit field confusion**: Don't send `unit` in transaction requests - API uses material.unit
3. **Missing role check**: All protected routes MUST call `requireRole()` first
4. **State skipping**: Never manually set batch status - use dedicated endpoints
5. **Hard deletes**: Use soft delete flags (`isActive: false`) for materials/products
6. **Mobile breakpoints**: Use `sm:` prefix (640px), not `md:` for form grids

## Detailed Production Workflow

### Phase 1: Persiapan Produksi

- Owner / Ka. Prod membuat request produksi dengan varian (warna & ukuran)
- Owner / Ka. Prod verifikasi & alokasi material

### Phase 2: Pemotongan

- Bahan dibawa ke Ka. Pemotong
- Ka. Pemotong / Ka. Prod **mengisi hasil pemotongan**
- Owner / Ka. Prod **verifikasi hasil pemotongan**
- Owner / Ka. Prod **menugaskan ke Ka. Penjahit**
- ⚠️ **Tidak ada reject di tahap pemotongan**

### Phase 3: Penjahitan

- Bahan hasil potong dibawa ke tempat jahit
- Ka. Penjahit / Ka. Prod **mengisi hasil jahitan**
- Owner / Ka. Prod **verifikasi hasil jahitan**
- Owner / Ka. Prod **menugaskan ke Ka. Finishing**
- ⚠️ **Tidak ada reject di tahap penjahitan**

### Phase 4: Finishing (Iterative)

- Hasil jahit dibawa ke finishing
- Ka. Finishing **mengisi hasil finishing** (bisa partial, menyesuaikan barang yang sudah selesai)
- Ka. Prod **verifikasi hasil finishing**
- Ka. Prod **menyerahkan ke Ka. Gudang** (partial submission)
- 🔴 **Di tahap ini baru ada reject**: kotor, sobek, rusak jahit

### Phase 5: Gudang (Iterative)

- Owner / Ka. Gudang **verifikasi hasil finishing** yang masuk
- Ka. Gudang melakukan **re-produksi** untuk barang kotor (cuci)
- Ka. Gudang **menyimpan**:
  - Barang jadi → rak barang jadi
  - Barang cacat (sobek/rusak jahit) → Bad Stock (BS)

### ⚠️ Important: Sub-Batch Location

**Sub-batch berada di Finishing** (bukan di Penjahitan):

- Digunakan untuk menyimpan data hasil finishing yang siap diteruskan ke gudang
- Hanya input hasil saja, tidak perlu assign ke finisher individual
- Fokus koordinasi antar kepala, bukan penugasan ke worker individual

### Completion Criteria

Proses produksi selesai ketika:

- Semua hasil jahit masuk ke finishing ✓
- Semua hasil finishing masuk ke gudang ✓
- Input finishing = Output warehouse (termasuk reject)

## Documentation Files

- `README.md` - Quick start, test credentials, workflow overview
- `WORKFLOW.md` - Detailed business logic per role
- `fix-workflow.md` - Correct workflow reference (authoritative)
- `DATABASE.md` - Database schema documentation
- `PROJECT_STRUCTURE.md` - File organization
- `MOBILE_RESPONSIVE_UPDATE.md` - Responsive design patterns
- `TOAST_GUIDE.md` - Toast notification usage
- `WORKFLOW_COMPLETION_REPORT.md` - Production test results

## Key Design Decisions

1. **Material units standardized to METER**: Simplifies calculations, roll quantity is supplementary info
2. **Purchase info on transactions**: Every stock IN captures PO number, supplier, date for traceability
3. **Task-based workflow**: Each production stage (cutting/sewing/finishing) creates dedicated task records
4. **Verification checkpoints**: Kepala Produksi verifies quality at each stage transition
5. **Audit trail**: All state changes logged in `AuditLog` with user, timestamp, changes
6. **QR code tracking**: Batches identified by SKU (format: `PROD-YYYYMMDD-XXX`)
7. **Coordination focus**: System focuses on head-to-head coordination, not individual worker assignment
8. **Sub-batch at Finishing**: Sub-batches created at finishing stage for partial warehouse submissions

When in doubt, check existing patterns in `app/owner/stocks/page.tsx` (comprehensive CRUD example) or `app/api/material-transactions/route.ts` (transaction handling).
