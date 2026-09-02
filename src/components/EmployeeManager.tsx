import { useState } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEmployees } from "../hooks/useEmployees";
import { Loader2, AlertCircle, RefreshCw, UserPlus, Edit, Trash2, X, Plus, Calendar, Mail, Copy, Check, Clock, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { employeeService } from "../services/employeeService";
import { employeeLocationService } from "../services/employeeLocationService";
import { attendanceService } from "../services/attendanceService";
import { scheduleService } from "../services/scheduleService";
import type { Employee, CreateEmployeeRequest } from "../types/employee";
import type { ClockRecord } from "../types/attendance";
import type { Shift } from "../types/scheduling";
import { startOfWeek, endOfWeek, format, addWeeks, isWithinInterval, endOfDay } from "date-fns";
import {
  AttendanceComparisonChart,
  buildAttendanceDays,
  type AttendanceDay,
} from "./AttendanceComparisonChart";
import { EmployeeGroupTags } from "./EmployeeGroupTags";
import { EmployeeGroupSelectorInline } from "./EmployeeGroupSelectorInline";
import { EmployeeLocationsTab } from "./EmployeeLocationsTab";
import { EmployeeContracts } from "./EmployeeContracts";
import { EmployeeLocationBadges } from "./EmployeeLocationBadges";
import { useEmployeeLocations } from "../hooks/useEmployeeLocations";
import { useBusiness } from "../contexts/BusinessContext";
import {
  daysOfWeek,
  backendToUIAvailability,
  uiToBackendAvailability,
} from "../utils/availability";

// Constants for availability editor
const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

export function EmployeeManager() {
  const { currentBusiness, businesses } = useBusiness();
  const { employees, loading, error, refetch } = useEmployees();
  const { locationsByEmployee, refetch: refetchLocations } = useEmployeeLocations(employees);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isContractsDialogOpen, setIsContractsDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<ClockRecord[]>([]);
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceWeekStart, setAttendanceWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, number[]>>({});

  // Pending location assignments for the edit dialog. Held against what was
  // loaded so saving only sends the actual adds and removals, and Cancel can
  // simply drop them.
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [initialLocationIds, setInitialLocationIds] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

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
    contractedHoursPerWeek: "",
    maxHoursPerWeek: "",
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
      contractedHoursPerWeek: "",
      maxHoursPerWeek: "",
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
      contractedHoursPerWeek: employee.contract.contractedHoursPerWeek.toString(),
      maxHoursPerWeek: employee.contract.maxHoursPerWeek.toString(),
      groups: employee.groups || [],
    });
    setAvailability(backendToUIAvailability(employee.availability));
    setFormError(null);
    setIsEditDialogOpen(true);
    loadEmployeeLocations(employee);
  };

  /**
   * Pull the employee's current locations so the tab opens showing where they
   * actually work. Only their home business can read assignments, so this is
   * skipped for a record borrowed from elsewhere.
   */
  const loadEmployeeLocations = async (employee: Employee) => {
    if (businesses.length < 2) return;
    if (currentBusiness && employee.businessId !== currentBusiness.id) {
      setSelectedLocationIds([]);
      return;
    }

    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const result = await employeeLocationService.getLocations(employee.businessId, employee.id);
      const ids = (result.assignedTo ?? []).map((s) => s.businessId);
      setSelectedLocationIds(ids);
      setInitialLocationIds(ids);
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : "Failed to load locations");
      setSelectedLocationIds([]);
      setInitialLocationIds([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleOpenContractsDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsContractsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Closing discards any pending location edits, the same as every other field
   * in the dialog. The card badges still refresh, since a save may have changed
   * them.
   */
  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedLocationIds([]);
      setInitialLocationIds([]);
      setLocationsError(null);
      refetchLocations();
    }
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

  /**
   * Load one employee's attendance for the week containing `weekStartDate`.
   *
   * Takes the week explicitly so the dialog's week selector can reload without
   * reopening, and so the request always matches the week on screen.
   */
  const loadAttendance = (employee: Employee, weekStartDate: Date) => {
    if (!currentBusiness) return;
    setAttendanceRecords([]);
    setAttendanceDays([]);
    setAttendanceLoading(true);

    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekStart = format(weekStartDate, 'yyyy-MM-dd');
    const weekEnd = format(weekEndDate, 'yyyy-MM-dd');

    Promise.all([
      attendanceService.getMyClockRecords(currentBusiness.id, employee.id),
      // The planned side of the comparison. Published only - draft shifts were
      // never shown to the employee, so holding them to those hours would be
      // measuring against a schedule they never saw.
      scheduleService
        .getEmployeeShifts(currentBusiness.id, employee.id, weekStart, weekEnd, 'PUBLISHED')
        .catch((): Shift[] => []),
    ])
      .then(([records, shifts]) => {
        // The endpoint returns every location this employee works at, and every
        // record ever - the manager portal is scoped to one business, and the
        // dialog to one week, so filter on both. Without the date bound the
        // records list would keep showing other weeks' records while the chart
        // above it sat empty.
        const ownRecords = records.filter(
          r =>
            r.businessId === currentBusiness.id &&
            isWithinInterval(new Date(r.clockInTime), {
              start: weekStartDate,
              end: endOfDay(weekEndDate),
            })
        );
        setAttendanceRecords(ownRecords);
        setAttendanceDays(
          buildAttendanceDays(shifts, ownRecords, weekStartDate, weekEndDate, currentBusiness.id)
        );
      })
      .catch(err => console.error('Failed to load attendance:', err))
      .finally(() => setAttendanceLoading(false));
  };

  const handleOpenAttendanceDialog = (employee: Employee) => {
    if (!currentBusiness) return;
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    setSelectedEmployee(employee);
    setAttendanceWeekStart(thisWeek);
    setIsAttendanceDialogOpen(true);
    loadAttendance(employee, thisWeek);
  };

  /** Step the attendance dialog a week at a time, reloading for the new range. */
  const handleAttendanceWeekShift = (deltaWeeks: number) => {
    if (!selectedEmployee) return;
    const next = addWeeks(attendanceWeekStart, deltaWeeks);
    setAttendanceWeekStart(next);
    loadAttendance(selectedEmployee, next);
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

  /**
   * Check the two contract hour fields against each other, returning a message
   * to show or null when they are fine. A weekly maximum below the contracted
   * hours cannot be met by any schedule, so it is rejected here rather than
   * saved and left to surface later as an unexplained empty grid.
   *
   * `allowBlank` is for the create form, where an empty field means "use the
   * default" rather than a missing answer. The edit form always has both
   * loaded, so a blank there is someone clearing a value.
   */
  const validateContractHours = (allowBlank = false): string | null => {
    const contractedRaw = formData.contractedHoursPerWeek.trim();
    const maxRaw = formData.maxHoursPerWeek.trim();

    if (allowBlank && contractedRaw === "" && maxRaw === "") return null;

    // Blank on create falls back to the same default the request will send, so
    // the two are still compared against each other rather than skipped.
    const contracted = contractedRaw === "" && allowBlank ? 40 : parseFloat(contractedRaw);
    const max = maxRaw === "" && allowBlank ? 60 : parseFloat(maxRaw);

    if (!Number.isFinite(contracted) || contracted < 0) {
      return "Contracted hours must be a number of hours, and cannot be negative.";
    }
    if (!Number.isFinite(max) || max < 0) {
      return "Max hours must be a number of hours, and cannot be negative.";
    }
    // A week is the hard ceiling for both - anything above it is a typo.
    if (contracted > 168 || max > 168) {
      return "Hours per week cannot be more than 168.";
    }
    if (max < contracted) {
      return "Max hours per week cannot be less than contracted hours per week.";
    }
    return null;
  };

  const handleCreateEmployee = async () => {
    if (!currentBusiness) {
      setFormError("No business selected");
      return;
    }

    const hoursError = validateContractHours(true);
    if (hoursError) {
      setFormError(hoursError);
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
          contractedHoursPerWeek: parseFloat(formData.contractedHoursPerWeek) || 40.0,
          maxHoursPerWeek: parseFloat(formData.maxHoursPerWeek) || 60.0,
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

    // Checked before anything is sent: locations save on their own request
    // below, so bad hours have to stop the save here rather than after part
    // of it has already gone through.
    const hoursError = validateContractHours();
    if (hoursError) {
      setFormError(hoursError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Locations and the employee record are separate endpoints, so this can
    // only be sequential, not atomic. Locations go first: if one fails, the
    // employee PUT is skipped entirely, leaving the record untouched and the
    // dialog open with its edits intact to retry.
    try {
      await applyLocationChanges(selectedEmployee);
    } catch (err) {
      setFormError(
        `${err instanceof Error ? err.message : "Failed to update locations"} — no other changes were saved.`
      );
      setIsSubmitting(false);
      return;
    }

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
        // The backend swaps the whole contract for whatever is sent, so the
        // fields this form does not show are carried over from the loaded
        // record rather than left to fall back to defaults.
        contract: {
          ...selectedEmployee.contract,
          contractedHoursPerWeek: parseFloat(formData.contractedHoursPerWeek),
          maxHoursPerWeek: parseFloat(formData.maxHoursPerWeek),
        },
        // Groups are deliberately not sent. They are edited from the card's
        // "+ Group" chip, which saves on its own and can be used while this
        // dialog is open - sending the snapshot taken when it opened would
        // undo whatever the chip had just stored.
        availability: backendAvailability,
      });
      handleEditDialogOpenChange(false);
      setSelectedEmployee(null);
      resetForm();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update employee";
      // Locations already applied, so say so rather than implying nothing saved.
      setFormError(
        hasLocationChanges()
          ? `${message} — location changes were saved, but the other details were not.`
          : message
      );
      // Keep the tab in step with what is now stored.
      setInitialLocationIds(selectedLocationIds);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLocationChanges = () => {
    const before = [...initialLocationIds].sort().join(',');
    const after = [...selectedLocationIds].sort().join(',');
    return before !== after;
  };

  /**
   * Send only the locations that actually changed. Assignments are always
   * managed from the employee's home business.
   */
  const applyLocationChanges = async (employee: Employee) => {
    if (!hasLocationChanges()) return;

    const added = selectedLocationIds.filter((id) => !initialLocationIds.includes(id));
    const removed = initialLocationIds.filter((id) => !selectedLocationIds.includes(id));

    for (const businessId of added) {
      await employeeLocationService.assign(employee.businessId, employee.id, businessId);
    }
    for (const businessId of removed) {
      await employeeLocationService.unassign(employee.businessId, employee.id, businessId);
    }

    setInitialLocationIds(selectedLocationIds);
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
          // gap-3 over the Card default gap-6, matching the denser spacing the
          // Schedule screens use for repeated rows.
          <Card key={employee.id} className="gap-3">
            <CardHeader className="px-4 pt-4 gap-1">
              {/* Name and the group tags applied to this person. Where they
                  work is a fact about the record, not a label, so it sits with
                  the other record details below rather than competing here. */}
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{employee.fullName}</CardTitle>
                <EmployeeGroupTags employee={employee} onUpdate={refetch} />
              </div>
              {/* ID and location each get their own line, so the body starts at
                  the same height whether or not the location text is long
                  enough to wrap. Spaced like the body rows below. */}
              <CardDescription className="space-y-1 text-sm">
                <div className="truncate">ID: {employee.id}</div>
                {/* The line is reserved for every card once the account has
                    more than one location, since the badge renders nothing for
                    someone based here and assigned nowhere else - without it
                    those cards would sit a line short of their neighbours. */}
                {businesses.length > 1 && (
                  <div className="flex items-center min-h-5">
                    <EmployeeLocationBadges
                      employee={employee}
                      assignedBusinessIds={locationsByEmployee[employee.id]}
                    />
                  </div>
                )}
              </CardDescription>

              {/* Editing and removing this record sit together, away from the
                  actions at the foot of the card that open other views. */}
              <CardAction className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Edit ${employee.fullName}`}
                  title="Edit"
                  onClick={() => handleOpenEditDialog(employee)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {/* Only the home location can delete someone, so the button is
                    hidden on a record assigned in from elsewhere rather than
                    left to fail with a 404. */}
                {!isBorrowed(employee) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label={`Remove ${employee.fullName}`}
                    title="Remove"
                    onClick={() => handleOpenDeleteDialog(employee)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardAction>
            </CardHeader>
            {/* CardContent is the last child, so it carries the card's bottom
                padding - pb-4 rather than the default pb-6, since the button
                row above already has its own spacing. */}
            <CardContent className="px-4 [&:last-child]:pb-4">
              <div className="space-y-1">
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
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Max Hours:</span>
                  <span>{employee.contract.maxHoursPerWeek}h/week</span>
                </div>
                {/* Label and days share one line and one type style - the days
                    are plain values here, not status tags. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 border-t border-neutral-100 text-sm">
                  <span className="text-neutral-500">Availability:</span>
                  {employee.availability.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {Array.from(
                        new Set(
                          employee.availability
                            .map((avail) => avail.dayOfWeek)
                            .filter(Boolean)
                        )
                      ).map((day, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-neutral-200 px-2 py-0.5"
                        >
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-neutral-400">No availability set</span>
                  )}
                </div>
                {/* Actions that open another view, kept apart from edit and
                    remove in the header. Equal width so they read as a set,
                    but sized to their content rather than stretched across the
                    card - they wrap to a second line rather than shrinking. */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-32"
                    onClick={() => handleOpenAttendanceDialog(employee)}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Attendance
                  </Button>
                  {/* Contracts are held by the home location, so a record
                      borrowed from elsewhere gets no button - there is nothing
                      it could usefully show or change. */}
                  {!isBorrowed(employee) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-32"
                      onClick={() => handleOpenContractsDialog(employee)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Contracts
                    </Button>
                  )}
                  {!employee.userId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-32"
                      onClick={() => handleOpenInviteDialog(employee)}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Invite
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
            {/* Optional here - left blank, each falls back to the default shown
                as its placeholder, so adding someone stays a short form. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="contractedHoursPerWeek">Contracted Hours (per week)</Label>
                <Input
                  id="contractedHoursPerWeek"
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  placeholder="40"
                  value={formData.contractedHoursPerWeek}
                  onChange={(e) =>
                    setFormData({ ...formData, contractedHoursPerWeek: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxHoursPerWeek">Max Hours (per week)</Label>
                <Input
                  id="maxHoursPerWeek"
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  placeholder="60"
                  value={formData.maxHoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: e.target.value })}
                />
              </div>
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

          {/* Editing someone assigned in from another location changes the one
              shared record, so it lands at their home location too. Warned here
              rather than on the roster card, since it only matters once you are
              actually editing. Sits outside the tabs so it shows whichever one
              is open. */}
          {selectedEmployee && isBorrowed(selectedEmployee) && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-700" style={{ flexShrink: 0 }}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedEmployee.firstName} is based at{' '}
                {businesses.find(b => b.id === selectedEmployee.businessId)?.name ??
                  'their home location'}
                . Changes here apply everywhere they work.
              </AlertDescription>
            </Alert>
          )}

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
                {/* The two hours the scheduler treats as this person's target
                    and their hard ceiling. Contracted hours are shown on the
                    roster card, so this is where that number is changed. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-contractedHoursPerWeek">Contracted Hours (per week)</Label>
                    <Input
                      id="edit-contractedHoursPerWeek"
                      type="number"
                      step="0.5"
                      min="0"
                      max="168"
                      value={formData.contractedHoursPerWeek}
                      onChange={(e) =>
                        setFormData({ ...formData, contractedHoursPerWeek: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-maxHoursPerWeek">Max Hours (per week)</Label>
                    <Input
                      id="edit-maxHoursPerWeek"
                      type="number"
                      step="0.5"
                      min="0"
                      max="168"
                      value={formData.maxHoursPerWeek}
                      onChange={(e) =>
                        setFormData({ ...formData, maxHoursPerWeek: e.target.value })
                      }
                    />
                  </div>
                </div>
                {/* No group selector here: the "+ Group" chip on the roster
                    card is the single entry point for group membership. */}
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
                  <EmployeeLocationsTab
                    employee={selectedEmployee}
                    selectedBusinessIds={selectedLocationIds}
                    onChange={setSelectedLocationIds}
                    isLoading={locationsLoading}
                    loadError={locationsError}
                  />
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

      {/* Contracts Dialog - its own view rather than a tab in the edit dialog,
          since uploading and deleting take effect immediately and have nothing
          to do with that dialog's Save. */}
      <Dialog open={isContractsDialogOpen} onOpenChange={setIsContractsDialogOpen}>
        {/* The body already opens by saying what these documents are and who
            else can see them, so the header carries no description of its own -
            aria-describedby points at that text instead of repeating it.

            Tighter than the dialog default (gap-4 p-6), matching the Attendance
            dialog: this is a short list, and the stock padding gave it more
            empty space than content. No footer either - every action lives on
            a row of the list, so a Close button would only repeat the ✕. */}
        <DialogContent
          className="max-w-xl max-h-[85vh] overflow-y-auto gap-3 p-4"
          aria-describedby="contracts-dialog-intro"
        >
          <DialogHeader className="gap-1">
            <DialogTitle>{selectedEmployee?.fullName}'s Contracts</DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <EmployeeContracts
              employee={selectedEmployee}
              isBorrowed={isBorrowed(selectedEmployee)}
              introId="contracts-dialog-intro"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        {/* Tighter than the dialog default (gap-4 p-6): this card is a dense
            read - three stat tiles, a seven-row chart and a record list - so the
            stock padding pushed the list below the fold for no benefit. */}
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto gap-2.5 p-4">
          <DialogHeader className="gap-1">
            <DialogTitle>{selectedEmployee?.fullName}'s Attendance</DialogTitle>
            {/* Week selector sits where the description used to, and wears the
                same text style so the header keeps its original rhythm. */}
            <DialogDescription asChild>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAttendanceWeekShift(-1)}
                  aria-label="Previous week"
                  className="rounded p-0.5 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="tabular-nums">
                  {format(attendanceWeekStart, 'MMM d')} –{' '}
                  {format(endOfWeek(attendanceWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                </span>
                <button
                  type="button"
                  onClick={() => handleAttendanceWeekShift(1)}
                  aria-label="Next week"
                  className="rounded p-0.5 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </DialogDescription>
          </DialogHeader>

          {attendanceLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Totalled from the same per-day rows the chart draws, rather
                  than from the stats endpoint: that endpoint counts hours across
                  every location the employee works at, which would contradict
                  this business-scoped view. */}
              {attendanceDays.length > 0 && (() => {
                const scheduled = attendanceDays.reduce((s, d) => s + d.plannedHours, 0);
                const worked = attendanceDays.reduce((s, d) => s + d.actualHours, 0);
                const rate = scheduled > 0 ? (worked / scheduled) * 100 : 0;
                return (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-neutral-200 px-2.5 py-1.5">
                      <p className="text-xs text-neutral-500">Scheduled</p>
                      <p className="text-sm">{scheduled.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 px-2.5 py-1.5">
                      <p className="text-xs text-neutral-500">Worked</p>
                      <p className="text-sm">{worked.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 px-2.5 py-1.5">
                      <p className="text-xs text-neutral-500">Rate</p>
                      <p className="text-sm">{rate.toFixed(0)}%</p>
                    </div>
                  </div>
                );
              })()}

              <AttendanceComparisonChart days={attendanceDays} />

              <div>
                <p className="text-xs text-neutral-500 mb-1.5">Clock records</p>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-2">
                    No clock records this week
                  </p>
                ) : (
                  // One line per record: date and times side by side rather than
                  // stacked, so the list stays short enough to sit under the
                  // chart without dominating the dialog.
                  <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-200">
                    {attendanceRecords.map(record => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-3 px-2.5 py-1.5"
                      >
                        <p className="text-sm text-neutral-900 whitespace-nowrap">
                          {new Date(record.clockInTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-neutral-500 flex-1 text-right whitespace-nowrap">
                          {new Date(record.clockInTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          {" – "}
                          {record.clockOutTime
                            ? new Date(record.clockOutTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                            : "in progress"}
                        </p>
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
