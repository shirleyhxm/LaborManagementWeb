# Step-by-Step Guide: Replacing Mock Data with API Calls

This guide shows you exactly how to replace mock data in your components with real API calls to the backend.

## Overview

The integration involves:
1. **Import hooks and types** from the services layer
2. **Replace mock data arrays** with API calls
3. **Add loading and error states** for better UX
4. **Update component logic** to use real data

---

## Example 1: ScheduleCreator Component

### Before (Mock Data)

```typescript
// ❌ OLD - Mock data at the top of file
const employees = [
  { id: 1, name: "Sarah Johnson", role: "Server", rate: 15 },
  { id: 2, name: "Mike Chen", role: "Server", rate: 15 },
  // ...
];
```

### After (API Integration)

```typescript
// ✅ NEW - Import hooks and types
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import type { OptimizationObjective } from "../types/scheduling";

export function ScheduleCreator() {
  // Use the hooks to fetch data
  const { employees, loading, error } = useEmployees();
  const { schedule, loading: scheduleLoading, generateSchedule } = useScheduling();

  // Handle auto-schedule button click
  const handleAutoSchedule = async () => {
    await generateSchedule({
      employeeIds: employees.map(emp => emp.id),
      laborCostBudget: 5000,
      salesForecast: { /* ... */ },
      schedulingPeriod: { /* ... */ }
    });
  };

  // Show loading state
  if (loading) {
    return <div>Loading employees...</div>;
  }

  // Show error state
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // Use real employee data
  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>{emp.fullName}</div>
      ))}
    </div>
  );
}
```

---

## Example 2: Simple Employee List

### Step-by-Step Conversion

#### Step 1: Remove mock data

```typescript
// ❌ DELETE THIS
const employees = [
  { id: 1, name: "John" },
  { id: 2, name: "Jane" }
];
```

#### Step 2: Import the hook

```typescript
// ✅ ADD THIS at the top
import { useEmployees } from "../hooks/useEmployees";
```

#### Step 3: Use the hook in your component

```typescript
export function MyComponent() {
  // ✅ ADD THIS
  const { employees, loading, error, refetch } = useEmployees();

  // ✅ ADD loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // ✅ ADD error state
  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error: {error.message}
          <Button onClick={refetch}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ✅ Use real data (employees is now from API)
  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>
          {emp.fullName} - ${emp.normalPayRate}/hr
        </div>
      ))}
    </div>
  );
}
```

---

## Example 3: Schedule Generation

### Before (Mock Button)

```typescript
<Button onClick={() => console.log("Generate schedule")}>
  Auto-Schedule
</Button>
```

### After (Real API Call)

```typescript
import { useScheduling } from "../hooks/useScheduling";

export function MyComponent() {
  const { schedule, loading, generateSchedule } = useScheduling();

  const handleGenerate = async () => {
    try {
      await generateSchedule({
        employeeIds: ["uuid1", "uuid2"],
        laborCostBudget: 5000,
        salesForecast: {
          MONDAY: { "09:00": 800, "12:00": 1200 },
          TUESDAY: { "09:00": 700, "12:00": 1100 },
        },
        schedulingPeriod: {
          daysToSchedule: ["MONDAY", "TUESDAY"],
          operatingHours: {
            MONDAY: { openTime: "09:00", closeTime: "21:00" },
            TUESDAY: { openTime: "09:00", closeTime: "21:00" },
          },
        },
      });
      alert("Schedule generated!");
    } catch (error) {
      alert("Failed to generate schedule");
    }
  };

  return (
    <div>
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Auto-Schedule"}
      </Button>

      {/* Display generated schedule */}
      {schedule && (
        <div>
          <h3>Generated Schedule</h3>
          <p>Total Cost: ${schedule.metrics.totalLaborCost}</p>
          <p>Total Shifts: {schedule.shifts.length}</p>
          {schedule.shifts.map(shift => (
            <div key={shift.id}>
              {shift.employeeName}: {shift.dayOfWeek} {shift.startTime}-{shift.endTime}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Fetching Data on Component Mount

```typescript
// The useEmployees hook automatically fetches on mount
const { employees, loading, error } = useEmployees();

// If you need to refetch, use the refetch function
const { employees, refetch } = useEmployees();
<Button onClick={refetch}>Refresh</Button>
```

### Pattern 2: Manual API Calls (Create/Update/Delete)

```typescript
import { employeeService } from "../services/employeeService";

const handleCreateEmployee = async () => {
  try {
    const newEmployee = await employeeService.createEmployee({
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "01/01/1990",
      normalPayRate: 15.0,
      overtimePayRate: 22.5,
      productivity: 150.0,
    });
    console.log("Created:", newEmployee);
    refetch(); // Refresh the list
  } catch (error) {
    console.error("Failed to create employee:", error);
  }
};

