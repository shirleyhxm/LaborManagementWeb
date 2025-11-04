# Backend Integration Guide

This document explains how the React frontend connects to the Kotlin backend API.

## Architecture Overview

```
Frontend (React/Vite)  -->  Vite Proxy  -->  Backend API (Kotlin/Ktor)
   localhost:3000              /api            0.0.0.0:8080
```

## Configuration

### 1. Vite Proxy Setup

The Vite dev server is configured to proxy API requests to the backend:

**File:** `vite.config.ts`

```typescript
server: {
  port: 3000,
  open: true,
  proxy: {
    '/api': {
      target: 'http://0.0.0.0:8080',
      changeOrigin: true,
    },
  },
}
```

This means any request to `http://localhost:3000/api/*` will be forwarded to `http://0.0.0.0:8080/api/*`.

## API Service Layer

### Base API Client

**File:** `src/services/api.ts`

Provides HTTP methods (GET, POST, PUT, DELETE) with error handling:

```typescript
import { api } from './services/api';

// Example usage
const data = await api.get('/employees');
const created = await api.post('/employees', employeeData);
```

### Employee Service

**File:** `src/services/employeeService.ts`

Manages employee-related API calls:

```typescript
import { employeeService } from './services/employeeService';

// Get all employees
const employees = await employeeService.getAllEmployees();

// Get single employee
const employee = await employeeService.getEmployeeById('uuid');

// Create employee
const newEmployee = await employeeService.createEmployee({
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '01/01/1990',
  normalPayRate: 15.0,
  overtimePayRate: 22.5,
  productivity: 150.0,
});

// Update employee
await employeeService.updateEmployee('uuid', { normalPayRate: 16.0 });

// Delete employee
await employeeService.deleteEmployee('uuid');
```

### Scheduling Service

**File:** `src/services/schedulingService.ts`

Handles schedule generation:

```typescript
import { schedulingService } from './services/schedulingService';

// Generate schedule
const schedule = await schedulingService.generateSchedule({
  employeeIds: ['uuid1', 'uuid2'],
  laborCostBudget: 5000.0,
  salesForecast: {
    MONDAY: { '09:00': 800.0, '12:00': 1200.0 },
    TUESDAY: { '09:00': 700.0, '12:00': 1100.0 },
  },
  schedulingPeriod: {
    daysToSchedule: ['MONDAY', 'TUESDAY'],
    operatingHours: {
      MONDAY: { openTime: '09:00', closeTime: '21:00' },
      TUESDAY: { openTime: '09:00', closeTime: '21:00' },
    },
  },
});
```

## TypeScript Types

### Employee Types

**File:** `src/types/employee.ts`

```typescript
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  fullName: string;
  dateOfBirth: string;
  normalPayRate: number;
  overtimePayRate: number;
  productivity: number;
  contract: Contract;
  availability: Availability[];
}
```

### Scheduling Types

**File:** `src/types/scheduling.ts`

```typescript
interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  payRate: number;
  laborCost: number;
  isOvertime: boolean;
}

interface SchedulingResponse {
  shifts: Shift[];
  metrics: SchedulingMetrics;
  violations: ConstraintViolation[];
  staffingRequirements: StaffingRequirement[];
  isValid: boolean;
}
```

## React Hooks

### useEmployees Hook

**File:** `src/hooks/useEmployees.ts`

Simplifies employee data fetching in components:

```typescript
import { useEmployees } from './hooks/useEmployees';

function MyComponent() {
  const { employees, loading, error, refetch } = useEmployees();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>{emp.fullName}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### useScheduling Hook

**File:** `src/hooks/useScheduling.ts`

Manages schedule generation:

```typescript
import { useScheduling } from './hooks/useScheduling';

function ScheduleComponent() {
  const { schedule, loading, error, generateSchedule } = useScheduling();

  const handleGenerate = async () => {
    try {
      await generateSchedule({
        employeeIds: [...],
        laborCostBudget: 5000,
        // ... other params
      });
    } catch (err) {
      console.error('Failed to generate schedule', err);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Schedule'}
      </button>
      {schedule && <ScheduleView data={schedule} />}
    </div>
  );
}
```

## Example Integration Component

**File:** `src/components/EmployeeManager.tsx`

A complete example showing:
- Loading states
- Error handling
- Data display
- Refresh functionality

Navigate to the "Employees" tab in the app to see it in action.

## Backend API Endpoints

### Employee Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | Get all employees |
| GET | `/api/employees/:id` | Get employee by ID |
| POST | `/api/employees` | Create new employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

### Scheduling Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scheduling/generate` | Generate schedule |
| GET | `/api/scheduling/sample-request` | Get sample request |

## Running Both Servers

### Start the Backend

```bash
cd /Users/shirleyhe/Desktop/Projects/LaborManagement
./gradlew run
```

Backend will run on `http://0.0.0.0:8080`

### Start the Frontend

```bash
cd /Users/shirleyhe/WebstormProjects/labor-management-web
npm run dev
```

Frontend will run on `http://localhost:3000`

## Testing the Integration

1. Make sure the backend is running on port 8080
2. Start the frontend dev server
3. Navigate to `http://localhost:3000`
4. Click on the "Employees" tab
5. You should see employees loaded from the backend API

## Error Handling

The API client includes built-in error handling:

```typescript
try {
  const employees = await employeeService.getAllEmployees();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Data:', error.data);
  }
}
```

## Next Steps

To integrate other components:

1. **ScheduleCreator**: Replace mock data with `useScheduling` hook
2. **EmployeePortal**: Fetch employee-specific data using employee ID
3. **Add forms**: Create components for adding/editing employees
4. **State management**: Consider adding React Query for better caching

## CORS Issues

If you encounter CORS errors:

1. The Vite proxy should handle this during development
2. For production, configure CORS in the Kotlin backend
3. The `changeOrigin: true` in proxy config helps with this

## Date Format

The backend expects dates in `dd/MM/yyyy` format:
- ✅ Correct: `"25/10/2025"`
- ❌ Incorrect: `"10/25/2025"` or `"2025-10-25"`

Make sure to format dates correctly when creating/updating employees.
