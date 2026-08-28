/**
 * A business an employee is currently lent to.
 */
export interface EmployeeShare {
  employeeId: string;
  businessId: string;
  businessName: string;
  sharedAt: string;
}

export interface EmployeeSharesList {
  employeeId: string;
  homeBusinessId: string;
  sharedWith: EmployeeShare[];
}

export interface ShareEmployeeRequest {
  businessId: string;
}
