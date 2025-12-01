# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShiftOptimizer is a labor management and scheduling web application built with React, TypeScript, Vite, and Tailwind CSS. The application helps managers create optimized work schedules, forecast labor needs, manage employees, and track scheduling constraints.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://localhost:3000 or 3001 if port is busy)
npm run dev

# Build for production
npm run build
```

## Architecture

### Routing & Navigation

The app uses **React Router v7** with a single-page application structure. The main navigation is implemented as a **vertical sidebar** with tab-based routing in `App.tsx`:

- Routes are mapped to URL paths (e.g., `/`, `/schedule`, `/forecast`, `/constraints`, `/alerts`, `/analytics`, `/employees`)
- The `/schedule` route has nested sub-routes (`/schedule/new`, `/schedule/:id`) and maintains navigation state using a ref to remember the last visited schedule URL
- Tab switching triggers navigation via `useNavigate()` and the active tab is derived from the current URL path
- The app layout uses **Flexbox** with a fixed vertical sidebar and a scrollable content area

### Authentication

Authentication is managed through **React Context** (`src/contexts/AuthContext.tsx`):

- User credentials and JWT tokens are stored in localStorage
- The `AuthProvider` wraps the application and provides `useAuth()` hook
- `ProtectedRoute` component guards routes that require authentication
- Login state persists across browser sessions via localStorage

### State Management

- **Local component state** using `useState` for UI interactions
- **React Context** for global auth state
- **URL-based state** for navigation and active tabs
- **Refs** (`useRef`) for persisting values across renders (e.g., last schedule path)

### Layout System

The application uses a **fixed vertical sidebar + scrollable content** layout:

```
┌─────────────┬────────────────────────┐
│             │  Header (fixed)        │
│  Sidebar    ├────────────────────────┤
│  (fixed)    │                        │
│             │  Content (scrollable)  │
│             │                        │
└─────────────┴────────────────────────┘
```

- Root container: `display: flex` with `overflow: hidden` and `height: 100vh`
- Sidebar: `flexShrink: 0` with `overflowY: auto`
- Content area: Nested flexbox column with fixed header (`flexShrink: 0`) and scrollable content (`flex: 1, overflow: auto`)
- **Critical**: Use inline `style` for layout properties like `overflow`, `flex`, `flexShrink` rather than Tailwind classes to ensure they work correctly

## Styling Guidelines

### Color System

**CRITICAL**: All colors MUST reference the centralized theme file (`src/styles/theme.ts`).

#### Rules:
1. **NEVER use hardcoded color classes** like `bg-blue-50`, `border-red-200`, `text-green-700` in className
2. **ALWAYS use inline style with COLORS constants** from the theme
3. Import COLORS: `import { COLORS } from '../styles/theme';`

#### Color Categories:

```typescript
// Status colors (info, success, warning, error, amber, orange, purple)
COLORS.status.info.{background, border, text, light}
COLORS.status.success.{background, border, text, light}
COLORS.status.warning.{background, border, text, light}
COLORS.status.error.{background, border, text, light}

// Neutral grayscale
COLORS.neutral[50] through COLORS.neutral[900]

// Primary brand colors
COLORS.primary[50], COLORS.primary[600]

// Shift-specific colors
COLORS.shift.regular.{background, border, hover}
COLORS.shift.overtime.{background, border, hover}

// Table styling
COLORS.table.border
COLORS.table.borderWidth

// Drag & drop states
COLORS.dragDrop.{valid, invalid, preview}.{background, border}
```

#### Example:

```tsx
// ❌ WRONG
<div className="bg-blue-50 border-blue-200 text-blue-700">

// ✅ CORRECT
<div style={{
  backgroundColor: COLORS.status.info.background,
  borderColor: COLORS.status.info.border,
  color: COLORS.status.info.text
}}>
```

### Layout & Positioning

- Use **Flexbox and CSS Grid** by default for layouts
- Avoid absolute positioning unless necessary
- For critical layout properties (overflow, flex, display), prefer **inline styles** over Tailwind classes for reliability

## Key Directories

```
src/
├── components/          # React components
│   ├── ui/             # Radix UI components (accordion, button, card, etc.)
│   ├── DashboardView.tsx
│   ├── ScheduleView.tsx
│   ├── AlertsPanel.tsx
│   └── ...
├── contexts/           # React Context providers
│   └── AuthContext.tsx
├── services/           # API and business logic services
├── styles/             # Centralized styling
│   └── theme.ts       # Color constants
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
└── main.tsx           # Application entry point
```

## Component Libraries

- **UI Components**: Radix UI primitives (shadcn/ui pattern)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v7
- **Forms**: React Hook Form
- **Styling**: Tailwind CSS + inline styles for colors

## Important Patterns

### Tab Navigation State

The Schedule tab preserves nested route state when switching tabs:

```typescript
const lastSchedulePathRef = useRef<string>('/schedule');

// Save schedule path when navigating within schedule
useEffect(() => {
  if (location.pathname.startsWith('/schedule')) {
    lastSchedulePathRef.current = location.pathname;
  }
}, [location.pathname]);

// Restore last schedule path when returning to schedule tab
const handleTabChange = (value: string) => {
  if (value === "schedule") {
    navigate(lastSchedulePathRef.current);
  }
};
```

### Adding New Colors

If a new color is needed:
1. Add it to `src/styles/theme.ts` in the appropriate category
2. Use descriptive names indicating purpose (not just the color value)
3. Document the color's intended use case
4. Reference it via COLORS constant in inline styles
