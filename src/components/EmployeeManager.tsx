import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useEmployees } from "../hooks/useEmployees";
import { Loader2, AlertCircle, RefreshCw, UserPlus, Edit, Trash2, X, Plus } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { employeeService } from "../services/employeeService";
import type { Employee, CreateEmployeeRequest } from "../types/employee";
import { EmployeeGroupTags } from "./EmployeeGroupTags";
import { EmployeeGroupSelectorInline } from "./EmployeeGroupSelectorInline";
import { useBusiness } from "../contexts/BusinessContext";

export function EmployeeManager() {
  const { currentBusiness } = useBusiness();
  const { employees, loading, error, refetch } = useEmployees();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    normalPayRate: "",
    overtimePayRate: "",
    productivity: "",
    groups: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      normalPayRate: "",
      overtimePayRate: "",
      productivity: "",
      groups: [],
    });
    setFormError(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      dateOfBirth: employee.dateOfBirth,
      normalPayRate: employee.normalPayRate.toString(),
      overtimePayRate: employee.overtimePayRate.toString(),
      productivity: employee.productivity.toString(),
      groups: employee.groups || [],
    });
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateEmployee = async () => {
    if (!currentBusiness) {
      setFormError("No business selected");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newEmployee: CreateEmployeeRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || "",
        dateOfBirth: formData.dateOfBirth,
        normalPayRate: parseFloat(formData.normalPayRate),
        overtimePayRate: parseFloat(formData.overtimePayRate),
        productivity: parseFloat(formData.productivity) || 1.0,
        contract: {
          contractedHoursPerWeek: 40.0,
          maxHoursPerWeek: 60.0,
          maxHoursPerDay: 12.0,
          overtimeThreshold: 40.0,
          requiresBreak: true,
          breakDurationMinutes: 30,
          shiftLengthThresholdHours: 4,
        },
        availability: [],
        groups: formData.groups,
      };

      await employeeService.createEmployee(currentBusiness.id, newEmployee);
      setIsCreateDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !currentBusiness) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await employeeService.updateEmployee(currentBusiness.id, selectedEmployee.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        dateOfBirth: formData.dateOfBirth,
        normalPayRate: parseFloat(formData.normalPayRate),
        overtimePayRate: parseFloat(formData.overtimePayRate),
        productivity: parseFloat(formData.productivity),
        groups: formData.groups,
      });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee || !currentBusiness) return;

    setIsSubmitting(true);

    try {
      await employeeService.deleteEmployee(currentBusiness.id, selectedEmployee.id);
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-neutral-600">Loading employees...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <p className="text-red-900">Failed to load employees</p>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={refetch}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-neutral-900">Employee Management</h2>
          <p className="text-neutral-500">
            {employees.length} employees in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleOpenCreateDialog}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employee List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{employee.fullName}</CardTitle>
                <EmployeeGroupTags employee={employee} onUpdate={refetch} />
              </div>
              <CardDescription>ID: {employee.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Pay Rate:</span>
                  <span>${employee.normalPayRate}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Productivity:</span>
                  <span>${employee.productivity.toFixed(0)}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Contracted Hours:</span>
                  <span>{employee.contract.contractedHoursPerWeek}h/week</span>
                </div>
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">Availability:</p>
                  <div className="flex flex-wrap gap-1">
                    {employee.availability.map((avail, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs"
                      >
                        {avail.dayOfWeek.substring(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenEditDialog(employee)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleOpenDeleteDialog(employee)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-neutral-500">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No employees found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenCreateDialog}>
                Add your first employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Enter the employee's information below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth * (DD/MM/YYYY)</Label>
              <Input
                id="dateOfBirth"
                placeholder="15/03/1995"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="normalPayRate">Pay Rate ($/hr) *</Label>
                <Input
                  id="normalPayRate"
                  type="number"
                  step="0.01"
                  value={formData.normalPayRate}
                  onChange={(e) => setFormData({ ...formData, normalPayRate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="overtimePayRate">Overtime Rate ($/hr) *</Label>
                <Input
                  id="overtimePayRate"
                  type="number"
                  step="0.01"
                  value={formData.overtimePayRate}
                  onChange={(e) => setFormData({ ...formData, overtimePayRate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="productivity">Productivity ($/hr)</Label>
              <Input
                id="productivity"
                type="number"
                step="0.01"
                placeholder="150.0"
                value={formData.productivity}
                onChange={(e) => setFormData({ ...formData, productivity: e.target.value })}
              />
            </div>
            <EmployeeGroupSelectorInline
              selectedGroups={formData.groups}
              onChange={(groups) => setFormData({ ...formData, groups })}
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update the employee's information below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-middleName">Middle Name</Label>
              <Input
                id="edit-middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-dateOfBirth">Date of Birth (DD/MM/YYYY)</Label>
              <Input
                id="edit-dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-normalPayRate">Pay Rate ($/hr)</Label>
              <Input
                  id="edit-normalPayRate"
                  type="number"
                  step="0.01"
                  value={formData.normalPayRate}
                  onChange={(e) => setFormData({ ...formData, normalPayRate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-overtimePayRate">Overtime Rate ($/hr)</Label>
                <Input
                  id="edit-overtimePayRate"
                  type="number"
                  step="0.01"
                  value={formData.overtimePayRate}
                  onChange={(e) => setFormData({ ...formData, overtimePayRate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-productivity">Productivity ($/hr)</Label>
              <Input
                id="edit-productivity"
                type="number"
                step="0.01"
                value={formData.productivity}
                onChange={(e) => setFormData({ ...formData, productivity: e.target.value })}
              />
            </div>
            <EmployeeGroupSelectorInline
              selectedGroups={formData.groups}
              onChange={(groups) => setFormData({ ...formData, groups })}
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedEmployee?.fullName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <Alert className="border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">{formError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
