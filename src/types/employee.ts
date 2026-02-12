export interface Employee {
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
  groups: string[];
}

export interface Contract {
  contractedHoursPerWeek: number;
  maxHoursPerWeek: number;
  maxHoursPerDay: number;
  overtimeThreshold: number;
  requiresBreak: boolean;
  breakDurationMinutes: number;
  shiftLengthThresholdHours: number;
}

export enum AvailabilityType {
  WEEKLY_RECURRING = "WEEKLY_RECURRING",
  SPECIFIC_DATE = "SPECIFIC_DATE",
  DATE_RANGE = "DATE_RANGE"
}

export interface DateRange {
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
}

export interface Availability {
  availabilityType: AvailabilityType;
  // For WEEKLY_RECURRING pattern
  dayOfWeek?: string;
  // For SPECIFIC_DATE pattern
  specificDate?: string; // ISO date (YYYY-MM-DD)
  // For DATE_RANGE pattern
  dateRange?: DateRange;
  // Time availability (applicable to all patterns)
  startTime: string;
  endTime: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  normalPayRate: number;
  overtimePayRate: number;
  productivity?: number;
  contract?: Contract;
  availability?: Availability[];
  groups?: string[];
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  normalPayRate?: number;
  overtimePayRate?: number;
  productivity?: number;
  contract?: Contract;
  availability?: Availability[];
  groups?: string[];
}