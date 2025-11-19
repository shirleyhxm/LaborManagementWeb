import { api } from "./api";
import type {
  TimeoffRequest,
  CreateTimeoffRequest,
  ReviewTimeoffRequest,
} from "../types/timeoff";

export const timeoffService = {
  /**
   * Submit a new timeoff request
   */
  async createRequest(data: CreateTimeoffRequest): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest, CreateTimeoffRequest>("/timeoff", data);
  },

  /**
   * Cancel a pending or approved request
   */
  async cancelRequest(id: string): Promise<TimeoffRequest> {
    return api.delete<TimeoffRequest>(`/timeoff/${id}/cancel`);
  },

  /**
   * Approve a request (manager/admin only)
   */
  async approveRequest(
    id: string,
    data: ReviewTimeoffRequest
  ): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest, ReviewTimeoffRequest>(
      `/timeoff/${id}/approve`,
      data
    );
  },

  /**
   * Deny a request (manager/admin only)
   */
  async denyRequest(
    id: string,
    data: ReviewTimeoffRequest
  ): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest, ReviewTimeoffRequest>(
      `/timeoff/${id}/deny`,
      data
    );
  },

  /**
   * Get all requests for an employee
   */
  async getEmployeeRequests(employeeId: string): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>(`/timeoff/employee/${employeeId}`);
  },

  /**
   * Get all pending requests (for managers)
   */
  async getPendingRequests(): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>("/timeoff/pending");
  },

  /**
   * Get all timeoff requests (admin only)
   */
  async getAllRequests(): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>("/timeoff");
  },

  /**
   * Get a specific timeoff request
   */
  async getRequestById(id: string): Promise<TimeoffRequest> {
    return api.get<TimeoffRequest>(`/timeoff/${id}`);
  },
};
