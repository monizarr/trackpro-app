# TrackPro App - Inventory & Staff Management System

TrackPro adalah aplikasi manajemen inventori dan staff yang dibangun menggunakan Next.js 14, TypeScript, dan Tailwind CSS.

## 🚀 Fitur

### ✅ Sudah Diimplementasikan

#### 1. **Authentication**

- Login page dengan form validation
- Email: `owner@example.com`
- Password: `password`

#### 2. **Dashboard Layout**

- Responsive sidebar navigation
- Header dengan breadcrumb
- User dropdown menu (Settings & Logout)

#### 3. **Stok Bahan Baku** (`/owner/stocks`)

- ✅ Tabel data stok dengan kolom: Nama, Tipe, Stok Qty, Satuan
- ✅ Search/filter produk
- ✅ Filter tabs: Semua, Bahan Baku, Produk Jadi, Produk Gagal
- ✅ Modal "Input Stok" dengan form
- ✅ Pagination (Prev/Next)

#### 4. **Produk** (`/owner/products`)

- ✅ Tabel data produk dengan kolom: SKU, Nama, Harga, Status
- ✅ Search produk
- ✅ Sortable columns
- ✅ Copy SKU to clipboard
- ✅ Modal "Buat Produk" dengan form
- ✅ Pagination

#### 5. **Staff & Gaji**

- ⏳ Placeholder pages (coming soon)

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components + Radix UI primitives
- **Icons**: Lucide React
- **Form Handling**: React Hook Form + Zod

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
