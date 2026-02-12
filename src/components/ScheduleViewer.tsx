import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Clock, Users, DollarSign, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Calendar, List, TrendingUp, Download, ChevronLeft } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import type {Schedule, ConstraintViolation, Shift, TimeBlockViolation} from "../types/scheduling";
import {
  isScheduleLevelViolation,
  isTimeBlockViolation,
  isEmployeeViolation,
  isEmployeeDayViolation,
  isShiftViolation
} from "../types/scheduling";
import type { Employee } from "../types/employee";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface SalesForecastData {
  totalProjectedSales: number;
  dailyProjectedSales: Record<string, number>;
}

interface ScheduleViewerProps {
  schedule: Schedule;
  employees: Employee[];
  salesForecastData?: SalesForecastData;
  onScheduleUpdate?: () => Promise<void>;
}

export function ScheduleViewer({ schedule, employees, salesForecastData, onScheduleUpdate }: ScheduleViewerProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'schedule' | 'list'>('schedule');
  const [draggedShift, setDraggedShift] = useState<{shift: Shift; fromEmployeeId: string; fromDay: string} | null>(null);
  const [dropTarget, setDropTarget] = useState<{employeeId: string; day: string} | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Helper to parse ISO date string as local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate total number of weeks in the schedule
  const totalWeeks = useMemo(() => {
    if (!schedule.schedulePeriod?.startDate || !schedule.schedulePeriod?.endDate) {
      return 1;
    }
    // Parse as local dates to avoid UTC timezone issues
    const startDate = parseLocalDate(schedule.schedulePeriod.startDate);
    const endDate = parseLocalDate(schedule.schedulePeriod.endDate);

    // Find the Monday of the week containing startDate
    const dayOfWeek = startDate.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const firstMonday = new Date(startDate);
    firstMonday.setDate(startDate.getDate() - daysFromMonday);

    // Calculate the number of days from first Monday to end date
    const daysDiff = Math.ceil((endDate.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate number of weeks needed to display all dates through end date
    return Math.ceil(daysDiff / 7);
  }, [schedule.schedulePeriod]);

  // Reset week index when schedule changes
  useEffect(() => {
    setCurrentWeekIndex(0);
  }, [schedule.id]);

  // Calculate display dates based on current week index
  const displayDates = useMemo(() => {
    if (!schedule.schedulePeriod?.startDate) {
      // Fallback to current week if no schedule period
      const today = new Date();
      // Find the Monday of the current week
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);

      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return date;
      });
    }

    // Parse as local date to avoid timezone issues
    const startDate = parseLocalDate(schedule.schedulePeriod.startDate);
    const endDate = parseLocalDate(schedule.schedulePeriod.endDate);

    // Find the Monday of the week containing startDate
    const dayOfWeek = startDate.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
    const firstMonday = new Date(startDate);
    firstMonday.setDate(startDate.getDate() - daysFromMonday);

    // Calculate the Monday for the current week being viewed
    const currentMonday = new Date(firstMonday);
    currentMonday.setDate(firstMonday.getDate() + (currentWeekIndex * 7));

    // Generate 7 days (Mon-Sun) for this week
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentMonday);
      date.setDate(currentMonday.getDate() + i);
      return date;
    });
  }, [schedule.schedulePeriod, currentWeekIndex]);

  // Helper function to compute dayOfWeek from ISO date string
  const getDayOfWeekFromDate = (dateStr: string): string => {
    // Parse as local date to avoid UTC timezone issues
    const date = parseLocalDate(dateStr);
    const dayIndex = date.getDay();
    // Convert Sunday (0) to index 6, Monday (1) to 0, etc.
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return dayOfWeekMap[adjustedIndex];
  };

  // Helper function to check if a date is within the schedule range
  const isDateInScheduleRange = (date: Date): boolean => {
    if (!schedule.schedulePeriod?.startDate || !schedule.schedulePeriod?.endDate) {
      return true; // If no range specified, show all dates
    }
    const startDate = parseLocalDate(schedule.schedulePeriod.startDate);
    const endDate = parseLocalDate(schedule.schedulePeriod.endDate);
    return date >= startDate && date <= endDate;
  };

  // Pre-process schedule data for efficient rendering
  const scheduleData = useMemo(() => {
    // Create a set of dates for the current week for efficient filtering
    const currentWeekDates = new Set(displayDates.map(date => date.toISOString().split('T')[0]));

    // Filter shifts to only include those in the current week
    const shiftsInCurrentWeek = schedule.shifts.filter(shift => {
      return currentWeekDates.has(shift.date);
    });

    // Create a map of employee ID -> day -> shifts array (supporting multiple shifts per day)
    const shiftsByEmployeeAndDay: Record<string, Record<string, Shift[]>> = {};

    shiftsInCurrentWeek.forEach(shift => {
      // Compute dayOfWeek from date if not present
      const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);

      if (!shiftsByEmployeeAndDay[shift.employeeId]) {
        shiftsByEmployeeAndDay[shift.employeeId] = {};
      }
      if (!shiftsByEmployeeAndDay[shift.employeeId][dayOfWeek]) {
        shiftsByEmployeeAndDay[shift.employeeId][dayOfWeek] = [];
      }
      // Enrich shift with computed dayOfWeek
      shiftsByEmployeeAndDay[shift.employeeId][dayOfWeek].push({ ...shift, dayOfWeek });
    });

    // Calculate daily labor costs (only for current week)
    const dailyLaborCosts: Record<string, number> = {};
    dayOfWeekMap.forEach(day => {
      dailyLaborCosts[day] = 0;
    });

    shiftsInCurrentWeek.forEach(shift => {
      const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);
      dailyLaborCosts[dayOfWeek] += shift.laborCost;
    });

    // Calculate daily estimated sales from employee productivity × hours (only for current week)
    const dailyEstimatedSales: Record<string, number> = {};
    dayOfWeekMap.forEach(day => {
      dailyEstimatedSales[day] = 0;
    });

    // Sum up (employee productivity × shift hours) for each day
    shiftsInCurrentWeek.forEach(shift => {
      const employee = employees.find(emp => emp.id === shift.employeeId);
      if (employee) {
        const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);
        const estimatedSales = employee.productivity * shift.durationHours;
        dailyEstimatedSales[dayOfWeek] += estimatedSales;
      }
    });

    // Separate scheduled and unscheduled employees
    const scheduledEmployeeIds = new Set(Object.keys(shiftsByEmployeeAndDay));
    const scheduledEmployees = employees.filter(emp => scheduledEmployeeIds.has(emp.id));
    const unscheduledEmployees = employees.filter(emp => !scheduledEmployeeIds.has(emp.id));

    // Process violations with new granular structure
    const violationsByEmployee = new Set<string>();
    const violationsByEmployeeDay = new Map<string, Set<string>>();  // employeeId -> Set<dayOfWeek>
    const violationsByShift = new Map<string, ConstraintViolation[]>();  // "employeeId:day:time" -> violations
    const violationDetailsMap: Record<string, ConstraintViolation[]> = {};
    const scheduleLevelViolations: ConstraintViolation[] = [];
    const timeBlockViolations: TimeBlockViolation[] = [];

    schedule.violations?.forEach(violation => {
      if (isScheduleLevelViolation(violation)) {
        // Schedule-level violations (e.g., budget exceeded)
        scheduleLevelViolations.push(violation);
      } else if (isTimeBlockViolation(violation)) {
        // Time block violations (e.g., understaffing at specific time)
        timeBlockViolations.push(violation);
      } else if (isEmployeeViolation(violation)) {
        // Employee-level violations (e.g., weekly hours exceeded)
        violationsByEmployee.add(violation.employeeId);
        if (!violationDetailsMap[violation.employeeId]) {
          violationDetailsMap[violation.employeeId] = [];
        }
        violationDetailsMap[violation.employeeId].push(violation);
      } else if (isEmployeeDayViolation(violation)) {
        // Employee + Day violations (e.g., daily hours exceeded)
        violationsByEmployee.add(violation.employeeId);
        if (!violationsByEmployeeDay.has(violation.employeeId)) {
          violationsByEmployeeDay.set(violation.employeeId, new Set());
        }
        const dayOfWeek = getDayOfWeekFromDate(violation.date);
        violationsByEmployeeDay.get(violation.employeeId)!.add(dayOfWeek);
        if (!violationDetailsMap[violation.employeeId]) {
          violationDetailsMap[violation.employeeId] = [];
        }
        violationDetailsMap[violation.employeeId].push(violation);
      } else if (isShiftViolation(violation)) {
        // Shift-level violations (e.g., availability conflict)
        violationsByEmployee.add(violation.employeeId);
        const dayOfWeek = getDayOfWeekFromDate(violation.date);
        const shiftKey = `${violation.employeeId}:${dayOfWeek}:${violation.startTime}`;
        if (!violationsByShift.has(shiftKey)) {
          violationsByShift.set(shiftKey, []);
        }
        violationsByShift.get(shiftKey)!.push(violation);
        if (!violationDetailsMap[violation.employeeId]) {
          violationDetailsMap[violation.employeeId] = [];
        }
        violationDetailsMap[violation.employeeId].push(violation);
      }
    });

    // Create Set of understaffed days for O(1) lookup
    const understaffedDays = new Set(
      schedule.staffingRequirements
        ?.filter(req => req.isUnderstaffed)
        .map(req => getDayOfWeekFromDate(req.date)) || []
    );

    return {
      shiftsByEmployeeAndDay,
      scheduledEmployees,
      unscheduledEmployees,
      violationsByEmployee,
      violationsByEmployeeDay,
      violationsByShift,
      violationDetailsMap,
      scheduleLevelViolations,
      timeBlockViolations,
      understaffedDays,
      dailyLaborCosts,
      dailyEstimatedSales
    };
  }, [schedule, employees, displayDates]);

  const totalViolations = schedule.violations?.length || 0;
  const employeeViolationCount = scheduleData.violationsByEmployee.size;

  // Check if a shift would conflict with existing shifts
  const wouldConflict = (newEmployeeId: string, day: string, shift: Shift): boolean => {
    const existingShifts = scheduleData.shiftsByEmployeeAndDay[newEmployeeId]?.[day] || [];
    return existingShifts.some(existing => {
      if (existing.id === shift.id) return false; // Same shift
      return shift.startTime < existing.endTime && shift.endTime > existing.startTime;
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, shift: Shift, employeeId: string, day: string) => {
    // Only allow dragging for draft schedules
    if (schedule.status !== 'DRAFT') {
      e.preventDefault();
      return;
    }

    setDraggedShift({ shift, fromEmployeeId: employeeId, fromDay: day });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, employeeId: string, day: string) => {
    if (!draggedShift) return;

    e.preventDefault();

    // Only allow dropping on the same day
    if (day !== draggedShift.fromDay) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    // Check if this would cause a conflict
    const conflict = wouldConflict(employeeId, day, draggedShift.shift);
    e.dataTransfer.dropEffect = conflict ? 'none' : 'move';

    setDropTarget({ employeeId, day });
    setIsDraggingOver(!conflict);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent, newEmployeeId: string, day: string) => {
    e.preventDefault();

    if (!draggedShift) return;

    // Only allow dropping on the same day
    if (day !== draggedShift.fromDay) {
      setDraggedShift(null);
      setDropTarget(null);
      setIsDraggingOver(false);
      return;
    }

    // Check for conflicts
    if (wouldConflict(newEmployeeId, day, draggedShift.shift)) {
      setDraggedShift(null);
      setDropTarget(null);
      setIsDraggingOver(false);
      return;
    }

    // Don't do anything if dropping on the same employee
    if (newEmployeeId === draggedShift.fromEmployeeId) {
      setDraggedShift(null);
      setDropTarget(null);
      setIsDraggingOver(false);
      return;
    }

    try {
      // Call backend API to modify shift
      const { scheduleService } = await import('../services/scheduleService');
      await scheduleService.modifyShift(
        schedule.id,
        draggedShift.shift.id,
        newEmployeeId,
        undefined, // dayOfWeek stays the same
        undefined, // startTime stays the same
        undefined, // endTime stays the same
        'User'
      );

      // Reload the schedule to get updated data
      if (onScheduleUpdate) {
        await onScheduleUpdate();
      }
    } catch (error: any) {
      console.error('Failed to modify shift:', error);

      // Extract validation errors from backend response
      let errorMessage = 'Failed to move shift. Please try again.';

      // Check if it's an ApiError with data property
      if (error.data) {
        const errorData = error.data;

        // Check for validation error response (422 Unprocessable Entity)
        if (errorData.validation?.violations && Array.isArray(errorData.validation?.violations)) {
          const violationMessages = errorData.validation.violations
            .map((v: any) => v.description)
            .join('\n• ');
          errorMessage = `Cannot move shift:\n• ${violationMessages}`;
        }
        // Check for simple error message
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Check for general message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      // Fallback to error message if available
      else if (error.message && error.message !== 'Failed to move shift. Please try again.') {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setDraggedShift(null);
      setDropTarget(null);
      setIsDraggingOver(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDropTarget(null);
    setIsDraggingOver(false);
  };

  // Export shifts to CSV
  const handleExportCSV = () => {
    // Sort shifts by day, then by employee, then by start time
    const sortedShifts = [...schedule.shifts].sort((a, b) => {
      const dayOfWeekA = a.dayOfWeek || getDayOfWeekFromDate(a.date);
      const dayOfWeekB = b.dayOfWeek || getDayOfWeekFromDate(b.date);
      const dayOrder = dayOfWeekMap.indexOf(dayOfWeekA) - dayOfWeekMap.indexOf(dayOfWeekB);
      if (dayOrder !== 0) return dayOrder;
      if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
      return a.startTime.localeCompare(b.startTime);
    });

    // Create CSV headers
    const headers = ['Employee', 'Date', 'Day', 'Start Time', 'End Time', 'Duration (Hours)', 'Shift Type', 'Labor Cost'];

    // Create CSV rows
    const rows = sortedShifts.map(shift => {
      const employee = employees.find(e => e.id === shift.employeeId);
      const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);
      return [
        employee?.fullName || 'Unknown',
        shift.date,
        dayOfWeek.charAt(0) + dayOfWeek.slice(1).toLowerCase(),
        shift.startTime,
        shift.endTime,
        shift.durationHours.toFixed(1),
        shift.isOvertime ? 'OVERTIME' : 'REGULAR',
        shift.laborCost.toFixed(2)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_${schedule.name || schedule.id}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Labor Cost */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Labor Cost</p>
              <p className="text-2xl font-bold text-neutral-900">
                ${schedule.metrics.totalLaborCost.toFixed(0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Total Hours */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Hours</p>
              <p className="text-2xl font-bold text-neutral-900">
                {schedule.shifts.reduce((sum, shift) => sum + shift.durationHours, 0).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>

        {/* Workers Assigned */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Workers Assigned</p>
              <p className="text-2xl font-bold text-neutral-900">
                {scheduleData.scheduledEmployees.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Sales Coverage */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Sales Coverage</p>
              <p className="text-2xl font-bold text-neutral-900">
                {salesForecastData
                  ? ((schedule.metrics.estimatedTotalSales / salesForecastData.totalProjectedSales) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Schedule Table */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              Schedule ({schedule.shifts.length} shifts)
            </h2>
            {totalWeeks > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekIndex(Math.max(0, currentWeekIndex - 1))}
                  disabled={currentWeekIndex === 0}
                  className="gap-1 h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-neutral-600 font-medium">
                  Week {currentWeekIndex + 1} of {totalWeeks}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekIndex(Math.min(totalWeeks - 1, currentWeekIndex + 1))}
                  disabled={currentWeekIndex >= totalWeeks - 1}
                  className="gap-1 h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={schedule.shifts.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'schedule' | 'list')}>
              <TabsList>
                <TabsTrigger value="schedule" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule View
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="w-4 h-4" />
                  List View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-blue-50 border-blue-300" />
            <span className="text-neutral-600">Regular Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-purple-100 border-purple-600" />
            <span className="text-neutral-600">Overtime Shift</span>
          </div>
        </div>

        {viewMode === 'schedule' ? (
          // Schedule Grid View
          <div>
          <div className="overflow-x-auto">
            <div>
              {/* Header Row */}
              <div className="grid grid-cols-9">
                <div className="text-left p-3 text-sm font-medium text-neutral-700 bg-neutral-50">
                  Employee
                </div>
                {dayOfWeekMap.map((day, index) => {
                  const date = displayDates[index];
                  const isInRange = isDateInScheduleRange(date);
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const monthName = monthNames[date.getMonth()];
                  const dayNum = date.getDate();

                  return (
                    <div
                      key={day}
                      className={`text-center p-3 text-sm font-medium ${
                        isInRange
                          ? 'text-neutral-700 bg-neutral-50'
                          : 'text-neutral-400 bg-neutral-100'
                      }`}
                    >
                      <div>{days[index]}</div>
                      <div className={`text-xs font-normal ${
                        isInRange ? 'text-neutral-500' : 'text-neutral-400'
                      }`}>
                        {monthName} {dayNum}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center p-3 text-sm font-medium text-neutral-700 bg-neutral-50">
                  <div>Total</div>
                  <div className="text-xs text-neutral-500 font-normal">Hours • Pay</div>
                </div>
              </div>

              {/* Body Rows */}
              <div>
                {/* Scheduled Employees */}
                {scheduleData.scheduledEmployees.map((employee) => {
                  const employeeShifts = scheduleData.shiftsByEmployeeAndDay[employee.id] || {};

                  // Calculate totals for this employee
                  const allEmployeeShifts = Object.values(employeeShifts).flat();
                  const totalHours = allEmployeeShifts.reduce((sum, shift) => sum + shift.durationHours, 0);
                  const totalPay = allEmployeeShifts.reduce((sum, shift) => sum + shift.laborCost, 0);

                  return (
                    <div key={employee.id} className="grid grid-cols-9 hover:bg-neutral-50">
                      <div className="p-3">
                        <div>
                          <p className="text-sm font-medium">{employee.fullName}</p>
                          <p className="text-xs text-neutral-500">${employee.normalPayRate}/hr</p>
                          {employee.groups && employee.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {employee.groups.map((group, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 bg-neutral-50 border-neutral-300 text-neutral-600"
                                >
                                  {group}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {dayOfWeekMap.map((day, index) => {
                        const date = displayDates[index];
                        const isInRange = isDateInScheduleRange(date);
                        const shifts = employeeShifts[day] || [];
                        const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === day;
                        const isDraft = schedule.status === 'DRAFT';

                        // Show preview of dragged shift in drop zone
                        const showPreview = isDropZone && draggedShift && isDraggingOver;

                        // If date is outside schedule range, show empty/disabled cell
                        if (!isInRange) {
                          return (
                            <div
                              key={day}
                              className="p-2 text-center bg-neutral-100"
                            >
                              <div className="text-sm text-neutral-300">—</div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={day}
                            className={`p-2 text-center transition-colors ${
                              isDropZone
                                ? isDraggingOver
                                  ? 'bg-green-100 border-2 border-green-400 border-dashed'
                                  : 'bg-red-100 border-2 border-red-400 border-dashed'
                                : ''
                            }`}
                            onDragOver={(e) => handleDragOver(e, employee.id, day)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, employee.id, day)}
                          >
                            {shifts.length > 0 || showPreview ? (
                              <div className="space-y-1">
                                {shifts.map((shift) => {
                                  const isBeingDragged = draggedShift?.shift.id === shift.id;
                                  const isOvertime = shift.isOvertime;
                                  return (
                                    <div
                                      key={shift.id}
                                      className={`text-sm rounded px-2 py-2 border transition-all ${
                                        isDraft ? 'cursor-move' : ''
                                      } ${isBeingDragged ? 'opacity-50' : 'opacity-100'} ${
                                        isOvertime
                                          ? 'bg-purple-100 border-purple-600 hover:bg-purple-200'
                                          : 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                                      }`}
                                      draggable={isDraft}
                                      onDragStart={(e) => handleDragStart(e, shift, employee.id, day)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <p className="text-sm text-neutral-700 font-medium">
                                        {shift.startTime} - {shift.endTime}
                                      </p>
                                    </div>
                                  );
                                })}
                                {showPreview && draggedShift && (
                                  <div className="text-sm rounded px-2 py-2 opacity-75 bg-green-200 border border-dashed border-green-500">
                                    <p className="text-sm text-neutral-700 font-medium">
                                      {draggedShift.shift.startTime} - {draggedShift.shift.endTime}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-neutral-300">
                                —
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="p-3 text-center">
                        <div className="text-sm font-medium text-neutral-900">
                          {totalHours}h
                        </div>
                        <div className="text-xs text-neutral-500">
                          ${totalPay.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Divider between scheduled and unscheduled employees */}
                {scheduleData.scheduledEmployees.length > 0 && scheduleData.unscheduledEmployees.length > 0 && (
                  <div className="grid grid-cols-9">
                    <div className="col-span-9 p-0">
                      <div className="border-t-2 border-dashed border-neutral-300"></div>
                    </div>
                  </div>
                )}

                {/* Unscheduled Employees */}
                {scheduleData.unscheduledEmployees.map((employee) => {
                  return (
                    <div key={employee.id} className="grid grid-cols-9 hover:bg-neutral-50 opacity-60">
                      <div className="p-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-500">{employee.fullName}</p>
                          <p className="text-xs text-neutral-400">${employee.normalPayRate}/hr</p>
                          {employee.groups && employee.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {employee.groups.map((group, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 bg-neutral-50 border-neutral-300 text-neutral-500"
                                >
                                  {group}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {dayOfWeekMap.map((day, index) => {
                        const date = displayDates[index];
                        const isInRange = isDateInScheduleRange(date);
                        const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === day;
                        const isDraft = schedule.status === 'DRAFT';

                        // Show preview of dragged shift in drop zone
                        const showPreview = isDropZone && draggedShift && isDraggingOver;

                        // If date is outside schedule range, show empty/disabled cell
                        if (!isInRange) {
                          return (
                            <div
                              key={day}
                              className="p-2 text-center bg-neutral-100"
                            >
                              <div className="text-xs text-neutral-300">—</div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={day}
                            className={`p-2 text-center transition-colors ${
                              isDropZone
                                ? isDraggingOver
                                  ? 'bg-green-100 border-2 border-green-400 border-dashed'
                                  : 'bg-red-100 border-2 border-red-400 border-dashed'
                                : ''
                            }`}
                            onDragOver={(e) => handleDragOver(e, employee.id, day)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, employee.id, day)}
                          >
                            {showPreview && draggedShift ? (
                              <div className="text-sm rounded px-2 py-2 opacity-75 bg-green-200 border border-dashed border-green-500">
                                <p className="text-sm text-neutral-700 font-medium">
                                  {draggedShift.shift.startTime} - {draggedShift.shift.endTime}
                                </p>
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-300">—</div>
                            )}
                          </div>
                        );
                      })}
                      <div className="p-3 text-center bg-neutral-50">
                        <div className="text-xs text-neutral-300">—</div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
          </div>
        ) : (
          // List View
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b-2 border-neutral-200">
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Employee</th>
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Day</th>
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Time Slot</th>
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Shift Type</th>
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Hours</th>
                  <th className="text-left p-3 font-semibold text-sm border border-neutral-300">Cost</th>
                </tr>
              </thead>
              <tbody>
                {schedule.shifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-neutral-500">
                      No shifts found
                    </td>
                  </tr>
                ) : (
                  schedule.shifts
                    .sort((a, b) => {
                      // Sort by day, then by employee, then by start time
                      const dayOfWeekA = a.dayOfWeek || getDayOfWeekFromDate(a.date);
                      const dayOfWeekB = b.dayOfWeek || getDayOfWeekFromDate(b.date);
                      const dayOrder = dayOfWeekMap.indexOf(dayOfWeekA) - dayOfWeekMap.indexOf(dayOfWeekB);
                      if (dayOrder !== 0) return dayOrder;
                      if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
                      return a.startTime.localeCompare(b.startTime);
                    })
                    .map((shift, idx) => {
                      const employee = employees.find(e => e.id === shift.employeeId);
                      const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);
                      return (
                        <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-3 text-sm font-medium border border-neutral-300">{employee?.fullName || 'Unknown'}</td>
                          <td className="p-3 text-sm border border-neutral-300">{dayOfWeek.charAt(0) + dayOfWeek.slice(1).toLowerCase()}</td>
                          <td className="p-3 text-sm border border-neutral-300">
                            {shift.startTime} - {shift.endTime}
                          </td>
                          <td className="p-3 text-sm border border-neutral-300">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                shift.isOvertime
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {shift.isOvertime ? 'OVERTIME' : 'REGULAR'}
                            </span>
                          </td>
                          <td className="p-3 text-sm border border-neutral-300">{shift.durationHours.toFixed(1)}</td>
                          <td className="p-3 text-sm border border-neutral-300">${shift.laborCost.toFixed(2)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Collapsible Violations Summary */}
      {totalViolations > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-900">
                  {totalViolations} violation{totalViolations !== 1 ? 's' : ''} detected
                </span>
                <span className="text-xs text-amber-700">
                  ({employeeViolationCount} employee{employeeViolationCount !== 1 ? 's' : ''} affected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {summaryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
            {summaryExpanded && (
              <div className="mt-4 space-y-4">
                {/* Violation Summary Counts */}
                <div className="grid grid-cols-2 gap-2 text-xs pb-4 border-b border-amber-200">
                  {scheduleData.scheduleLevelViolations.length > 0 && (
                    <div className="bg-red-100 px-2 py-1 rounded">
                      Schedule: {scheduleData.scheduleLevelViolations.length}
                    </div>
                  )}
                  {scheduleData.timeBlockViolations.length > 0 && (
                    <div className="bg-orange-100 px-2 py-1 rounded">
                      Time-Block: {scheduleData.timeBlockViolations.length}
                    </div>
                  )}
                  {scheduleData.violationsByEmployee.size > 0 && (
                    <div className="bg-yellow-100 px-2 py-1 rounded">
                      Employee: {scheduleData.violationsByEmployee.size}
                    </div>
                  )}
                </div>

                {/* Violation Details */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Schedule-Level Violations */}
                  {scheduleData.scheduleLevelViolations.length > 0 && (
                    <div className="border border-red-200 rounded-md bg-white">
                      <div className="p-3 bg-red-50 border-b border-red-200">
                        <span className="font-medium text-sm text-red-900">
                          Schedule-Level Issues ({scheduleData.scheduleLevelViolations.length})
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {scheduleData.scheduleLevelViolations.map((violation, idx) => (
                          <div key={idx} className="bg-red-50 p-2 rounded text-xs">
                            <p className="font-medium text-red-800">{violation.type}</p>
                            <p className="text-red-700 mt-1">{violation.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time-Block Violations */}
                  {scheduleData.timeBlockViolations.length > 0 && (
                    <div className="border border-orange-200 rounded-md bg-white">
                      <div className="p-3 bg-orange-50 border-b border-orange-200">
                        <span className="font-medium text-sm text-orange-900">
                          Time-Block Issues ({scheduleData.timeBlockViolations.length})
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {scheduleData.timeBlockViolations.map((violation, idx) => {
                          const dayOfWeek = getDayOfWeekFromDate(violation.date);
                          return (
                            <div key={idx} className="bg-orange-50 p-2 rounded text-xs">
                              <p className="font-medium text-orange-800">{violation.type}</p>
                              <p className="text-orange-700 mt-1">{violation.description}</p>
                              <p className="text-orange-600 text-[11px] mt-1">
                                {dayOfWeek} • {violation.startTime} - {violation.endTime}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Employee Violations */}
                  {Object.entries(scheduleData.violationDetailsMap).map(([employeeId, violations]) => {
                    const employee = employees.find(e => e.id === employeeId);
                    return (
                      <div key={employeeId} className="border border-yellow-200 rounded-md bg-white">
                        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                          <span className="font-medium text-sm text-yellow-900">
                            {employee?.fullName || employeeId} ({violations.length} issue{violations.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {violations.map((violation, idx) => (
                            <div key={idx} className="bg-yellow-50 p-2 rounded text-xs">
                              <p className="font-medium text-yellow-800">{violation.type}</p>
                              <p className="text-yellow-700 mt-1">{violation.description}</p>
                              {isEmployeeDayViolation(violation) && (
                                <p className="text-yellow-600 text-[11px] mt-1">
                                  {getDayOfWeekFromDate(violation.date)}
                                </p>
                              )}
                              {isShiftViolation(violation) && (
                                <p className="text-yellow-600 text-[11px] mt-1">
                                  {getDayOfWeekFromDate(violation.date)} • {violation.startTime} - {violation.endTime}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}