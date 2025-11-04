export interface Shift {
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

export interface SchedulingResponse {
  shifts: Shift[];
  metrics: SchedulingMetrics;
  violations: ConstraintViolation[];
  staffingRequirements: StaffingRequirement[];
  isValid: boolean;
}

export interface OperatingHours {
  openTime: string;
  closeTime: string;
}

export interface SchedulingPeriod {
  daysToSchedule: string[];
  operatingHours: Record<string, OperatingHours>;
}

export interface GenerateScheduleRequest {
  employeeIds: string[];
  laborCostBudget: number;
  salesForecast: Record<string, Record<string, number>>; // DayOfWeek -> Time -> Sales
  schedulingPeriod: SchedulingPeriod;
  optimizationObjective?: OptimizationObjective;
}

export type OptimizationObjective =
  | "MAXIMIZE_SALES"
  | "MINIMIZE_LABOR_COST"
  | "BALANCED"
  | "MAXIMIZE_FAIRNESS";