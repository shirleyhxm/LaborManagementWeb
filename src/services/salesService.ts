import { api } from "./api";
import type {
  SalesRecord,
  CreateSalesRequest,
  SalesPerformanceMetrics,
  DailySalesSummary,
} from "../types/sales";

export const salesService = {
  /**
   * Record a new sale
   */
  async createSale(data: CreateSalesRequest): Promise<SalesRecord> {
    return api.post<SalesRecord, CreateSalesRequest>("/sales", data);
  },

  /**
   * Get all sales for an employee
   */
  async getEmployeeSales(employeeId: string): Promise<SalesRecord[]> {
    return api.get<SalesRecord[]>(`/sales/employee/${employeeId}`);
  },

  /**
   * Get sales for a specific shift
   */
  async getShiftSales(shiftId: string): Promise<SalesRecord[]> {
    return api.get<SalesRecord[]>(`/sales/shift/${shiftId}`);
  },

  /**
   * Get sales for a schedule
   */
  async getScheduleSales(scheduleId: string): Promise<SalesRecord[]> {
    return api.get<SalesRecord[]>(`/sales/schedule/${scheduleId}`);
  },

  /**
   * Get performance metrics for an employee
   */
  async getPerformanceMetrics(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesPerformanceMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<SalesPerformanceMetrics>(
      `/sales/performance/${employeeId}${query}`
    );
  },

  /**
   * Get daily sales summary with top performers
   */
  async getDailySummary(date?: string): Promise<DailySalesSummary> {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<DailySalesSummary>(`/sales/summary/daily${query}`);
  },

  /**
   * Delete a sales record (admin only)
   */
  async deleteSale(id: string): Promise<void> {
    return api.delete<void>(`/sales/${id}`);
  },
};
