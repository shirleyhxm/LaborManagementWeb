import { api } from "./api";
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../types/employee";

export const employeeService = {
  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<Employee[]> {
    return api.get<Employee[]>("/employees");
  },

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: string): Promise<Employee> {
    return api.get<Employee>(`/employees/${id}`);
  },

  /**
   * Create a new employee
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    return api.post<Employee, CreateEmployeeRequest>("/employees", data);
  },

  /**
   * Update an existing employee
   */
  async updateEmployee(
    id: string,
    data: UpdateEmployeeRequest
  ): Promise<Employee> {
    return api.put<Employee, UpdateEmployeeRequest>(`/employees/${id}`, data);
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(id: string): Promise<void> {
    return api.delete<void>(`/employees/${id}`);
  },
};