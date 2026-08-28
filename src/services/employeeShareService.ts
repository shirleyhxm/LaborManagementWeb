import { api } from './api';
import type {
  EmployeeShare,
  EmployeeSharesList,
  ShareEmployeeRequest,
} from '../types/employeeShare';

/**
 * Lending employees between businesses of one account.
 *
 * All of these are owner-only on the backend, and the businessId in the path
 * must be the employee's *home* business — a business that has merely borrowed
 * someone cannot lend them on.
 */
export const employeeShareService = {
  /**
   * Which businesses this employee is currently lent to.
   */
  async getShares(businessId: string, employeeId: string): Promise<EmployeeSharesList> {
    return api.get<EmployeeSharesList>(
      `/businesses/${businessId}/employees/${employeeId}/shares`
    );
  },

  async share(
    businessId: string,
    employeeId: string,
    targetBusinessId: string
  ): Promise<EmployeeShare> {
    return api.post<EmployeeShare, ShareEmployeeRequest>(
      `/businesses/${businessId}/employees/${employeeId}/shares`,
      { businessId: targetBusinessId }
    );
  },

  async unshare(
    businessId: string,
    employeeId: string,
    targetBusinessId: string
  ): Promise<void> {
    return api.delete<void>(
      `/businesses/${businessId}/employees/${employeeId}/shares/${targetBusinessId}`
    );
  },
};
