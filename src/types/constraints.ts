// ====== Budget Constraints Types ======

export interface BudgetConstraints {
  weeklyBudget: number;
  monthlyBudget: number;
  hardBudgetLimit: boolean;
  budgetWarningThreshold: number;
  updatedAt: string;
}

export interface BudgetConstraintsRequest {
  weeklyBudget: number;
  monthlyBudget: number;
  hardBudgetLimit: boolean;
  budgetWarningThreshold: number;
}

// ====== Hourly Rate Rules Types ======

export interface HourlyRateRule {
  roleId?: string;
  baseRate: number;
  overtimeMultiplier: number;
  weekendPremium: number;
}

export interface HourlyRateRuleRequest {
  roleId?: string;
  baseRate: number;
  overtimeMultiplier: number;
  weekendPremium: number;
}

// ====== Working Hours Rules Types ======

export interface WorkingHoursRules {
  maxHoursPerWeek: number;
  maxOvertimeHours: number;
  minRestBetweenShifts: number;
  maxConsecutiveDays: number;
  maxShiftLength: number;
  minShiftLength: number;
  updatedAt: string;
}

export interface WorkingHoursRulesRequest {
  maxHoursPerWeek: number;
  maxOvertimeHours: number;
  minRestBetweenShifts: number;
  maxConsecutiveDays: number;
  maxShiftLength: number;
  minShiftLength: number;
}

// ====== Employee Contracted Hours Types ======

export interface EmployeeContractedHours {
  employeeId: string;
  minHours: number;
  contractedHours: number;
  maxHours: number;
  effectiveFrom: string;
  effectiveTo?: string;
  updatedAt: string;
}

export interface EmployeeContractedHoursRequest {
  employeeId: string;
  minHours: number;
  contractedHours: number;
  maxHours: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ====== Compliance Rules Types ======

export interface ComplianceRules {
  flsaOvertimeEnabled: boolean;
  mealBreakRequired: boolean;
  mealBreakMinShiftHours: number;
  mealBreakDuration: number;
  minorLaborLawsEnabled: boolean;
  advanceNoticePeriod: number;
  updatedAt: string;
}

export interface ComplianceRulesRequest {
  flsaOvertimeEnabled: boolean;
  mealBreakRequired: boolean;
  mealBreakMinShiftHours: number;
  mealBreakDuration: number;
  minorLaborLawsEnabled: boolean;
  advanceNoticePeriod: number;
}

// ====== Custom Compliance Rules Types ======

export type CustomComplianceRuleType = 'split_shift' | 'state_specific' | 'custom';

export interface CustomComplianceRule {
  name: string;
  description: string;
  isActive: boolean;
  ruleType: CustomComplianceRuleType;
  configuration: Record<string, any>;
}

export interface CustomComplianceRuleRequest {
  name: string;
  description: string;
  isActive: boolean;
  ruleType: CustomComplianceRuleType;
  configuration: Record<string, any>;
}

// ====== Scheduling Priority Types ======

export type PriorityType = 'contracted_hours' | 'availability' | 'forecast' | 'labor_cost' | 'fair_distribution';

export interface SchedulingPriority {
  priorityOrder: number;
  priorityType: PriorityType;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface SchedulingPriorityRequest {
  priorityOrder: number;
  priorityType: PriorityType;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface PriorityReorderRequest {
  priorities: SchedulingPriorityRequest[];
}

// ====== Fairness Settings Types ======

export interface FairnessSettings {
  rotateWeekendShifts: boolean;
  balanceDesirableShifts: boolean;
  seniorityPreference: boolean;
  updatedAt: string;
}

export interface FairnessSettingsRequest {
  rotateWeekendShifts: boolean;
  balanceDesirableShifts: boolean;
  seniorityPreference: boolean;
}

// ====== Bulk Operations Types ======

export interface AllConstraints {
  budget: BudgetConstraints | null;
  hourlyRates: HourlyRateRule[];
  workingHours: WorkingHoursRules | null;
  contractedHours: EmployeeContractedHours[];
  compliance: ComplianceRules | null;
  customCompliance: CustomComplianceRule[];
  priorities: SchedulingPriority[];
  fairness: FairnessSettings | null;
}

// ====== Validation Types ======

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ConstraintValidationResponse {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ConstraintValidationRequest {
  constraintType: string;
  constraints: Record<string, any>;
}
