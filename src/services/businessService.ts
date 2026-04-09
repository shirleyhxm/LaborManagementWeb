import { api } from './api';
import type { Business, CreateBusinessRequest, UpdateBusinessRequest } from '../types/business';

export const businessService = {
  /**
   * Get all businesses for the current user
   */
  async getMyBusinesses(): Promise<Business[]> {
    return api.get<Business[]>('/businesses');
  },

  /**
   * Get a specific business by ID
   */
  async getBusiness(businessId: string): Promise<Business> {
    return api.get<Business>(`/businesses/${businessId}`);
  },

  /**
   * Create a new business
   */
  async createBusiness(request: CreateBusinessRequest): Promise<Business> {
    return api.post<Business>('/businesses', request);
  },

  /**
   * Update an existing business
   */
  async updateBusiness(businessId: string, request: UpdateBusinessRequest): Promise<Business> {
    return api.put<Business>(`/businesses/${businessId}`, request);
  },

  /**
   * Delete a business
   */
  async deleteBusiness(businessId: string): Promise<void> {
    return api.delete(`/businesses/${businessId}`);
  },
};
