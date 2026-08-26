# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShiftOptimizer (OptimalAssign) is a labor management and scheduling web application built with React, TypeScript, Vite, and Tailwind CSS. The application helps managers create optimized work schedules, forecast labor needs, manage employees, and track scheduling constraints.

This repo is frontend-only — it talks to a separate Kotlin/Ktor backend over `/api`, proxied in dev to `http://localhost:8080`.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://localhost:3000 or 3001 if port is busy)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Running the app end-to-end for UI testing

The frontend cannot be usefully exercised on its own: almost every page (including `/constraints`) requires an authenticated session and real API responses. There is no mock/msw layer in this repo, so **do not stub `fetch` or fake auth state to preview UI** — run the real backend instead.

### 1. Start the backend

The backend lives in a sibling project: `~/Desktop/Projects/LaborManagement` (Kotlin/Ktor, see its `docs/CLAUDE.md`). It requires a local PostgreSQL instance reachable at `localhost:5432` (database `labormanagement`).

```bash
cd ~/Desktop/Projects/LaborManagement
./gradlew run
```

This starts the API on `http://localhost:8080`. On first run against an empty database it auto-seeds three test users (see `UserRepository.kt`):

| Role     | Email                        | Password       |
|----------|-------------------------------|----------------|
| Admin    | admin@shiftoptimizer.com      | Admin123!      |
| Manager  | manager@shiftoptimizer.com    | Manager123!    |
| Employee | employee@shiftoptimizer.com   | Employee123!   |

Confirm it's up:
```bash
curl -s http://localhost:8080/api/test/employee-ids
```

### 2. Start the frontend

```bash
npm run dev
```

Runs on `http://localhost:3000` (see `vite.config.ts`); `/api` requests are proxied to `localhost:8080`.

### 3. Log in and drive the UI

Navigate to `http://localhost:3000/login` and sign in with `admin@shiftoptimizer.com` / `Admin123!`. A demo business with sample employees/forecast data is typically already present from prior seeding; if a fresh backend has none, create a business through the UI (or `POST /api/test/create-sample-employees` seeds sample employees for the fixed test business ID).

From there, navigate directly to feature routes, e.g. `http://localhost:3000/constraints` for the Constraints editor (Working Time / Pay & Cost / Priorities tabs).

### Notes

- Data is stored in Postgres and persists across backend restarts (not in-memory) — no need to reseed every session, but `POST /api/test/reset-database` wipes everything if you need a clean slate.
- Auth token/business selection is persisted in `localStorage` (`auth_token`, `current_business_id`, etc.) — clearing it forces a fresh login.

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

**Use Tailwind CSS classes** for all styling. The project uses Tailwind CSS v4 with the Vite plugin.

#### Rules:
1. **USE Tailwind CSS classes** for colors: `bg-blue-50`, `border-blue-300`, `text-neutral-700`, etc.
2. **DO NOT import COLORS** from `src/styles/theme.ts` (deprecated)
3. For layout properties that need reliability, use **inline styles**: `style={{ overflow: 'auto', flex: 1 }}`

#### Common Color Patterns:

```tsx
// Shift colors
Regular shift: bg-blue-50 border-blue-300 hover:bg-blue-100
Overtime shift: bg-purple-100 border-purple-600 hover:bg-purple-200

// Table styling
Table borders: border-4 border-neutral-300

// Drag & drop states
Valid drop zone: bg-green-100 border-green-400
Invalid drop zone: bg-red-100 border-red-400
Drag preview: bg-green-200 border-green-500

// Status colors
Info: bg-blue-50 border-blue-200 text-blue-700
Success: bg-green-50 border-green-200 text-green-700
Warning: bg-amber-50 border-amber-200 text-amber-700
Error: bg-red-50 border-red-200 text-red-700
```

#### Example:

```tsx
// ✅ CORRECT - Use Tailwind classes
<div className="bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100">

// ✅ CORRECT - Inline styles for layout properties
<div style={{ overflow: 'auto', flex: 1 }}>

// ❌ WRONG - Do not use COLORS from theme.ts
<div style={{
  backgroundColor: COLORS.status.info.background,
  borderColor: COLORS.status.info.border
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
├── styles/             # Styling files
│   └── theme.ts       # Color reference documentation (deprecated - use Tailwind classes)
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
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)

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

### Using Colors

All colors should use **Tailwind CSS utility classes**:

```tsx
// Use Tailwind color classes directly
<div className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">

// Common patterns
Regular shifts: bg-blue-50 border-blue-300
Overtime shifts: bg-purple-100 border-purple-600
Table borders: border-4 border-neutral-300
```

See the Tailwind CSS color documentation for available colors:
- Neutral: neutral-50 through neutral-900
- Blue: blue-50 through blue-900
- Red: red-50 through red-900
- Green: green-50 through green-900
- Amber: amber-50 through amber-900
- Purple: purple-50 through purple-900
