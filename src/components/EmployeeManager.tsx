import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEmployees } from "../hooks/useEmployees";
import { Loader2, AlertCircle, RefreshCw, UserPlus, Edit, Trash2, X, Plus, Calendar, Mail, Copy, Check, Clock } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { employeeService } from "../services/employeeService";
import { attendanceService } from "../services/attendanceService";
import type { Employee, CreateEmployeeRequest } from "../types/employee";
import type { ClockRecord, AttendanceStats } from "../types/attendance";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { EmployeeGroupTags } from "./EmployeeGroupTags";
import { EmployeeGroupSelectorInline } from "./EmployeeGroupSelectorInline";
import { EmployeeLocationsTab } from "./EmployeeLocationsTab";
import { EmployeeLocationBadges } from "./EmployeeLocationBadges";
import { useEmployeeLocations } from "../hooks/useEmployeeLocations";
import { useBusiness } from "../contexts/BusinessContext";

// Constants for availability editor
const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Helper to convert backend availability to UI format (hours array per day)
const backendToUIAvailability = (backendAvailability: Employee['availability']): Record<string, number[]> => {
  const uiAvailability: Record<string, number[]> = {};

  // Initialize all days with empty arrays
  daysOfWeek.forEach(day => {
    uiAvailability[day] = [];
  });

  // Convert each availability range to hours
  backendAvailability.forEach(avail => {
    const startHour = parseInt(avail.startTime.split(':')[0]);
    const endHour = parseInt(avail.endTime.split(':')[0]);

    // Add all hours in the range (exclusive of end hour)
    for (let hour = startHour; hour < endHour; hour++) {
      if (avail.dayOfWeek && !uiAvailability[avail.dayOfWeek].includes(hour)) {
        uiAvailability[avail.dayOfWeek].push(hour);
      }
    }
  });

  // Sort hours for each day
  Object.keys(uiAvailability).forEach(day => {
    uiAvailability[day].sort((a, b) => a - b);
  });

  return uiAvailability;
};

// Helper to convert UI availability to backend format (time ranges)
const uiToBackendAvailability = (uiAvailability: Record<string, number[]>): Employee['availability'] => {
  const backendAvailability: Employee['availability'] = [];

  Object.entries(uiAvailability).forEach(([day, hours]) => {
    if (hours.length === 0) return;

    // Group consecutive hours into ranges
    const sortedHours = [...hours].sort((a, b) => a - b);
    let rangeStart = sortedHours[0];
    let rangeEnd = sortedHours[0] + 1;

    for (let i = 1; i <= sortedHours.length; i++) {
      const currentHour = sortedHours[i];

      if (currentHour === rangeEnd) {
        // Extend current range
        rangeEnd = currentHour + 1;
      } else {
        // Save current range and start new one
        backendAvailability.push({
          availabilityType: "WEEKLY_RECURRING" as const,
          dayOfWeek: day,
          startTime: `${String(rangeStart).padStart(2, '0')}:00`,
          endTime: `${String(rangeEnd).padStart(2, '0')}:00`,
        });

        if (i < sortedHours.length) {
          rangeStart = currentHour;
          rangeEnd = currentHour + 1;
        }
      }
    }
  });

  return backendAvailability;
};

