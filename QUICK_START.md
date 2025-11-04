# Quick Start: Replace Mock Data in 3 Simple Steps

## Step 1: Update App.tsx to Use Integrated Components

Open `src/App.tsx` and replace the import:

```typescript
// BEFORE
import { ScheduleCreator } from "./components/ScheduleCreator";

// AFTER
import { ScheduleCreatorIntegrated as ScheduleCreator } from "./components/ScheduleCreatorIntegrated";
```

That's it! The Schedule tab now uses real backend data.

## Step 2: Make Sure Backend is Running

```bash
cd /Users/shirleyhe/Desktop/Projects/LaborManagement
./gradlew run
```

Wait for: `Application started in X.X seconds`

## Step 3: Test the Integration

1. Open http://localhost:3000
2. Click on **"Employees"** tab
   - You'll see employees loaded from the backend
   - If empty, the backend has no employees yet

3. Click on **"Schedule"** tab (if you did Step 1)
   - You'll see real employees listed
   - Click **"Auto-Schedule"** button
   - Schedule will be generated using the backend API
   - You'll see metrics like total cost, sales, etc.

## Adding Test Data to Backend

If you have no employees, create some test data:

```bash
# Create Employee 1
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Johnson",
    "dateOfBirth": "15/03/1995",
    "normalPayRate": 15.0,
    "overtimePayRate": 22.5,
    "productivity": 150.0,
    "availability": [
      {"dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "18:00"},
      {"dayOfWeek": "TUESDAY", "startTime": "09:00", "endTime": "18:00"},
      {"dayOfWeek": "WEDNESDAY", "startTime": "09:00", "endTime": "18:00"},
      {"dayOfWeek": "THURSDAY", "startTime": "09:00", "endTime": "18:00"},
      {"dayOfWeek": "FRIDAY", "startTime": "09:00", "endTime": "18:00"}
    ]
  }'

# Create Employee 2
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Mike",
    "lastName": "Chen",
    "dateOfBirth": "22/07/1998",
    "normalPayRate": 16.0,
    "overtimePayRate": 24.0,
    "productivity": 160.0,
    "availability": [
      {"dayOfWeek": "MONDAY", "startTime": "14:00", "endTime": "22:00"},
      {"dayOfWeek": "TUESDAY", "startTime": "14:00", "endTime": "22:00"},
      {"dayOfWeek": "WEDNESDAY", "startTime": "14:00", "endTime": "22:00"},
      {"dayOfWeek": "THURSDAY", "startTime": "14:00", "endTime": "22:00"},
      {"dayOfWeek": "FRIDAY", "startTime": "14:00", "endTime": "22:00"}
    ]
  }'

# Create Employee 3
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Emma",
    "lastName": "Davis",
    "dateOfBirth": "10/11/1992",
    "normalPayRate": 18.0,
    "overtimePayRate": 27.0,
    "productivity": 180.0,
    "availability": [
      {"dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "21:00"},
      {"dayOfWeek": "WEDNESDAY", "startTime": "09:00", "endTime": "21:00"},
      {"dayOfWeek": "FRIDAY", "startTime": "09:00", "endTime": "21:00"},
      {"dayOfWeek": "SATURDAY", "startTime": "10:00", "endTime": "18:00"},
      {"dayOfWeek": "SUNDAY", "startTime": "10:00", "endTime": "18:00"}
    ]
  }'
```

Then refresh the browser and you'll see 3 employees!

## What's Integrated So Far

✅ **Employees Tab** - Fully integrated with backend
- Fetches real employees from API
- Shows loading states
- Shows error states with retry button
- Displays employee details (pay rate, availability, etc.)

✅ **Schedule Tab** (if you swapped the component)
- Uses real employees from backend
- Auto-Schedule button calls backend API
- Displays generated schedule with real data
- Shows metrics: cost, sales, labor percentage
- Shows constraint violations
- Shows understaffing warnings

## What Still Uses Mock Data

❌ **Dashboard Tab** - Still uses mock data
❌ **Forecast Tab** - Still uses mock data
❌ **Constraints Tab** - Still uses mock data
❌ **Alerts Tab** - Still uses mock data
❌ **Analytics Tab** - Still uses mock data
❌ **Employee Portal View** - Still uses mock data

## Next: Replace Other Components

To replace other components, follow the pattern shown in `INTEGRATION_GUIDE.md`.

The basic pattern is:

1. Import the hook: `import { useEmployees } from "../hooks/useEmployees"`
2. Use the hook: `const { employees, loading, error } = useEmployees()`
3. Add loading state: `if (loading) return <Spinner />`
4. Add error state: `if (error) return <ErrorMessage />`
5. Use real data: `employees.map(emp => ...)`

## Verify Integration is Working

### Check 1: Network Requests

Open browser DevTools (F12) > Network tab:
- Navigate to Employees tab
- You should see: `GET /api/employees` with Status 200
- Click Auto-Schedule
- You should see: `POST /api/scheduling/generate` with Status 200

### Check 2: Console Errors

Open browser console (F12) > Console tab:
- Should be no errors
- If you see CORS errors, restart the dev server
- If you see 404 errors, check backend is running

### Check 3: Data Display

- Employees tab should show employee names, not placeholders
- After Auto-Schedule, should show actual shift times and names
- Metrics should update with real numbers from backend

## Troubleshooting

**Problem:** "Failed to fetch" error

**Solution:** Start the backend:
```bash
cd /Users/shirleyhe/Desktop/Projects/LaborManagement
./gradlew run
```

**Problem:** No employees showing

**Solution:** Add test data using the curl commands above

**Problem:** Schedule generation fails

**Solution:** Make sure you have at least 2 employees with availability

**Problem:** Types error in TypeScript

**Solution:** The types are already defined in `src/types/`. Make sure you're importing from the right path.

## Summary

You now have:
- ✅ Vite proxy configured
- ✅ TypeScript types defined
- ✅ API services created
- ✅ React hooks ready to use
- ✅ Example components showing integration
- ✅ Employees tab fully working
- ✅ Schedule tab ready to integrate

Just swap the component import in App.tsx and you're done!
