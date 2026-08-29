/**
 * A location an employee is assigned to work at, beyond their home location.
 */
export interface EmployeeLocation {
  employeeId: string;
  businessId: string;
  businessName: string;
  assignedAt: string;
}

export interface EmployeeLocationsList {
  employeeId: string;
  homeBusinessId: string;
  assignedTo: EmployeeLocation[];
}

export interface AssignEmployeeLocationRequest {
  businessId: string;
}
