# Shadcn/UI Implementation Guide

## Komponen yang Sudah Diimplementasikan

### 1. **Card Component** (`components/ui/card.tsx`)

Komponen card mengikuti template shadcn dengan struktur:

- `Card` - Container utama
- `CardHeader` - Header dengan padding default
- `CardTitle` - Title dengan font semibold
- `CardDescription` - Description dengan text muted
- `CardContent` - Content area
- `CardFooter` - Footer section

**Contoh Penggunaan:**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content goes here</CardContent>
</Card>
```

### 2. **Tabs Component** (`components/ui/tabs.tsx`)

Menggunakan @radix-ui/react-tabs dengan styling shadcn:

- `Tabs` - Root component
- `TabsList` - Container untuk trigger buttons
- `TabsTrigger` - Button untuk switch tabs
- `TabsContent` - Content untuk setiap tab

**Contoh Penggunaan:**

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
</Tabs>
```

### 3. **Badge Component** (`components/ui/badge.tsx`)

Badge dengan variant:

- `default` - Primary badge
- `secondary` - Secondary badge
- `destructive` - Danger/error badge
- `outline` - Outline badge

**Contoh Penggunaan:**

```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
```

### 4. **Separator Component** (`components/ui/separator.tsx`)

Horizontal/vertical separator menggunakan @radix-ui/react-separator

**Contoh Penggunaan:**

```tsx
<Separator />
<Separator orientation="vertical" />
```

### 5. **Avatar Component** (`components/ui/avatar.tsx`)

Avatar component untuk display user profile:

- `Avatar` - Container
- `AvatarImage` - Image element
- `AvatarFallback` - Fallback text jika image gagal load

## Dashboard Layout (Sesuai Shadcn)

Dashboard mengikuti template shadcn dengan struktur:

```
/owner/dashboard
├── Header dengan title dan breadcrumb
├── Tabs untuk navigasi (Overview, Analytics, Reports)
└── Grid Layout
    ├── Stats Cards (3 columns)
    └── Main Content (7 columns grid)
        ├── Left: Recent Production Batches (4 cols)
        └── Right: Sidebar Cards (3 cols)
            ├── Quality Alerts
            └── Today's Overview
```

## Layout Structure

```tsx
app/owner/layout.tsx
└── <div className="flex h-screen overflow-hidden bg-background">
    ├── <Sidebar /> (Fixed width)
    └── <main className="flex-1 overflow-y-auto">
        └── {children}
```

## CSS Variables (HSL Color System)

Menggunakan HSL color system shadcn:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

## Grid System

Menggunakan Tailwind Grid dengan responsive breakpoints:

### Stats Cards Row:

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">// 3 equal cards</div>
```

### Main Content Grid:

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
  <Card className="col-span-4">...</Card> // 4/7 width
  <div className="col-span-3">...</div> // 3/7 width
</div>
```

## Typography Scale

Mengikuti shadcn typography:

- **Page Title**: `text-3xl font-bold tracking-tight`
- **Card Title**: `text-sm font-medium`
- **Card Value**: `text-2xl font-bold`
- **Muted Text**: `text-xs text-muted-foreground`
- **Description**: `text-sm text-muted-foreground`

## Spacing System

Menggunakan spacing shadcn:

- **Container Padding**: `p-8 pt-6`
- **Gap Between Elements**: `gap-4` (16px)
- **Space Between Sections**: `space-y-4` (16px)
- **Space Between Cards**: `space-y-8` (32px untuk large spacing)

## Contoh Implementasi

### Stat Card (Shadcn Style):

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Products</CardTitle>
    <Package className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">24</div>
    <p className="text-xs text-muted-foreground">+12% from last month</p>
  </CardContent>
</Card>
```

### List Item dengan Badge:

```tsx
<div className="flex items-center">
  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
    <Package className="h-4 w-4 text-blue-600" />
  </div>
  <div className="ml-4 space-y-1 flex-1">
    <p className="text-sm font-medium leading-none">BATCH-001</p>
    <p className="text-sm text-muted-foreground">Kaos Premium</p>
  </div>
  <div className="ml-auto font-medium flex items-center gap-2">
    <Badge>CUTTING</Badge>
    <span className="text-sm">35%</span>
  </div>
</div>
```

## Best Practices

1. **Gunakan `hsl(var(--variable))` untuk colors**
2. **Gunakan semantic naming** (muted, foreground, etc)
3. **Consistent spacing** dengan gap-4 dan space-y-4
4. **Responsive grid** dengan md: dan lg: breakpoints
5. **Icon size** 16px (h-4 w-4) untuk icons di header
6. **Rounded corners** menggunakan rounded-xl untuk cards
7. **Shadow** minimal dengan `shadow` class
8. **Padding** consistent dengan p-6 untuk card content

## Dependencies

```json
{
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.4.0"
}
```

## Resources

- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
