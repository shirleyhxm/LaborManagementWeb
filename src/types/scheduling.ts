// Shift model (matches backend)
export interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string; // Enriched on frontend
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string;
  endTime: string;
  durationHours: number;
  payRate: number;
  laborCost: number;
  isOvertime: boolean;
  // Derived property - can be computed from date
  dayOfWeek?: string;
}

/**
 * One of the caller's own shifts, carrying the location it is at.
 *
 * Used where an employee's shifts span several locations, so each row has to
 * say which one it belongs to.
 */
export interface EmployeeShift {
  id: string;
  employeeId: string;
  businessId: string;
  businessName: string;
  date: string;
  startTime: string;
  endTime: string;
  payRate: number;
  isOvertime: boolean;
}

export interface SchedulingMetrics {
  totalLaborCost: number;
  estimatedTotalSales: number;
  laborCostPercentage: number;
  employeeUtilization: Record<string, number>;
  // Employer-side on-costs (e.g. Employer National Insurance) on top of
  // wage pay. Zero when the business has no payroll cost rules enabled.
  // Reporting only - the labor cost budget is wage cost only.
  totalEmployerOnCost: number;
}

// Constraint violation types matching backend sealed class hierarchy
export type ViolationType =
  | "BUDGET_EXCEEDED"
  | "AVAILABILITY_CONFLICT"
  | "CONTRACT_HOURS_EXCEEDED"
  | "MISSING_BREAK"
  | "SHIFT_OVERLAP"
  | "UNDERSTAFFING";

export interface BaseConstraintViolation {
  type: ViolationType;
  description: string;
}

export interface ScheduleLevelViolation extends BaseConstraintViolation {
  // Schedule-level violations (e.g., budget exceeded)
  // No additional fields
}

export interface TimeBlockViolation extends BaseConstraintViolation {
  // Time block violations (e.g., understaffing at a specific time)
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string;
  endTime: string;
}

export interface EmployeeViolation extends BaseConstraintViolation {
  // Employee-level violations (e.g., weekly hours exceeded)
  employeeId: string;
}

export interface EmployeeDayViolation extends BaseConstraintViolation {
  // Employee + Day violations (e.g., daily hours exceeded)
  employeeId: string;
  date: string; // ISO date (YYYY-MM-DD)
}

export interface ShiftViolation extends BaseConstraintViolation {
  // Shift-level violations (e.g., availability conflict, overlapping shifts)
  employeeId: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string;
  endTime: string;
}

export type ConstraintViolation =
  | ScheduleLevelViolation
  | TimeBlockViolation
  | EmployeeViolation
  | EmployeeDayViolation
  | ShiftViolation;

// Type guard functions for violation types
export function isScheduleLevelViolation(v: ConstraintViolation): v is ScheduleLevelViolation {
  return !('employeeId' in v) && !('date' in v);
}

export function isTimeBlockViolation(v: ConstraintViolation): v is TimeBlockViolation {
  return 'date' in v && 'startTime' in v && 'endTime' in v && !('employeeId' in v);
}

export function isEmployeeViolation(v: ConstraintViolation): v is EmployeeViolation {
  return 'employeeId' in v && !('date' in v);
}

export function isEmployeeDayViolation(v: ConstraintViolation): v is EmployeeDayViolation {
  return 'employeeId' in v && 'date' in v && !('startTime' in v);
}

export function isShiftViolation(v: ConstraintViolation): v is ShiftViolation {
  return 'employeeId' in v && 'date' in v && 'startTime' in v && 'endTime' in v;
}

/**
 * A violation as it arrives on an error response (`ViolationDto` on the backend).
 *
 * This is not the same shape as `ConstraintViolation` above, which models the
 * violations embedded in a *schedule*: the wire form carries an explicit `scope`
 * discriminator instead of relying on which fields are present, and identifies
 * the day by name (`dayOfWeek`) rather than by ISO `date`.
 */
export type ViolationScope =
  | "SCHEDULE"
  | "TIME_BLOCK"
  | "EMPLOYEE"
  | "EMPLOYEE_DAY"
  | "SHIFT";

export interface ViolationDto {
  type: ViolationType;
  description: string;
  scope: ViolationScope;
  employeeId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

/** Body of a 422 from the shift-modification endpoints. */
export interface ValidationErrorResponse {
  success: false;
  message: string;
  violations: ViolationDto[];
}

export interface StaffingRequirement {
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string;
  endTime: string;
  employeesNeeded: number;
  employeesAssigned: number;
  expectedSales: number;
  isUnderstaffed: boolean;
  staffingGap: number;
}

// Schedule model (matches backend)
export interface Schedule {
  id: string;
  name: string;
  status: ScheduleStatus;
  schedulePeriod: SchedulePeriod;
  shifts: Shift[];
  metrics: SchedulingMetrics;
  violations: ConstraintViolation[];
  staffingRequirements: StaffingRequirement[];
  employeeIds: string[],
  laborCostBudget: number,
  minShiftDurationHours: number,
  optimizationObjective: OptimizationObjective,
  version: number;
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  lastModifiedAt: string;
  lastModifiedBy: string;
  notes: string | null;
  isDraft?: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  isEditable?: boolean;
  totalShifts?: number;
  totalLaborCost?: number;
  isValid?: boolean;
}

export enum ScheduleStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED"
}

export interface OperatingHours {
  openTime: string;
  closeTime: string;
}

export interface SchedulePeriod {
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  operatingHours: Record<string, OperatingHours>; // Key is ISO date string
}

// ScheduleInput model. Labor cost budget is deliberately absent - it's
// resolved server-side from the business's saved Rules budget,
// not supplied by the client.
export interface ScheduleInput {
  employeeIds: string[];
  schedulePeriod: SchedulePeriod;
  minShiftDurationHours?: number;
  optimizationObjective?: OptimizationObjective;
}

// API request for /api/schedules/generate
export interface GenerateScheduleRequest {
  input: ScheduleInput;
  name?: string;
  generatedBy?: string;
}

export type OptimizationObjective =
  | "MAXIMIZE_SALES"
  | "MINIMIZE_LABOR_COST"
  | "BALANCED"
  | "MAXIMIZE_FAIRNESS";

// Legacy alias
export type SchedulingResponse = Schedule;