import { api } from "./api";
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../types/employee";

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
};