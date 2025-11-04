import { api } from "./api";
import type { SchedulingResponse, GenerateScheduleRequest } from "../types/scheduling";

export interface ScheduleHistoryRecord {
  id: string;
  generatedAt: string;
  generatedBy: string;
  schedulingRequest: GenerateScheduleRequest;
  configuration: any; // SchedulingConfiguration from backend
  scheduleOutput: SchedulingResponse;
  notes?: string;
  version: number;
}

interface ScheduleHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  history: ScheduleHistoryRecord[];
}

export const scheduleHistoryService = {
  /**
   * Get all schedule history records (with pagination)
   */
  async getAllScheduleHistory(page: number = 0, limit: number = 50): Promise<ScheduleHistoryRecord[]> {
    const response = await api.get<ScheduleHistoryResponse>(`/schedule-history?offset=${page}&limit=${limit}`);
    return response.history;
  },

  /**
   * Get the most recent schedule generation
   */
  async getLatestSchedule(): Promise<ScheduleHistoryRecord> {
    return api.get<ScheduleHistoryRecord>("/schedule-history/latest");
  },

  /**
   * Get a specific schedule history record by ID
   */
  async getScheduleById(id: string): Promise<ScheduleHistoryRecord> {
    return api.get<ScheduleHistoryRecord>(`/schedule-history/${id}`);
  },

  /**
   * Delete a specific schedule history record
   */
  async deleteSchedule(id: string): Promise<void> {
    return api.delete(`/schedule-history/${id}`);
  },

  /**
   * Get schedule history by user
   */
  async getScheduleByUser(user: string): Promise<ScheduleHistoryRecord[]> {
    return api.get<ScheduleHistoryRecord[]>(`/schedule-history/by-user/${user}`);
  },
};
