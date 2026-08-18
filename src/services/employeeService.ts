import { api, ApiError } from "./api";
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../types/employee";
import type { CreateInviteResponse } from "../types/invite";

export const employeeService = {
  /**
   * Get all employees for a business
   */
  async getAllEmployees(businessId: string): Promise<Employee[]> {
    return api.get<Employee[]>(`/businesses/${businessId}/employees`);
  },

  /**
   * Get employee by ID
   */
  async getEmployeeById(businessId: string, id: string): Promise<Employee> {
    return api.get<Employee>(`/businesses/${businessId}/employees/${id}`);
  },

  /**
   * Create a new employee
   */
  async createEmployee(businessId: string, data: CreateEmployeeRequest): Promise<Employee> {
    return api.post<Employee, CreateEmployeeRequest>(`/businesses/${businessId}/employees`, data);
  },

  /**
   * Update an existing employee
   */
  async updateEmployee(
    businessId: string,
    id: string,
    data: UpdateEmployeeRequest
  ): Promise<Employee> {
    return api.put<Employee, UpdateEmployeeRequest>(`/businesses/${businessId}/employees/${id}`, data);
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(businessId: string, id: string): Promise<void> {
    return api.delete<void>(`/businesses/${businessId}/employees/${id}`);
  },

  /**
   * Invite an employee to create a login account linked to this record.
   * Re-inviting supersedes (revokes) any existing pending invite.
   */
  async inviteEmployee(businessId: string, employeeId: string, email: string): Promise<CreateInviteResponse> {
    return api.post<CreateInviteResponse>(`/businesses/${businessId}/employees/${employeeId}/invite`, { email });
  },

  /**
   * Revoke a pending invite for an employee, so the link they were sent stops working.
   */
  async revokeInvite(businessId: string, employeeId: string): Promise<void> {
    return api.delete<void>(`/businesses/${businessId}/employees/${employeeId}/invite`);
  },

  /**
   * Get the employee record linked to the currently logged-in user.
   * Returns null if the caller has no linked employee record.
   */
  async getMyEmployee(): Promise<Employee | null> {
    try {
      return await api.get<Employee>(`/employees/me`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  },
};