export function EmployeeManager() {
  const { currentBusiness, businesses } = useBusiness();
  const { employees, loading, error, refetch } = useEmployees();
  const { locationsByEmployee, refetch: refetchLocations } = useEmployeeLocations(employees);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<ClockRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, number[]>>({});

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

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
    setAvailability(backendToUIAvailability(employee.availability));
    setFormError(null);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Locations save as they're toggled rather than on Save Changes, so the card
   * badges need refreshing on every path out of the edit dialog - Save, Cancel,
   * and dismissing it alike.
   */
  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) refetchLocations();
  };

  /**
   * An employee assigned in from another location: the record's own businessId
   * is their home, so anything not matching the location we're viewing is
   * borrowed.
   */
  const isBorrowed = (employee: Employee) =>
    !!currentBusiness && employee.businessId !== currentBusiness.id;

  const handleOpenInviteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setInviteEmail("");
    setInviteLink(null);
    setInviteError(null);
    setInviteLinkCopied(false);
    setIsInviteDialogOpen(true);
  };

  const handleOpenAttendanceDialog = (employee: Employee) => {
    if (!currentBusiness) return;
    setSelectedEmployee(employee);
    setIsAttendanceDialogOpen(true);
    setAttendanceRecords([]);
    setAttendanceStats(null);
    setAttendanceLoading(true);

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    Promise.all([
      attendanceService.getMyClockRecords(currentBusiness.id, employee.id),
      attendanceService.getAttendanceStats(currentBusiness.id, employee.id, weekStart, weekEnd),
    ])
      .then(([records, stats]) => {
        setAttendanceRecords(records);
        setAttendanceStats(stats);
      })
      .catch(err => console.error('Failed to load attendance:', err))
      .finally(() => setAttendanceLoading(false));
  };

  const handleSendInvite = async () => {
    if (!selectedEmployee || !currentBusiness) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const { inviteLink } = await employeeService.inviteEmployee(
        currentBusiness.id,
        selectedEmployee.id,
        inviteEmail
      );
      setInviteLink(inviteLink);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteLinkCopied(true);
  };

  const handleRevokeInvite = async () => {
    if (!selectedEmployee || !currentBusiness) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      await employeeService.revokeInvite(currentBusiness.id, selectedEmployee.id);
      setInviteLink(null);
      setInviteLinkCopied(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setIsInviting(false);
    }
  };

  const toggleHour = (day: string, hour: number) => {
    setAvailability(prev => {
      const dayHours = prev[day] || [];
      const isAvailable = dayHours.includes(hour);

      return {
        ...prev,
        [day]: isAvailable
          ? dayHours.filter(h => h !== hour)
          : [...dayHours, hour].sort((a, b) => a - b)
      };
    });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12am";
    if (hour === 12) return "12pm";
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
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
      const backendAvailability = uiToBackendAvailability(availability);
      await employeeService.updateEmployee(currentBusiness.id, selectedEmployee.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        dateOfBirth: formData.dateOfBirth,
        normalPayRate: parseFloat(formData.normalPayRate),
        overtimePayRate: parseFloat(formData.overtimePayRate),
        productivity: parseFloat(formData.productivity),
        groups: formData.groups,
        availability: backendAvailability,
      });
      handleEditDialogOpenChange(false);
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
                <EmployeeLocationBadges
                  employee={employee}
                  assignedBusinessIds={locationsByEmployee[employee.id]}
                />
                <EmployeeGroupTags employee={employee} onUpdate={refetch} />
              </div>
              <CardDescription>
                {isBorrowed(employee)
                  ? "Edits here also apply at their home location"
                  : `ID: ${employee.id}`}
              </CardDescription>
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
                    {employee.availability.length > 0 ? (
                      Array.from(new Set(employee.availability.map(avail => avail.dayOfWeek).filter(Boolean)))
                        .map((day, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {day.substring(0, 3)}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-xs text-neutral-400">No availability set</span>
                    )}
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
                    onClick={() => handleOpenAttendanceDialog(employee)}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Attendance
                  </Button>
                  {!employee.userId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenInviteDialog(employee)}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Invite
                    </Button>
                  )}
                  {/* Only the home location can delete someone, so the button
                      is hidden on a borrowed record rather than left to fail
                      with a 404. */}
                  {!isBorrowed(employee) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleOpenDeleteDialog(employee)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
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
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-4xl" style={{ maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DialogHeader style={{ flexShrink: 0 }}>
            <DialogTitle>Edit Employee - {selectedEmployee?.fullName}</DialogTitle>
            <DialogDescription>Update employee information and availability</DialogDescription>
          </DialogHeader>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs defaultValue="basic" className="w-full" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Locations only exist as a choice once the account has more
                  than one - otherwise the tab is a single disabled checkbox. */}
              <TabsList
                className={`grid w-full ${businesses.length > 1 ? "grid-cols-3" : "grid-cols-2"}`}
                style={{ flexShrink: 0 }}
              >
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
                {businesses.length > 1 && (
                  <TabsTrigger value="locations">Locations</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="basic" className="mt-4" style={{ flex: 1, overflow: 'auto' }}>
                <div className="grid gap-4">
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
              </TabsContent>

              <TabsContent value="availability" className="mt-4" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  <div style={{ minWidth: 'max-content' }}>
                    {/* Hour labels */}
                    <div className="flex gap-2 pb-2">
                      <div className="w-16 flex-shrink-0"></div>
                      <div className="flex gap-1">
                        {hours.map(hour => (
                          <div key={hour} className="w-10 text-center flex-shrink-0">
                            <span className="text-xs text-neutral-500">{formatHour(hour)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="w-16 flex-shrink-0"></div>
                    </div>

                    {/* Days with hour blocks */}
                    {daysOfWeek.map((day) => {
                      const dayHours = availability[day] || [];
                      const hasAvailability = dayHours.length > 0;

                      return (
                        <div key={day} className="flex gap-2 mb-2">
                          <div className="w-16 flex-shrink-0">
                            <span className="text-sm">{day.slice(0, 3)}</span>
                          </div>
                          <div className="flex gap-1">
                            {hours.map(hour => {
                              const isAvailable = dayHours.includes(hour);
                              return (
                                <button
                                  key={hour}
                                  onClick={() => toggleHour(day, hour)}
                                  className={`w-10 h-10 rounded text-xs transition-all border flex-shrink-0 ${
                                    isAvailable
                                      ? 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                                      : 'bg-neutral-100 border-neutral-200 text-neutral-400 hover:bg-neutral-200 hover:border-neutral-300'
                                  }`}
                                  title={`${day} ${formatHour(hour)}`}
                                  disabled={isSubmitting}
                                >
                                  {formatHour(hour).replace(/[apm]/g, '')}
                                </button>
                              );
                            })}
                          </div>
                          <div className="w-10 flex-shrink-0 text-right">
                            {hasAvailability && (
                              <span className="text-xs text-neutral-500">{dayHours.length}h</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Helper text */}
                <div className="pt-4 border-t border-neutral-200" style={{ flexShrink: 0 }}>
                  <p className="text-xs text-neutral-500">
                    Click individual hours to toggle availability. Green indicates available hours.
                  </p>
                </div>
              </TabsContent>

              {businesses.length > 1 && selectedEmployee && (
                <TabsContent value="locations" className="mt-4" style={{ flex: 1, overflow: 'auto' }}>
                  <EmployeeLocationsTab employee={selectedEmployee} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          <DialogFooter className="mt-4" style={{ flexShrink: 0 }}>
            <Button variant="outline" onClick={() => handleEditDialogOpenChange(false)} disabled={isSubmitting}>
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

      {/* Invite Employee Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite {selectedEmployee?.fullName}</DialogTitle>
            <DialogDescription>
              Send an invite link so they can create their own login and access the employee portal.
              Generating a new link cancels any invite already sent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {inviteError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">{inviteError}</AlertDescription>
              </Alert>
            )}

            {!inviteLink ? (
              <div>
                <Label htmlFor="inviteEmail">Email *</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="employee@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                  required
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="generatedInviteLink">Invite link</Label>
                <div className="flex gap-2">
                  <Input id="generatedInviteLink" value={inviteLink} readOnly />
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyInviteLink}>
                    {inviteLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Share this link with {selectedEmployee?.fullName} so they can set up their account.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              {inviteLink ? "Done" : "Cancel"}
            </Button>
            {inviteLink && (
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleRevokeInvite} disabled={isInviting}>
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Revoke Invite
              </Button>
            )}
            {!inviteLink && (
              <Button onClick={handleSendInvite} disabled={isInviting || !inviteEmail}>
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Generate Invite Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.fullName}'s Attendance</DialogTitle>
            <DialogDescription>Clock records and scheduled vs. actual hours, this week</DialogDescription>
          </DialogHeader>

          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceStats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Scheduled</p>
                    <p className="text-sm">{attendanceStats.totalScheduledHours.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Worked</p>
                    <p className="text-sm">{attendanceStats.totalHoursWorked.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Rate</p>
                    <p className="text-sm">{attendanceStats.attendanceRate.toFixed(0)}%</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-neutral-500 mb-2">Recent clock records</p>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-4">No clock records yet</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.map(record => (
                      <div key={record.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5">
                        <div>
                          <p className="text-sm text-neutral-900">
                            {new Date(record.clockInTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {new Date(record.clockInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            {" – "}
                            {record.clockOutTime
                              ? new Date(record.clockOutTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                              : "in progress"}
                          </p>
                        </div>
                        <Badge variant={record.isActive ? "default" : "outline"}>
                          {record.isActive ? "Active" : `${record.durationHours?.toFixed(1) ?? "0.0"}h`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
