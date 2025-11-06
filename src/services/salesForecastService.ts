import { api } from "./api";

export interface SalesForecast {
  id: string;
  weeklyForecast: Record<string, Record<string, number>>; // DayOfWeek -> Time -> Sales
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface UpdateSalesForecastRequest {
  weeklyForecast: Record<string, Record<string, number>>;
  updatedBy?: string;
}

export const salesForecastService = {
  /**
   * Get current sales forecast
   */
  async get(): Promise<SalesForecast> {
    return api.get<SalesForecast>("/sales-forecast");
  },

  /**
   * Update sales forecast
   */
  async update(request: UpdateSalesForecastRequest): Promise<SalesForecast> {
    return api.put<SalesForecast>("/sales-forecast", request);
  },

  /**
   * Reset sales forecast to default values
   */
  async reset(): Promise<SalesForecast> {
    return api.post<SalesForecast>("/sales-forecast/reset");
  },
};