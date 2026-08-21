export interface ClockRecord {
  id: string;
  employeeId: string;
  scheduleId: string | null;
  shiftId: string | null;
  clockInTime: string;
  clockOutTime: string | null;
  durationHours: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface AttendanceStats {
  employeeId: string;
  startDate: string;
  endDate: string;
  totalHoursWorked: number;
  totalScheduledHours: number;
  attendanceRate: number;
  totalClockRecords: number;
  averageHoursPerDay: number;
}
