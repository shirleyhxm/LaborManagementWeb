import { api } from "./api";
import type {
  EmployeeGroup,
  CreateEmployeeGroupRequest,
  RenameEmployeeGroupRequest,
} from "../types/employeeGroup";

export const employeeGroupService = {
  /**
   * Get all employee groups for a business
   */
  async getAllGroups(businessId: string): Promise<EmployeeGroup[]> {
    return api.get<EmployeeGroup[]>(`/businesses/${businessId}/employee-groups`);
  },

  /**
   * Get employee group by name
   */
  async getGroupByName(businessId: string, name: string): Promise<EmployeeGroup> {
    return api.get<EmployeeGroup>(`/businesses/${businessId}/employee-groups/${encodeURIComponent(name)}`);
  },

  /**
   * Create a new employee group
   */
  async createGroup(businessId: string, data: CreateEmployeeGroupRequest): Promise<EmployeeGroup> {
    return api.post<EmployeeGroup, CreateEmployeeGroupRequest>(
      `/businesses/${businessId}/employee-groups`,
      data
    );
  },

  /**
   * Rename an existing employee group
   */
  async renameGroup(
    businessId: string,
    oldName: string,
    data: RenameEmployeeGroupRequest
  ): Promise<EmployeeGroup> {
    return api.put<EmployeeGroup, RenameEmployeeGroupRequest>(
      `/businesses/${businessId}/employee-groups/${encodeURIComponent(oldName)}`,
      data
    );
  },

  /**
   * Delete an employee group
   */
  async deleteGroup(businessId: string, name: string): Promise<void> {
    return api.delete<void>(`/businesses/${businessId}/employee-groups/${encodeURIComponent(name)}`);
  },
};