import { api } from "./api";
import type { ClockRecord, AttendanceStats } from "../types/attendance";

export const attendanceService = {
  async clockIn(
    businessId: string,
    employeeId: string,
    scheduleId?: string,
    shiftId?: string,
    notes?: string
  ): Promise<ClockRecord> {
    return api.post<ClockRecord>(`/businesses/${businessId}/attendance/clock-in`, {
      employeeId,
      scheduleId,
      shiftId,
      notes: notes || "",
    });
  },

  async clockOut(businessId: string, employeeId: string, notes?: string): Promise<ClockRecord> {
    return api.post<ClockRecord>(`/businesses/${businessId}/attendance/clock-out`, {
      employeeId,
      notes: notes || "",
    });
  },

  async getActiveClockRecord(businessId: string, employeeId: string): Promise<ClockRecord | null> {
    try {
      return await api.get<ClockRecord>(`/businesses/${businessId}/attendance/active/${employeeId}`);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getMyClockRecords(businessId: string, employeeId: string): Promise<ClockRecord[]> {
    return api.get<ClockRecord[]>(`/businesses/${businessId}/attendance/employee/${employeeId}`);
  },

  async getAttendanceStats(
    businessId: string,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceStats> {
    return api.get<AttendanceStats>(
      `/businesses/${businessId}/attendance/stats/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    );
  },
};
