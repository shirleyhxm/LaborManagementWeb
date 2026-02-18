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
      "/schedules/generate",
      request
    );
  },

  /**
   * Get all schedules with optional status filter
   */
  async getAllSchedules(status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<Schedule[]> {
    const queryParam = status ? `?status=${status}` : "";
    const response = await api.get<{ schedules: Schedule[]; total: number }>(`/schedules${queryParam}`);
    return response.schedules;
  },

  /**
   * Get a specific schedule by ID
   */
  async getScheduleById(id: string): Promise<Schedule> {
    return api.get<Schedule>(`/schedules/${id}`);
  },

  /**
   * Get schedule by date range (start and end date)
   */
  async getScheduleByDateRange(startDate: string, endDate: string): Promise<Schedule | null> {
    try {
      return await api.get<Schedule>(`/schedules/by-date-range?startDate=${startDate}&endDate=${endDate}`);
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
  async getLatestSchedule(): Promise<Schedule> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>("/schedules?status=PUBLISHED");
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
  async getPublishedSchedules(): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>("/schedules?status=PUBLISHED");
    return response.schedules;
  },

  /**
   * Get draft schedules
   */
  async getDraftSchedules(): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>("/schedules?status=DRAFT");
    return response.schedules;
  },

  /**
   * Get archived schedules
   */
  async getArchivedSchedules(): Promise<Schedule[]> {
    const response = await api.get<{ schedules: Schedule[]; total: number }>("/schedules?status=ARCHIVED");
    return response.schedules;
  },

  /**
   * Publish a schedule
   */
  async publishSchedule(scheduleId: string, publishedBy: string): Promise<Schedule> {
    return api.post<Schedule>(`/schedules/${scheduleId}/publish`, { publishedBy });
  },

  /**
   * Duplicate a schedule
   */
  async duplicateSchedule(
    scheduleId: string,
    name: string,
    createdBy: string
  ): Promise<Schedule> {
    return api.post<Schedule>(`/schedules/${scheduleId}/duplicate`, {
      name,
      createdBy,
    });
  },

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    return api.delete<void>(`/schedules/${scheduleId}`);
  },

  /**
   * Update schedule metadata (name, status, etc.)
   */
  async updateSchedule(scheduleId: string, updates: Partial<Pick<Schedule, 'name' | 'status'>>): Promise<Schedule> {
    return api.patch<Schedule>(`/schedules/${scheduleId}`, updates);
  },

  /**
   * Modify a shift (move to different employee/day/time)
   */
  async modifyShift(
    scheduleId: string,
    shiftId: string,
    employeeId?: string,
    dayOfWeek?: string,
    startTime?: string,
    endTime?: string,
    modifiedBy?: string
  ): Promise<{ shift: any; validation: { isValid: boolean; violations: any[] } }> {
    return api.patch(`/schedules/${scheduleId}/shifts/${shiftId}`, {
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
      modifiedBy: modifiedBy || "system",
    });
  },
};