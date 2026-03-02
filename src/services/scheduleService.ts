import { api } from "./api";
import type {
  GenerateScheduleRequest,
  Schedule,
  ScheduleInput,
} from "../types/scheduling";

export const scheduleService = {
  /**
   * Generate a schedule based on provided parameters
   */
  async generateSchedule(
    businessId: string,
    input: ScheduleInput,
    name?: string,
    generatedBy?: string
  ): Promise<Schedule> {
    const request: GenerateScheduleRequest = {
      input,
      name,
      generatedBy,
    };
    return api.post<Schedule, GenerateScheduleRequest>(
      `/businesses/${businessId}/schedules/generate`,
      request
    );
  },

  /**
   * Get all schedules with optional status filter
   */
  async getAllSchedules(businessId: string, status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<Schedule[]> {
    const queryParam = status ? `?status=${status}` : "";
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/businesses/${businessId}/schedules${queryParam}`);
    return response.schedules;
  },

  /**
   * Get a specific schedule by ID
   */
  async getScheduleById(businessId: string, id: string): Promise<Schedule> {
    return api.get<Schedule>(`/businesses/${businessId}/schedules/${id}`);
  },

  /**
   * Get schedule by date range (start and end date)
   */
  async getScheduleByDateRange(businessId: string, startDate: string, endDate: string): Promise<Schedule | null> {
    try {
      return await api.get<Schedule>(`/businesses/${businessId}/schedules/by-date-range?startDate=${startDate}&endDate=${endDate}`);
    } catch (error: any) {
      // Return null if no schedule found (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get the most recent published schedule
   */
  async getLatestSchedule(businessId: string): Promise<Schedule> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/businesses/${businessId}/schedules?status=PUBLISHED`);
    if (response.schedules.length === 0) {
      throw new Error("No published schedules found");
    }
    // Sort by publishedAt descending and return the most recent
    return response.schedules.sort((a, b) =>
      new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    )[0];
  },

  /**
   * Get published schedules (for history view)
   */
  async getPublishedSchedules(businessId: string): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/businesses/${businessId}/schedules?status=PUBLISHED`);
    return response.schedules;
  },

  /**
   * Get draft schedules
   */
  async getDraftSchedules(businessId: string): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/businesses/${businessId}/schedules?status=DRAFT`);
    return response.schedules;
  },

  /**
   * Get archived schedules
   */
  async getArchivedSchedules(businessId: string): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/businesses/${businessId}/schedules?status=ARCHIVED`);
    return response.schedules;
  },

  /**
   * Publish a schedule
   */
  async publishSchedule(businessId: string, scheduleId: string, publishedBy: string): Promise<Schedule> {
    return api.post<Schedule>(`/businesses/${businessId}/schedules/${scheduleId}/publish`, { publishedBy });
  },

  /**
   * Duplicate a schedule
   */
  async duplicateSchedule(
    businessId: string,
    scheduleId: string,
    name: string,
    createdBy: string
  ): Promise<Schedule> {
    return api.post<Schedule>(`/businesses/${businessId}/schedules/${scheduleId}/duplicate`, {
      name,
      createdBy,
    });
  },

  /**
   * Delete a schedule
   */
  async deleteSchedule(businessId: string, scheduleId: string): Promise<void> {
    return api.delete<void>(`/businesses/${businessId}/schedules/${scheduleId}`);
  },

  /**
   * Update schedule metadata (name, status, etc.)
   */
  async updateSchedule(businessId: string, scheduleId: string, updates: Partial<Pick<Schedule, 'name' | 'status'>>): Promise<Schedule> {
    return api.patch<Schedule>(`/businesses/${businessId}/schedules/${scheduleId}`, updates);
  },

  /**
   * Modify a shift (move to different employee/day/time)
   */
  async modifyShift(
    businessId: string,
    scheduleId: string,
    shiftId: string,
    employeeId?: string,
    dayOfWeek?: string,
    startTime?: string,
    endTime?: string,
    modifiedBy?: string
  ): Promise<{ shift: any; validation: { isValid: boolean; violations: any[] } }> {
    return api.patch(`/businesses/${businessId}/schedules/${scheduleId}/shifts/${shiftId}`, {
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
      modifiedBy: modifiedBy || "system",
    });
  },
};