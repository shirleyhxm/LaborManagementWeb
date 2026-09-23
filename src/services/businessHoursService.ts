import { api } from './api';
import type {
  BusinessHours,
  BusinessHourOverride,
  UpdateBusinessHoursRequest,
} from '../types/businessHours';

/**
 * Opening hours for a business.
 *
 * Every write returns the complete hours rather than just what changed, so a caller never
 * has to merge a partial response into its own copy.
 */
export const businessHoursService = {
  async getHours(businessId: string): Promise<BusinessHours> {
    return api.get<BusinessHours>(`/businesses/${businessId}/hours`);
  },

  /** Replace the weekly pattern. All seven days, saved as a unit. */
  async updateWeek(
    businessId: string,
    request: UpdateBusinessHoursRequest
  ): Promise<BusinessHours> {
    return api.put<BusinessHours, UpdateBusinessHoursRequest>(
      `/businesses/${businessId}/hours`,
      request
    );
  },

  /** Add or replace the exception for a date. */
  async saveOverride(
    businessId: string,
    override: BusinessHourOverride
  ): Promise<BusinessHours> {
    return api.post<BusinessHours, BusinessHourOverride>(
      `/businesses/${businessId}/hours/overrides`,
      override
    );
  },

  async deleteOverride(businessId: string, overrideId: string): Promise<BusinessHours> {
    return api.delete<BusinessHours>(
      `/businesses/${businessId}/hours/overrides/${overrideId}`
    );
  },
};
