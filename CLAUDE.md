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

The frontend cannot be usefully exercised on its own: almost every page (including `/rules`) requires an authenticated session and real API responses. There is no mock/msw layer in this repo, so **do not stub `fetch` or fake auth state to preview UI** — run the real backend instead.

Scheduling logic lives entirely in the backend: the frontend only POSTs to `/schedules/generate`, and the backend resolves every rule from saved constraints itself. **Changes to how rules affect schedules are backend changes** — verifying them means running the real stack, not reading frontend code.

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

#### Testing the employee portal

**The admin account has no employee record**, so `/employee-portal` signed in as admin only ever shows "No employee record is linked to your account." That is the expected empty state, not a bug — and it means the portal cannot be exercised at all from the admin login.

Use **`alice@test.com` / `Employee123!`** instead. It is linked to the Alice Chrome employee record in the demo business, so the portal renders for real: profile, clock-in, My Rota, Attendance, Annual Leave, Shift Swaps, Availability, Contracts.

This login is not part of the auto-seeded set above — it exists in the local `labormanagement` database only, so a reset via `POST /api/test/reset-database` will remove it. Check what is actually linked with:

```sql
SELECT e.first_name, e.last_name, e.user_id, b.name
FROM employees e JOIN businesses b ON e.business_id = b.id
WHERE e.user_id IS NOT NULL;
```

Two things about the portal that look like bugs and are not:

- **It shows PUBLISHED shifts only.** Against the usual demo data (all DRAFT) every day reads "0 scheduled" even though shifts exist. Publish a schedule first, or query with an explicit status to see them.
- **`allLocations=true` only enriches for the employee themselves.** Asked as that employee it returns rows carrying `businessId`/`businessName`; asked as an admin about someone else it returns the plain `Shift` shape, since the option is restricted to the caller's own record. Verifying multi-location behaviour therefore has to be done signed in as the employee.

### 2. Start the frontend

```bash
npm run dev
```

Runs on `http://localhost:3000` (see `vite.config.ts`); `/api` requests are proxied to `localhost:8080`.

### 3. Log in and drive the UI

Navigate to `http://localhost:3000/login` and sign in with `admin@shiftoptimizer.com` / `Admin123!`. A demo business with sample employees/forecast data is typically already present from prior seeding; if a fresh backend has none, create a business through the UI (or `POST /api/test/create-sample-employees` seeds sample employees for the fixed test business ID).

`POST /api/test/create-sample-employees` uses a fixed business ID and will fail with a foreign-key error against an empty database — the business row has to exist first, so create one through the UI before calling it.

From there, navigate directly to feature routes, e.g. `http://localhost:3000/rules` for the Rules editor (Working Time / Pay & Cost / Priorities tabs).

### 4. Give employees availability before generating a schedule

**The seeded test employees have no availability rows.** Availability is a hard constraint, so every `x[employee][slot]` is pinned to zero and generation returns a schedule with **zero shifts** — no error, no violation explaining why, just an empty grid. This looks exactly like a broken constraint and will send you debugging the solver for a bug that isn't there.

Check before generating:

```js
// In the browser console on any authenticated page
const bid = localStorage.getItem('current_business_id');
const tok = localStorage.getItem('auth_token');
const r = await (await fetch(`/api/businesses/${bid}/employees`, {headers:{Authorization:`Bearer ${tok}`}})).json();
(Array.isArray(r) ? r : r.employees).map(e => ({name: e.fullName, avail: (e.availability||[]).length}));
```

If `avail` is 0, PUT each employee back with a full week of availability (`availabilityType: 'WEEKLY_RECURRING'`, one row per `dayOfWeek`, e.g. `09:00`–`21:00`) before generating.

### Notes

- Data is stored in Postgres and persists across backend restarts (not in-memory) — no need to reseed every session, but `POST /api/test/reset-database` wipes everything if you need a clean slate.
- Auth token/business selection is persisted in `localStorage` (`auth_token`, `current_business_id`, etc.) — clearing it forces a fresh login.
- **`./gradlew run` serves whatever was last compiled.** Editing backend source while the server runs changes nothing until you restart it, so a "fix" can appear not to work — or worse, appear to work when you're actually still testing old code. Restart after every backend edit, and if in doubt compare the class mtime against the source: `ls -la build/classes/kotlin/main/.../ScheduleOptimizer.class` vs the `.kt` file.
- `./gradlew run` buffers its output when backgrounded, so logs never appear. Redirect to a file instead (`nohup ./gradlew run > /tmp/backend.log 2>&1 &`) — solver decisions are logged there (`Solver status: OPTIMAL`, `Falling back to GREEDY`), which is the fastest way to tell which scheduling path actually produced a result.
- Generation silently falls back to the greedy scheduler when CP-SAT finds no feasible solution, and the two paths don't enforce the same rules. Always confirm which one ran before concluding a constraint is broken.

### Verifying rules actually took effect

Reading the schedule grid by eye does not scale past a couple of days. Fetch the schedule and assert on it instead — merge each employee-day's shifts into contiguous blocks, then check block lengths and the gaps between them. Shifts are stored split at the overtime boundary, so two rows that look like separate shifts are often one continuous block; comparing raw rows produces false violations.

Constraints that hold for one employee on one day can still break across a full week — bugs involving slot adjacency or multi-day windows only surface with several employees over several days, which is exactly the case unit tests tend to miss. When a rule misbehaves end-to-end but passes its unit test, suspect the multi-day case first.

Restore anything you changed while testing (Rules settings, employee availability) and delete the schedules you generated, so the next session starts from a clean demo business.

## Architecture

### Routing & Navigation

The app uses **React Router v7** with a single-page application structure. The main navigation is implemented as a **vertical sidebar** with tab-based routing in `App.tsx`:

- Routes are mapped to URL paths (e.g., `/`, `/schedule`, `/forecast`, `/rules`, `/alerts`, `/analytics`, `/employees`)
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
