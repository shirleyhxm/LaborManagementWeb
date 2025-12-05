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

export interface Availability {
  dayOfWeek: string;
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