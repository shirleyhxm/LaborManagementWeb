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

export interface SchedulingMetrics {
  totalLaborCost: number;
  estimatedTotalSales: number;
  laborCostPercentage: number;
  employeeUtilization: Record<string, number>;
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

// ScheduleInput model
export interface ScheduleInput {
  employeeIds: string[];
  laborCostBudget: number;
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