export interface ClockRecord {
  id: string;
  employeeId: string;
  clockInTime: string; // ISO 8601 datetime string
  clockOutTime: string | null; // null if currently clocked in
  durationHours: number | null; // null if currently clocked in
  shiftId: string | null;
  scheduleId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  employeeId: string;
  startDate: string;
  endDate: string;
  totalHoursWorked: number;
  totalScheduledHours: number;
  attendanceRate: number; // percentage
  averageHoursPerDay: number;
  totalDaysWorked: number;
  totalDaysScheduled: number;
}

export interface ClockInRequest {
  employeeId: string;
  shiftId?: string;
  scheduleId?: string;
  notes?: string;
}

export interface ClockOutRequest {
  id: string;
  notes?: string;
}

export interface ActiveClockStatus {
  isActive: boolean;
  record: ClockRecord | null;
}
