import { api } from './api';
import type {
  EmployeeLocation,
  EmployeeLocationsList,
  AssignEmployeeLocationRequest,
} from '../types/employeeLocation';

/**
 * Assigning employees to locations within one account.
 *
 * All of these are owner-only on the backend, and the businessId in the path
 * must be the employee's *home* location — a location that has merely been
 * assigned someone cannot assign them onward.
 */
export const employeeLocationService = {
  /**
   * Which locations this employee is currently assigned to.
   */
  async getLocations(businessId: string, employeeId: string): Promise<EmployeeLocationsList> {
    return api.get<EmployeeLocationsList>(
      `/businesses/${businessId}/employees/${employeeId}/locations`
    );
  },

  async assign(
    businessId: string,
    employeeId: string,
    targetBusinessId: string
  ): Promise<EmployeeLocation> {
    return api.post<EmployeeLocation, AssignEmployeeLocationRequest>(
      `/businesses/${businessId}/employees/${employeeId}/locations`,
      { businessId: targetBusinessId }
    );
  },

  async unassign(
    businessId: string,
    employeeId: string,
    targetBusinessId: string
  ): Promise<void> {
    return api.delete<void>(
      `/businesses/${businessId}/employees/${employeeId}/locations/${targetBusinessId}`
    );
  },
};
