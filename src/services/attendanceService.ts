import { api } from "./api";
import type {
  ClockRecord,
  AttendanceStats,
  ClockInRequest,
  ClockOutRequest,
  ActiveClockStatus,
} from "../types/attendance";

export const attendanceService = {
  /**
   * Clock in an employee
   */
  async clockIn(data: ClockInRequest): Promise<ClockRecord> {
    return api.post<ClockRecord, ClockInRequest>("/attendance/clock-in", data);
  },

  /**
   * Clock out an employee
   */
  async clockOut(data: ClockOutRequest): Promise<ClockRecord> {
    return api.post<ClockRecord, ClockOutRequest>("/attendance/clock-out", data);
  },

  /**
   * Check if employee is currently clocked in
   */
  async getActiveStatus(employeeId: string): Promise<ActiveClockStatus> {
    return api.get<ActiveClockStatus>(`/attendance/active/${employeeId}`);
  },

  /**
   * Get all clock records for an employee
   */
  async getEmployeeRecords(employeeId: string): Promise<ClockRecord[]> {
    return api.get<ClockRecord[]>(`/attendance/employee/${employeeId}`);
  },

  /**
   * Get attendance for a specific shift
   */
  async getShiftRecords(shiftId: string): Promise<ClockRecord[]> {
    return api.get<ClockRecord[]>(`/attendance/shift/${shiftId}`);
  },

  /**
   * Get attendance for a schedule
   */
  async getScheduleRecords(scheduleId: string): Promise<ClockRecord[]> {
    return api.get<ClockRecord[]>(`/attendance/schedule/${scheduleId}`);
  },

  /**
   * Get attendance statistics for an employee
   */
  async getStats(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStats> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<AttendanceStats>(`/attendance/stats/${employeeId}${query}`);
  },

  /**
   * Delete a clock record (admin only)
   */
  async deleteRecord(id: string): Promise<void> {
    return api.delete<void>(`/attendance/${id}`);
  },
};
