# Dark Mode Implementation 🌙

## Overview

TrackPro now supports dark mode with a toggle button. The default theme is **light mode** and users can switch between light and dark themes.

## Features

✅ **Default Light Mode** - Application starts in light mode by default
✅ **Persistent Theme** - User's theme preference is saved in localStorage
✅ **Toggle Button** - Easy-to-use theme switcher with Sun/Moon icons
✅ **Theme Aware Colors** - All UI elements adapt to the selected theme

## Implementation

### 1. Theme Provider

**File:** `components/theme-provider.tsx`

- Manages theme state (light/dark)
- Saves theme preference to localStorage
- Provides `useTheme()` hook for components

### 2. Theme Toggle Button

**File:** `components/theme-toggle.tsx`

- Shows Sun icon in light mode
- Shows Moon icon in dark mode
- Accessible with screen reader support

### 3. Theme Integration

**Files Modified:**

- `app/layout.tsx` - Added ThemeProvider wrapper with `defaultTheme="light"`
- `app/globals.css` - Changed from media query to `.dark` class selector
- `components/layout/sidebar.tsx` - Added theme toggle in sidebar
- `app/login/page.tsx` - Added theme toggle and updated colors

## Usage

### For Users

1. **In Dashboard/Owner Pages**: Look for the theme toggle button in the sidebar (above user menu)
2. **In Login Page**: Look for the theme toggle button in the top-right corner
3. Click the button to switch between light and dark mode

### For Developers

#### Using the Theme Hook

```tsx
import { useTheme } from "@/components/theme-provider";

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  // Get current theme
  console.log(theme); // 'light' or 'dark'

  // Set specific theme
  setTheme("dark");

  // Toggle between themes
  toggleTheme();
}
```

#### Adding Theme Toggle to New Pages

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

function MyPage() {
  return (
    <div>
      <ThemeToggle />
      {/* Your page content */}
    </div>
  );
}
```

## Color System

### Theme-Aware Classes

Use these Tailwind classes that automatically adapt to the theme:

| Instead of        | Use                        |
| ----------------- | -------------------------- |
| `text-gray-900`   | `text-foreground`          |
| `text-gray-600`   | `text-muted-foreground`    |
| `bg-white`        | `bg-background`            |
| `bg-gray-100`     | `bg-muted`                 |
| `border-gray-300` | `border-input` or `border` |
| `text-blue-600`   | `text-primary`             |

### CSS Variables

Defined in `app/globals.css`:

**Light Mode** (default):

- `--background: 0 0% 100%` (white)
- `--foreground: 222.2 84% 4.9%` (dark text)
- `--muted: 210 40% 96.1%` (light gray)

**Dark Mode** (`.dark` class):

- `--background: 222.2 84% 4.9%` (dark)
- `--foreground: 210 40% 98%` (light text)
- `--muted: 217.2 32.6% 17.5%` (dark gray)

## Technical Details

### How It Works

1. ThemeProvider wraps the entire app in `app/layout.tsx`
2. On mount, checks localStorage for saved theme preference
3. If no saved preference, uses default: `light`
4. Adds/removes `light` or `dark` class to `<html>` element
5. CSS variables in `globals.css` respond to the class
6. All components using theme-aware classes automatically update

### Storage

- Theme preference is stored in `localStorage` with key: `theme`
- Persists across browser sessions
- Syncs across all tabs in the same browser

### Performance

- No flash of unstyled content (FOUC)
- Immediate theme application on page load
- `suppressHydrationWarning` on `<html>` prevents hydration mismatch

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers
- ⚠️ Requires localStorage support (disabled in incognito mode on some browsers)

## Future Enhancements

- [ ] System theme detection (auto mode)
- [ ] Smooth theme transition animation
- [ ] Theme-specific illustrations/images
- [ ] More color scheme variants
- [ ] Per-page theme override
