import { api } from "./api";

export interface SalesForecast {
  id: string;
  // Date-specific forecasts (specific calendar dates)
  dateSpecificForecast?: Record<string, Record<string, number>>; // ISO date -> Time -> Sales
  // Weekly pattern forecasts (recurring by day of week)
  weeklyPattern?: Record<string, Record<string, number>>; // DayOfWeek -> Time -> Sales
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface UpdateSalesForecastRequest {
  // Optional: date-specific forecasts
  dateSpecificForecast?: Record<string, Record<string, number>>;
  // Optional: weekly pattern forecasts
  weeklyPattern?: Record<string, Record<string, number>>;
  updatedBy?: string;
}

export const salesForecastService = {
  /**
   * Get current sales forecast for a business
   */
  async get(businessId: string): Promise<SalesForecast> {
    return api.get<SalesForecast>(`/businesses/${businessId}/sales-forecast`);
  },

  /**
   * Update sales forecast
   */
  async update(businessId: string, request: UpdateSalesForecastRequest): Promise<SalesForecast> {
    return api.put<SalesForecast>(`/businesses/${businessId}/sales-forecast`, request);
  },

  /**
   * Reset sales forecast to default values
   */
  async reset(businessId: string): Promise<SalesForecast> {
    return api.post<SalesForecast>(`/businesses/${businessId}/sales-forecast/reset`);
  },
};