import { api } from "./api";
import type { SwapRequest, SwapRequestsListResponse, TeamShift } from "../types/swap";

export const swapService = {
  /**
   * Get every employee's shifts within a date range - the team-wide view
   * needed to see who else is working. payRate is only present for the
   * caller's own shifts; every other row has it redacted to null.
   */
  async getTeamShifts(
    businessId: string,
    startDate: string,
    endDate: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED" = "PUBLISHED"
  ): Promise<TeamShift[]> {
    const params = new URLSearchParams({ startDate, endDate, status });
    return api.get<TeamShift[]>(`/businesses/${businessId}/schedules/team-shifts?${params.toString()}`);
  },

  async getMySwapRequests(businessId: string): Promise<SwapRequestsListResponse> {
    return api.get<SwapRequestsListResponse>(`/businesses/${businessId}/swap-requests`);
  },

  async createSwapRequest(businessId: string, targetShiftId: string, message?: string): Promise<SwapRequest> {
    return api.post<SwapRequest>(`/businesses/${businessId}/swap-requests`, { targetShiftId, message });
  },

  async acceptSwapRequest(businessId: string, id: string): Promise<void> {
    return api.post<void>(`/businesses/${businessId}/swap-requests/${id}/accept`, {});
  },

  async declineSwapRequest(businessId: string, id: string): Promise<void> {
    return api.post<void>(`/businesses/${businessId}/swap-requests/${id}/decline`, {});
  },

  async cancelSwapRequest(businessId: string, id: string): Promise<void> {
    return api.post<void>(`/businesses/${businessId}/swap-requests/${id}/cancel`, {});
  },

  async getAllSwapRequests(businessId: string): Promise<SwapRequest[]> {
    return api.get<SwapRequest[]>(`/businesses/${businessId}/swap-requests/all`);
  },

  async approveSwapRequest(businessId: string, id: string): Promise<void> {
    return api.post<void>(`/businesses/${businessId}/swap-requests/${id}/approve`, {});
  },

  async denySwapRequest(businessId: string, id: string): Promise<void> {
    return api.post<void>(`/businesses/${businessId}/swap-requests/${id}/deny`, {});
  },
};
