import type { Shift } from "../types/scheduling";
import type { Employee } from "../types/employee";

/**
 * Calculate duration in hours from time strings
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return end - start;
}

/**
 * Format time string to remove seconds if present
 * "09:00:00" -> "09:00"
 */
export function formatTimeString(time: string): string {
  return time.substring(0, 5);
}

/**
 * Enrich a shift object with missing fields calculated from available data
 * This handles cases where backend returns incomplete Shift objects
 */
export function enrichShift(shift: any, employees: Employee[]): Shift {
  // Calculate duration hours if missing
  const durationHours = shift.durationHours ?? calculateDurationHours(shift.startTime, shift.endTime);

  // Calculate labor cost if missing
  const laborCost = shift.laborCost ?? (durationHours * shift.payRate);

  // Find employee name from employees list
  const employee = employees.find(emp => emp.id === shift.employeeId);
  const employeeName = shift.employeeName ?? employee?.fullName ?? 'Unknown';

  // Format time strings (remove seconds if present)
  const startTime = formatTimeString(shift.startTime);
  const endTime = formatTimeString(shift.endTime);

  return {
    ...shift,
    durationHours,
    laborCost,
    employeeName,
    startTime,
    endTime,
  };
}

/**
 * Enrich all shifts in a schedule response
 */
export function enrichSchedule(schedule: any, employees: Employee[]): any {
  if (!schedule.shifts) {
    return schedule;
  }

  return {
    ...schedule,
    shifts: schedule.shifts.map((shift: any) => enrichShift(shift, employees)),
  };
}