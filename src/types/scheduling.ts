// Shift model (matches backend)
export interface Shift {
  id: string;
  employeeId: string;
  employeeName?: string; // Enriched on frontend
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  payRate: number;
  laborCost: number;
  isOvertime: boolean;
}

export interface SchedulingMetrics {
  totalLaborCost: number;
  estimatedTotalSales: number;
  laborCostPercentage: number;
  employeeUtilization: Record<string, number>;
}

export interface ConstraintViolation {
  type: string;
  description: string;
  employeeId: string | null;
}

export interface StaffingRequirement {
  dayOfWeek: string;
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
  daysToSchedule: string[];
  operatingHours: Record<string, OperatingHours>;
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