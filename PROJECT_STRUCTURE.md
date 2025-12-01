# Project Structure

```
trackpro-app/
│
├── app/                              # Next.js App Router
│   ├── login/                        # Login route
│   │   └── page.tsx                  # Login page component
│   │
│   ├── owner/                        # Protected owner routes
│   │   ├── layout.tsx                # Shared layout (with Sidebar)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard page
│   │   ├── stocks/
│   │   │   └── page.tsx              # Stock management page
│   │   ├── products/
│   │   │   └── page.tsx              # Product management page
│   │   ├── employees/
│   │   │   └── page.tsx              # Employee page (placeholder)
│   │   └── salaries/
│   │       └── page.tsx              # Salary page (placeholder)
│   │
│   ├── globals.css                   # Global styles + Tailwind CSS
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Root page (redirects to /login)
│
├── components/                       # React components
│   ├── ui/                          # Reusable UI components
│   │   ├── button.tsx               # Button component
│   │   ├── dialog.tsx               # Modal/Dialog component
│   │   ├── dropdown-menu.tsx        # Dropdown menu component
│   │   ├── input.tsx                # Input field component
│   │   ├── label.tsx                # Form label component
│   │   ├── select.tsx               # Select dropdown component
│   │   ├── table.tsx                # Table components
│   │   └── textarea.tsx             # Textarea component
│   │
│   └── layout/                      # Layout components
│       ├── header.tsx               # Header with breadcrumb
│       └── sidebar.tsx              # Sidebar navigation
│
├── lib/                             # Utility libraries
│   └── utils.ts                     # Utility functions (cn helper)
│
├── hooks/                           # Custom React hooks
│   └── (empty - ready for custom hooks)
│
├── public/                          # Static assets
│
├── .vscode/                         # VS Code settings
│
├── components.json                  # shadcn/ui configuration
├── eslint.config.mjs               # ESLint configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies
├── pnpm-lock.yaml                 # Lock file
├── postcss.config.mjs             # PostCSS configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── README.md                      # Main documentation
└── QUICKSTART.md                  # Quick start guide
```

## Key Files Explained

### `app/layout.tsx`

Root layout for the entire application. Contains HTML structure and global styles.

### `app/owner/layout.tsx`

Layout for all owner routes. Includes the Sidebar component.

### `components/ui/*`

Reusable UI components built with Radix UI primitives and Tailwind CSS. These follow the shadcn/ui pattern.

### `components/layout/sidebar.tsx`

Main navigation sidebar with:

- Logo
- Navigation links
- External links
- User dropdown menu

### `components/layout/header.tsx`

Page header component with:

- Mobile menu toggle
- Breadcrumb navigation

### `lib/utils.ts`

Utility functions, primarily the `cn()` function for conditional class names using clsx and tailwind-merge.

### `app/globals.css`

Global styles including:

- Tailwind CSS imports
- CSS custom properties for theming
- Base styles

## Component Patterns

### Page Components

Each page follows this structure:

```tsx
export default function PageName() {
  // State management
  const [state, setState] = useState()

  return (
    <div>
      <Header breadcrumbs={[...]} />
      <div className="p-6">
        {/* Page content */}
      </div>
    </div>
  )
}
```

### UI Components

UI components are built with:

- TypeScript for type safety
- React.forwardRef for ref forwarding
- className merging with cn()
- Radix UI for accessibility

Example:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

## Routing

### App Router (Next.js 14)

- File-based routing in `app/` directory
- `page.tsx` = route
- `layout.tsx` = shared layout
- Automatic code splitting

### Route Groups

- `(auth)` - Authentication routes (not created yet, but recommended)
- `owner/` - Owner dashboard routes

## Styling

### Tailwind CSS

- Utility-first CSS framework
- Custom theme in `tailwind.config.ts`
- Global styles in `app/globals.css`

### CSS Variables

Theme colors defined as CSS custom properties:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  /* ... */
}
```

## State Management

Currently using React's built-in state management:

- `useState` for local component state
- No global state management (can add Zustand/Redux later)

## Data Flow

```
User Input → Component State → UI Update
          ↓
    (Ready for API integration)
```

## Adding New Features

### 1. Add New Page

```bash
# Create new page file
app/owner/new-page/page.tsx
```

### 2. Add to Navigation

```tsx
// components/layout/sidebar.tsx
const navigation = [
  // ... existing
  { name: "New Page", href: "/owner/new-page", icon: IconName },
];
```

### 3. Create New Component

```bash
# Create component
components/feature-name/component.tsx
```

### 4. Add API Integration (Future)

```bash
# Create API service
lib/api/service-name.ts
```

## Dependencies

### Core

- `next`: ^16.0.6
- `react`: ^19.2.0
- `typescript`: ^5

### UI

- `@radix-ui/*`: Various primitives
- `lucide-react`: Icons
- `tailwindcss`: ^4

### Forms (Ready to use)

- `react-hook-form`: ^7.67.0
- `zod`: ^4.1.13
- `@hookform/resolvers`: ^5.2.2

### Utils

- `clsx`: ^2.1.1
- `tailwind-merge`: ^3.4.0
- `class-variance-authority`: ^0.7.1
