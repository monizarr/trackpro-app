# Authentication & Database Setup - TrackPro

## ✅ Setup Completed

Sistem authentication dengan role-based access control (RBAC) telah berhasil diintegrasikan dengan database PostgreSQL.

## 🗄️ Database Structure

Database sudah optimal dengan 14 tabel utama:

- `users` - Data pengguna dengan 6 role
- `products` - Katalog produk
- `materials` - Bahan baku
- `product_materials` - BOM (Bill of Materials)
- `material_transactions` - Riwayat stok
- `production_batches` - Batch produksi
- `batch_material_allocations` - Alokasi bahan
- `cutting_tasks` - Task pemotongan
- `sewing_tasks` - Task penjahitan
- `finishing_tasks` - Task finishing
- `quality_checks` - QC checks
- `batch_timeline` - Timeline produksi
- `notifications` - Notifikasi sistem
- `audit_logs` - Audit trail

## 🔐 Authentication System

### NextAuth.js Implementation

- **Provider**: Credentials (username + password)
- **Session Strategy**: JWT
- **Session Duration**: 30 days
- **Password Hashing**: bcryptjs

### Role-Based Access Control

6 User Roles dengan routing masing-masing:

1. **OWNER** → `/owner/*`
2. **KEPALA_GUDANG** → `/warehouse/*`
3. **KEPALA_PRODUKSI** → `/production/*`
4. **PEMOTONG** → `/cutter/*`
5. **PENJAHIT** → `/tailor/*`
6. **FINISHING** → `/finishing/*`

### Middleware Protection

File `middleware.ts` mengatur:

- Authentication check untuk protected routes
- Auto-redirect ke dashboard sesuai role
- Block akses ke route yang tidak sesuai role

## 👥 Default User Accounts

Seed data telah dibuat dengan 6 user untuk testing:

| Role            | Username        | Email                  | Password    |
| --------------- | --------------- | ---------------------- | ----------- |
| Owner           | owner           | owner@trackpro.com     | password123 |
| Kepala Gudang   | kepala_gudang   | gudang@trackpro.com    | password123 |
| Kepala Produksi | kepala_produksi | produksi@trackpro.com  | password123 |
| Pemotong        | pemotong1       | pemotong@trackpro.com  | password123 |
| Penjahit        | penjahit1       | penjahit@trackpro.com  | password123 |
| Finishing       | finishing1      | finishing@trackpro.com | password123 |

## 📁 File Structure

```
app/
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts    # NextAuth API route
│       └── session/route.ts          # Get current session
├── login/page.tsx                    # Login page (updated)
├── page.tsx                          # Root redirect
└── [role-folders]/                   # Role-specific pages

lib/
├── auth.ts                           # NextAuth configuration
├── prisma.ts                         # Prisma client setup
└── session.ts                        # Session helpers

components/
└── providers.tsx                     # SessionProvider wrapper

prisma/
├── schema.prisma                     # Database schema
└── seed.ts                          # Seed data script

middleware.ts                         # Route protection

.env                                  # Environment variables
```

## 🚀 How to Use

### 1. Login

```typescript
// Login form menggunakan NextAuth signIn
import { signIn } from "next-auth/react";

const result = await signIn("credentials", {
  username: "owner",
  password: "password123",
  redirect: false,
});
```

### 2. Get Current Session

```typescript
// Server Component
import { getSession } from "@/lib/session";

const session = await getSession();
console.log(session?.user.role); // OWNER, KEPALA_GUDANG, etc.

// Client Component
import { useSession } from "next-auth/react";

const { data: session } = useSession();
console.log(session?.user.role);
```

### 3. Require Authentication

```typescript
// Protect server component
import { requireAuth } from "@/lib/session";

export default async function ProtectedPage() {
  const session = await requireAuth(); // Auto redirect if not logged in

  return <div>Welcome {session.user.name}</div>;
}
```

### 4. Logout

```typescript
// Client Component
import { signOut } from "next-auth/react";

<button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</button>;
```

## 🔄 Workflow After Login

1. User login di `/login`
2. NextAuth validate credentials
3. JWT token generated
4. Root page (`/`) check session
5. Redirect ke dashboard sesuai role:
   - OWNER → `/owner/dashboard`
   - KEPALA_GUDANG → `/warehouse/dashboard`
   - KEPALA_PRODUKSI → `/production/dashboard`
   - PEMOTONG → `/cutter/dashboard`
   - PENJAHIT → `/tailor/dashboard`
   - FINISHING → `/finishing/dashboard`

## 🛡️ Security Features

- ✅ Password hashing dengan bcryptjs (salt rounds: 10)
- ✅ JWT token untuk session management
- ✅ Role-based middleware protection
- ✅ Secure HTTP-only cookies
- ✅ CSRF protection (built-in NextAuth)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Audit logging untuk tracking aktivitas
- ✅ Session expiry (30 days)

## 📊 Database Optimization

### Indexes Added

- `users`: email, username, role
- `products`: sku, createdById
- `materials`: code, createdById
- `production_batches`: batchSku, status, productId
- And more for better query performance

### Relations Optimized

- Cascade delete untuk data integrity
- Proper foreign key constraints
- Optimized query patterns

## 🧪 Testing

### Test Login:

```bash
# Start dev server
pnpm dev

# Navigate to http://localhost:3000
# Will auto-redirect to /login

# Login dengan salah satu akun di atas
# Akan redirect ke dashboard sesuai role
```

### Check Session API:

```bash
# GET session info
curl http://localhost:3000/api/auth/session
```

## 🔧 Configuration

### Environment Variables (.env)

```env
DATABASE_URL="postgresql://zar:iop@localhost:5432/trackpro-db"
NEXTAUTH_SECRET="trackpro-secret-key-change-this-in-production-2024"
NEXTAUTH_URL="http://localhost:3000"
```

⚠️ **Important**: Ganti `NEXTAUTH_SECRET` dengan random string di production!

Generate secret:

```bash
openssl rand -base64 32
```

## 📝 Next Steps

1. ✅ Database setup - DONE
2. ✅ Authentication system - DONE
3. ✅ Role-based access control - DONE
4. ✅ User seeding - DONE
5. 🔄 Connect UI with real API endpoints
6. 🔄 Implement CRUD operations
7. 🔄 Add notification system
8. 🔄 Implement reporting features

## 💡 Tips

- Semua password default adalah `password123`
- Setiap role memiliki akses terbatas ke route mereka saja
- Session bertahan 30 hari
- Audit log mencatat semua aktivitas penting
- Gunakan `requireAuth()` untuk protect server components
- Gunakan `useSession()` untuk client components

## 🆘 Troubleshooting

**Database connection error?**

```bash
# Check PostgreSQL service running
# Verify credentials in .env
# Run: npx prisma studio
```

**Login tidak berfungsi?**

```bash
# Regenerate Prisma client
npx prisma generate

# Check seed data
npx tsx prisma/seed.ts
```

**TypeScript errors?**

```bash
# Restart TypeScript server
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```
