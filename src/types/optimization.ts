// TypeScript types for V2 Optimization API

export interface OptimizationRequestV2 {
  demandMatrix: DemandMatrix;
  workers: WorkerInput[];
  constraints: ConstraintConfig;
  objective: ObjectiveConfig;
  requestedBy?: string;
}

export interface DemandMatrix {
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;
  timeSlotMinutes?: number; // Default 60
  slots: DemandSlot[];
}

export interface DemandSlot {
  day: string; // "MONDAY", "TUESDAY", etc.
  startTime: string; // "HH:mm"
  endTime: string;
  requiredCount: number;
  skillsNeeded?: string[];
}

export interface WorkerInput {
  id?: string;
  name: string;
  hourlyRate: number;
  skills?: string[];
  availability: AvailabilitySlot[];
  maxHoursPerWeek?: number;
  productivity?: number; // Default 1.0
}

export interface AvailabilitySlot {
  dayOfWeek: string; // "MONDAY", "TUESDAY", etc.
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface ConstraintConfig {
  maxHoursPerWeek?: number; // Default 40
  minRestBetweenShifts?: number; // hours, default 8
  maxConsecutiveDays?: number; // Default 6
  overtimeThreshold?: number; // Default 40
  overtimeMultiplier?: number; // Default 1.5
  minShiftLength?: number; // hours, default 4
  maxShiftLength?: number; // hours, default 10
  budgetLimit?: number;
  customConstraints?: string[];
}

export interface ObjectiveConfig {
  primary: string; // "MINIMIZE_COST", "MAXIMIZE_SALES", "BALANCE_WORKLOAD", "BALANCED"
  weights?: Record<string, number>;
}

export interface OptimizationJobResponse {
  jobId: string;
  status: string; // "QUEUED", "RUNNING", "COMPLETED", "FAILED"
  message?: string;
}

export interface OptimizationJobStatus {
  jobId: string;
  status: string; // "QUEUED", "RUNNING", "COMPLETED", "FAILED"
  solveStatus?: string; // "OPTIMAL", "FEASIBLE", "INFEASIBLE", "TIMEOUT"
  progress?: number; // 0-100
  solveTimeMs?: number;
  results?: OptimizationResult;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface OptimizationResult {
  solveStatus: string;
  isOptimal: boolean;
  solveTimeMs: number;
  assignments: Assignment[];
  metrics: ResultMetrics;
  violations?: string[];
}

export interface Assignment {
  workerId: string;
  workerName: string;
  shifts: Shift[];
  totalHours: number;
  totalPay: number;
  utilization: number; // Percentage
}

export interface Shift {
  day: string;
  startTime: string;
  endTime: string;
  duration: number; // hours
  payRate: number;
  isOvertime: boolean;
}

export interface ResultMetrics {
  totalLaborCost: number;
  totalHours: number;
  coveragePercent: number;
  averageUtilization: number;
  numberOfWorkers: number;
  numberOfShifts: number;
  comparisonToBaseline?: ComparisonMetrics;
}

export interface ComparisonMetrics {
  costSavingsPercent: number;
  hoursSavedPercent: number;
  coverageImprovement: number;
}

export interface WorkerImportResponse {
  success: boolean;
  workersImported: number;
  errors: string[];
  workers: WorkerInput[];
}