const handleUpdateEmployee = async (id: string) => {
  try {
    await employeeService.updateEmployee(id, {
      normalPayRate: 16.0,
    });
    refetch(); // Refresh the list
  } catch (error) {
    console.error("Failed to update employee:", error);
  }
};

const handleDeleteEmployee = async (id: string) => {
  try {
    await employeeService.deleteEmployee(id);
    refetch(); // Refresh the list
  } catch (error) {
    console.error("Failed to delete employee:", error);
  }
};
```

### Pattern 3: Conditional Rendering Based on Data

```typescript
const { employees, loading } = useEmployees();

return (
  <div>
    {loading && <Spinner />}
    {!loading && employees.length === 0 && (
      <EmptyState message="No employees found" />
    )}
    {!loading && employees.length > 0 && (
      <EmployeeList employees={employees} />
    )}
  </div>
);
```

---

## Quick Reference: What to Replace

### In ScheduleCreator.tsx

| Mock Data | Replace With |
|-----------|-------------|
| `const employees = [...]` | `const { employees } = useEmployees()` |
| `const shifts = [...]` | `const { schedule } = useScheduling()` then use `schedule.shifts` |
| Auto-Schedule button | `await generateSchedule({ ... })` |
| Hardcoded metrics | `schedule.metrics.totalLaborCost`, etc. |

### In EmployeePortal.tsx

| Mock Data | Replace With |
|-----------|-------------|
| `const mySchedule = [...]` | Fetch by employee ID: `employeeService.getEmployeeById(id)` |
| `const swapRequests = [...]` | Add new endpoint in backend for swap requests |
| `const timeOffRequests = [...]` | Add new endpoint in backend for time-off |

### In DashboardView.tsx

| Mock Data | Replace With |
|-----------|-------------|
| Dashboard metrics | Aggregate from `schedule.metrics` |
| Employee stats | Calculate from `employees` array |
| Recent activity | Add new endpoint for activity log |

---

## Testing Your Integration

### 1. Test with Backend Running

```bash
# Terminal 1: Start backend
cd /Users/shirleyhe/Desktop/Projects/LaborManagement
./gradlew run

# Terminal 2: Frontend is already running
# Just open http://localhost:3000
```

### 2. Check Network Tab

Open browser DevTools > Network tab:
- You should see requests to `/api/employees`
- You should see requests to `/api/scheduling/generate`
- Check the response data matches expected format

### 3. Test Error Handling

- Stop the backend server
- See if the frontend shows error messages properly
- Restart backend and click "Retry" button

---

## Complete Example: See It In Action

I've created a fully integrated example component:

**File:** `src/components/ScheduleCreatorIntegrated.tsx`

To use it:

1. Open `src/App.tsx`
2. Replace:
   ```typescript
   import { ScheduleCreator } from "./components/ScheduleCreator";
   ```
   with:
   ```typescript
   import { ScheduleCreatorIntegrated as ScheduleCreator } from "./components/ScheduleCreatorIntegrated";
   ```

3. The Schedule tab will now use real backend data!

---

## Troubleshooting

### Issue: "Failed to fetch"

**Cause:** Backend is not running or not accessible

**Fix:**
```bash
cd /Users/shirleyhe/Desktop/Projects/LaborManagement
./gradlew run
```

### Issue: CORS errors

**Cause:** Vite proxy not configured properly

**Fix:** The proxy is already configured in `vite.config.ts`. Make sure you restarted the dev server after adding the proxy.

### Issue: Empty employee list

**Cause:** No employees in backend database

**Fix:** Create some test employees:
```bash
curl -X POST http://localhost:8080/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "01/01/1990",
    "normalPayRate": 15.0,
    "overtimePayRate": 22.5,
    "productivity": 150.0
  }'
```

### Issue: Type errors

**Cause:** TypeScript types don't match backend response

**Fix:** Check the backend response format and update types in `src/types/`

---

## Next Steps

1. ✅ **Done:** Basic API integration
2. 🔄 **In Progress:** Replace mock data in components
3. ⏭️ **Next:** Add create/edit forms for employees
4. ⏭️ **Next:** Add employee portal integration
5. ⏭️ **Next:** Add real-time updates with polling or WebSockets

---

## Need Help?

- Check `BACKEND_INTEGRATION.md` for API endpoint documentation
- Check `src/components/EmployeeManager.tsx` for a working example
- Check `src/components/ScheduleCreatorIntegrated.tsx` for full schedule integration