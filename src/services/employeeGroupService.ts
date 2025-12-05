import { api } from "./api";
import type {
  EmployeeGroup,
  CreateEmployeeGroupRequest,
  RenameEmployeeGroupRequest,
} from "../types/employeeGroup";

export const employeeGroupService = {
  /**
   * Get all employee groups
   */
  async getAllGroups(): Promise<EmployeeGroup[]> {
    return api.get<EmployeeGroup[]>("/employee-groups");
  },

  /**
   * Get employee group by name
   */
  async getGroupByName(name: string): Promise<EmployeeGroup> {
    return api.get<EmployeeGroup>(`/employee-groups/${encodeURIComponent(name)}`);
  },

  /**
   * Create a new employee group
   */
  async createGroup(data: CreateEmployeeGroupRequest): Promise<EmployeeGroup> {
    return api.post<EmployeeGroup, CreateEmployeeGroupRequest>(
      "/employee-groups",
      data
    );
  },

  /**
   * Rename an existing employee group
   */
  async renameGroup(
    oldName: string,
    data: RenameEmployeeGroupRequest
  ): Promise<EmployeeGroup> {
    return api.put<EmployeeGroup, RenameEmployeeGroupRequest>(
      `/employee-groups/${encodeURIComponent(oldName)}`,
      data
    );
  },

  /**
   * Delete an employee group
   */
  async deleteGroup(name: string): Promise<void> {
    return api.delete<void>(`/employee-groups/${encodeURIComponent(name)}`);
  },
};