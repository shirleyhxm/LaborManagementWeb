import { api } from "./api";
import type {
  EmployeeShift,
  GenerateScheduleRequest,
  Schedule,
  ScheduleInput,
  Shift,
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
   * Get one employee's shifts within a date range (inclusive), optionally
   * restricted to a schedule status. Unlike getScheduleByDateRange, this
   * does a real overlap query across all schedules and returns just the
   * matching shifts - built for "my shifts this week" style views where
   * the caller doesn't care how the underlying schedules were chunked.
   */
  async getEmployeeShifts(
    businessId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  ): Promise<Shift[]> {
    const params = new URLSearchParams({ employeeId, startDate, endDate });
    if (status) params.set("status", status);
    return api.get<Shift[]>(`/businesses/${businessId}/schedules/shifts?${params.toString()}`);
  },

  /**
   * The caller's own shifts across every location they work at, each carrying
   * the location it belongs to.
   *
   * Someone assigned to several locations has one calendar spanning all of
   * them, so showing only the current location's shifts would hide half their
   * week. Server-side this is restricted to the caller's own record.
   */
  async getMyShiftsAcrossLocations(
    businessId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  ): Promise<EmployeeShift[]> {
    const params = new URLSearchParams({
      employeeId,
      startDate,
      endDate,
      allLocations: "true",
    });
    if (status) params.set("status", status);
    return api.get<EmployeeShift[]>(
      `/businesses/${businessId}/schedules/shifts?${params.toString()}`
    );
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
   *
   * The returned shift is the row the moved block now *starts with*, which is not
   * necessarily the row that was sent: re-deriving overtime can split a block that
   * crosses the threshold into two rows, collapse one that no longer crosses back
   * into one, or merge the moved shift into a contiguous neighbour — and a merged
   * block keeps the earliest row's id.
   *
   * Reversing an edit does not use this id (see `undoLastChange`): a merge destroys
   * the boundary an inverse move would need, so the server restores a recorded
   * snapshot of the previous shifts instead.
   *
   * A rejected move never reaches here: the endpoint answers 422 with the
   * violations, which surfaces as an ApiError.
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
  ): Promise<{ success: boolean; shift: Shift }> {
    return api.patch(`/businesses/${businessId}/schedules/${scheduleId}/shifts/${shiftId}`, {
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
      modifiedBy: modifiedBy || "system",
    });
  },

  /**
   * Remove a shift from a draft schedule.
   *
   * Like a move, this is recorded as an undoable edit, so a mistaken delete can be
   * reversed with `undoLastChange` — which is what makes deleting safe to offer
   * without a confirmation step.
   *
   * Unlike a move, this is never refused for constraint violations: removing hours
   * can leave a day understaffed, but that's a state the manager is entitled to
   * create and see flagged, not one to block.
   */
  async deleteShift(
    businessId: string,
    scheduleId: string,
    shiftId: string,
    modifiedBy?: string
  ): Promise<void> {
    return api.delete<void>(
      `/businesses/${businessId}/schedules/${scheduleId}/shifts/${shiftId}`,
      { modifiedBy: modifiedBy || "system" }
    );
  },

  /**
   * Whether the last edit to this schedule can still be undone.
   *
   * Server-side state, so it survives a page reload and stays correct when the
   * schedule is edited from another tab — neither of which a client-held record of
   * the last move could manage.
   */
  async canUndo(businessId: string, scheduleId: string): Promise<boolean> {
    const response = await api.get<{ canUndo: boolean }>(
      `/businesses/${businessId}/schedules/${scheduleId}/undo`
    );
    return response.canUndo;
  },

  /**
   * Restore the schedule's shifts to their state before the last edit.
   *
   * `restored: false` means there was nothing left to undo — an ordinary outcome
   * (the undo was already spent, or the schedule hasn't been edited), not an error.
   *
   * `violations` are those the restored schedule carries. The restore is never
   * refused for them: rules can be tightened between the edit and the undo, and
   * blocking would strand the user in the state they asked to leave.
   */
  async undoLastChange(
    businessId: string,
    scheduleId: string,
    modifiedBy?: string
  ): Promise<{ restored: boolean; schedule: Schedule; violations: unknown[] }> {
    return api.post(`/businesses/${businessId}/schedules/${scheduleId}/undo`, {
      modifiedBy: modifiedBy || "system",
    });
  },
};