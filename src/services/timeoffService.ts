import { api } from "./api";
import type { TimeoffRequest } from "../types/timeoff";

export const timeoffService = {
  async getMyTimeoffRequests(businessId: string, employeeId: string): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>(`/businesses/${businessId}/timeoff/employee/${employeeId}`);
  },

  async submitTimeoffRequest(
    businessId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    reason: string
  ): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest>(`/businesses/${businessId}/timeoff`, {
      employeeId,
      startDate,
      endDate,
      reason,
    });
  },

  async cancelTimeoffRequest(businessId: string, id: string, employeeId: string): Promise<TimeoffRequest> {
    return api.delete<TimeoffRequest>(`/businesses/${businessId}/timeoff/${id}/cancel`, { employeeId });
  },

  async getPendingTimeoffRequests(businessId: string): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>(`/businesses/${businessId}/timeoff/pending`);
  },

  async getAllTimeoffRequests(businessId: string): Promise<TimeoffRequest[]> {
    return api.get<TimeoffRequest[]>(`/businesses/${businessId}/timeoff`);
  },

  async approveTimeoffRequest(businessId: string, id: string, reviewNotes?: string): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest>(`/businesses/${businessId}/timeoff/${id}/approve`, { reviewNotes: reviewNotes || "" });
  },

  async denyTimeoffRequest(businessId: string, id: string, reviewNotes?: string): Promise<TimeoffRequest> {
    return api.post<TimeoffRequest>(`/businesses/${businessId}/timeoff/${id}/deny`, { reviewNotes: reviewNotes || "" });
  },
};
