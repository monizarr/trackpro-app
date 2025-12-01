# TrackPro App - Quick Start Guide

## 🔑 Login Credentials

```
Email: owner@example.com
Password: password
```

## 🚀 Running the Application

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Open browser
http://localhost:3000
```

## 📍 Available Routes

| Route              | Description                                 |
| ------------------ | ------------------------------------------- |
| `/`                | Redirects to `/login`                       |
| `/login`           | Login page                                  |
| `/owner/dashboard` | Dashboard with placeholder cards            |
| `/owner/stocks`    | Stock management with filters and add modal |
| `/owner/products`  | Product management with sorting and CRUD    |
| `/owner/employees` | Employee page (placeholder)                 |
| `/owner/salaries`  | Salary page (placeholder)                   |

## 🎯 Features Demo

### 1. Login

1. Go to `http://localhost:3000`
2. Enter email: `owner@example.com`
3. Enter password: `password`
4. Click "Log in"

### 2. Stok Bahan Baku

- **Add Stock**: Click "Input Stok" button
- **Search**: Type in search box
- **Filter**: Click tabs (Semua, Bahan Baku, Produk Jadi, Produk Gagal)
- **View**: See data in table

### 3. Products

- **Add Product**: Click "Buat Produk" button
- **Search**: Type in search box
- **Sort**: Click column headers
- **Copy SKU**: Click SKU to copy to clipboard
- **View Details**: Click product name

### 4. Navigation

- **Sidebar**: Click menu items to navigate
- **User Menu**: Click user avatar in bottom left
- **Logout**: Click user menu → Log out

## 🎨 UI Components Used

- Button (variants: default, outline, ghost)
- Input (text, number, email, password)
- Select (dropdown)
- Textarea
- Table (sortable)
- Dialog/Modal
- Dropdown Menu
- Label

## 🔧 Customization Tips

### Change Colors

Edit `app/globals.css` to change CSS variables:

```css
:root {
  --primary: 0 0% 9%;
  --secondary: 0 0% 96.1%;
  /* ... */
}
```

### Add New Menu

Edit `components/layout/sidebar.tsx`:

```typescript
const navigation = [
  // ... existing items
  { name: "New Menu", href: "/owner/new-menu", icon: IconName },
];
```

### Modify Forms

All forms use controlled components with React state.
For validation, integrate:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
```

## 📝 Notes

- All data is stored in component state (not persistent)
- Refresh will reset all data
- No actual authentication (mock implementation)
- Ready for API integration

## 🚧 Next Steps

1. **Backend Integration**: Connect to REST API or GraphQL
2. **Data Persistence**: Add database (PostgreSQL, MySQL, MongoDB)
3. **Authentication**: Implement NextAuth.js or JWT
4. **Form Validation**: Add Zod schemas
5. **State Management**: Add Zustand or Redux
6. **Testing**: Add Jest + React Testing Library

## 📞 Support

For issues or questions, refer to:

- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs
