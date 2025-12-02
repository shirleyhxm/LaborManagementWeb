import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Clock, Users, DollarSign, AlertTriangle, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
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
  const [draggedShift, setDraggedShift] = useState<{shift: Shift; fromEmployeeId: string; fromDay: string} | null>(null);
  const [dropTarget, setDropTarget] = useState<{employeeId: string; day: string} | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Pre-process schedule data for efficient rendering
  const scheduleData = useMemo(() => {
    // Create a map of employee ID -> day -> shifts array (supporting multiple shifts per day)
    const shiftsByEmployeeAndDay: Record<string, Record<string, Shift[]>> = {};

    schedule.shifts.forEach(shift => {
      if (!shiftsByEmployeeAndDay[shift.employeeId]) {
        shiftsByEmployeeAndDay[shift.employeeId] = {};
      }
      if (!shiftsByEmployeeAndDay[shift.employeeId][shift.dayOfWeek]) {
        shiftsByEmployeeAndDay[shift.employeeId][shift.dayOfWeek] = [];
      }
      shiftsByEmployeeAndDay[shift.employeeId][shift.dayOfWeek].push(shift);
    });

    // Calculate daily labor costs
    const dailyLaborCosts: Record<string, number> = {};
    dayOfWeekMap.forEach(day => {
      dailyLaborCosts[day] = 0;
    });

    schedule.shifts.forEach(shift => {
      dailyLaborCosts[shift.dayOfWeek] += shift.laborCost;
    });

    // Calculate daily estimated sales from employee productivity × hours
    const dailyEstimatedSales: Record<string, number> = {};
    dayOfWeekMap.forEach(day => {
      dailyEstimatedSales[day] = 0;
    });

    // Sum up (employee productivity × shift hours) for each day
    schedule.shifts.forEach(shift => {
      const employee = employees.find(emp => emp.id === shift.employeeId);
      if (employee) {
        const estimatedSales = employee.productivity * shift.durationHours;
        dailyEstimatedSales[shift.dayOfWeek] += estimatedSales;
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
        violationsByEmployeeDay.get(violation.employeeId)!.add(violation.dayOfWeek);
        if (!violationDetailsMap[violation.employeeId]) {
          violationDetailsMap[violation.employeeId] = [];
        }
        violationDetailsMap[violation.employeeId].push(violation);
      } else if (isShiftViolation(violation)) {
        // Shift-level violations (e.g., availability conflict)
        violationsByEmployee.add(violation.employeeId);
        const shiftKey = `${violation.employeeId}:${violation.dayOfWeek}:${violation.startTime}`;
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
        .map(req => req.dayOfWeek) || []
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
  }, [schedule, employees]);

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

  return (
    <div className="space-y-6">
      {/* Schedule Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Optimization Objective */}
            {schedule.optimizationObjective && (
              <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
                <Sparkles className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Objective</p>
                  <p className="text-sm">
                    {schedule.optimizationObjective === "MINIMIZE_LABOR_COST" && "Minimize Labor Cost"}
                    {schedule.optimizationObjective === "MAXIMIZE_SALES" && "Maximize Sales"}
                    {schedule.optimizationObjective === "BALANCED" && "Balanced"}
                    {schedule.optimizationObjective === "MAXIMIZE_FAIRNESS" && "Maximize Fairness"}
                  </p>
                </div>
              </div>
            )}

            {/* Labor Cost */}
            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 bg-neutral-50">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              <div className="flex-1">
                <p className="text-xs text-neutral-500">Labor Cost</p>
                <p className="text-sm">${schedule.metrics.totalLaborCost.toFixed(0)}</p>
              </div>
            </div>

            {/* Est. Sales */}
            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Est. Sales</p>
                <p className="text-sm">${schedule.metrics.estimatedTotalSales.toFixed(0)}</p>
              </div>
            </div>

            {/* Labor % */}
            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Labor %</p>
                <p className="text-sm">{schedule.metrics.laborCostPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weekly Schedule</CardTitle>
            <Tabs defaultValue="grid">
              <TabsList className="h-8">
                <TabsTrigger value="grid" className="text-xs">Grid</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-blue-50 border-blue-300" />
              <span className="text-neutral-600">Regular Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-purple-100 border-purple-600" />
              <span className="text-neutral-600">Overtime Shift</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-4 border-neutral-300">
              <thead>
                <tr className="border-b-4 border-neutral-300">
                  <th className="text-left p-3 text-sm font-medium text-neutral-700 bg-neutral-50 border-r-4 border-neutral-300">Employee</th>
                  {dayOfWeekMap.map((day, index) => (
                    <th key={day} className="text-center p-3 text-sm font-medium text-neutral-700 bg-neutral-50">
                      <div>{days[index]}</div>
                      <div className="text-xs text-neutral-500 font-normal">Jan {20 + index}</div>
                    </th>
                  ))}
                  <th className="text-center p-3 text-sm font-medium text-neutral-700 bg-neutral-50 border-l-4 border-neutral-300">
                    <div>Total</div>
                    <div className="text-xs text-neutral-500 font-normal">Hours • Pay</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Scheduled Employees */}
                {scheduleData.scheduledEmployees.map((employee) => {
                  const employeeShifts = scheduleData.shiftsByEmployeeAndDay[employee.id] || {};

                  // Calculate totals for this employee
                  const allEmployeeShifts = Object.values(employeeShifts).flat();
                  const totalHours = allEmployeeShifts.reduce((sum, shift) => sum + shift.durationHours, 0);
                  const totalPay = allEmployeeShifts.reduce((sum, shift) => sum + shift.laborCost, 0);

                  return (
                    <tr key={employee.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                      <td className="p-3 border-r-4 border-neutral-300">
                        <div>
                          <p className="text-sm font-medium">{employee.fullName}</p>
                          <p className="text-xs text-neutral-500">${employee.normalPayRate}/hr</p>
                        </div>
                      </td>
                      {dayOfWeekMap.map((day) => {
                        const shifts = employeeShifts[day] || [];
                        const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === day;
                        const isDraft = schedule.status === 'DRAFT';

                        // Show preview of dragged shift in drop zone
                        const showPreview = isDropZone && draggedShift && isDraggingOver;

                        return (
                          <td
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
                                      className={`text-xs rounded px-2 py-2 border transition-all ${
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
                                      <p className="text-[10px] text-neutral-700 font-medium">
                                        {shift.startTime} - {shift.endTime}
                                      </p>
                                    </div>
                                  );
                                })}
                                {showPreview && draggedShift && (
                                  <div className="text-xs rounded px-2 py-2 opacity-75 bg-green-200 border border-dashed border-green-500">
                                    <p className="text-[10px] text-neutral-700 font-medium">
                                      {draggedShift.shift.startTime} - {draggedShift.shift.endTime}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-300">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center bg-neutral-50 border-l-4 border-neutral-300">
                        <div className="text-sm font-medium text-neutral-900">
                          {totalHours}h
                        </div>
                        <div className="text-xs text-neutral-500">
                          ${totalPay.toFixed(0)}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Divider between scheduled and unscheduled employees */}
                {scheduleData.scheduledEmployees.length > 0 && scheduleData.unscheduledEmployees.length > 0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <div className="border-t-2 border-dashed border-neutral-300"></div>
                    </td>
                  </tr>
                )}

                {/* Unscheduled Employees */}
                {scheduleData.unscheduledEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-neutral-200 hover:bg-neutral-50 opacity-60">
                    <td className="p-3 border-r-4 border-neutral-300">
                      <div>
                        <p className="text-sm font-medium text-neutral-500">{employee.fullName}</p>
                        <p className="text-xs text-neutral-400">${employee.normalPayRate}/hr</p>
                      </div>
                    </td>
                    {dayOfWeekMap.map((day) => (
                      <td key={day} className="p-2 text-center">
                        <div className="text-xs text-neutral-300">—</div>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-neutral-50 border-l-4 border-neutral-300">
                      <div className="text-xs text-neutral-300">—</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Daily Labor Cost Summary Row */}
                <tr className="bg-blue-50 border-t-4 border-neutral-300">
                  <td className="p-3 border-r-4 border-neutral-300">
                    <div className="text-sm font-medium text-neutral-900">Daily Labor Cost</div>
                  </td>
                  {dayOfWeekMap.map((day) => {
                    const dailyCost = scheduleData.dailyLaborCosts[day] || 0;
                    return (
                      <td key={day} className="p-3 text-center">
                        <div className="text-sm text-neutral-900">
                          ${dailyCost.toFixed(0)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3 text-center bg-blue-100 border-l-4 border-neutral-300">
                    <div className="text-sm text-neutral-900">
                      ${schedule.metrics.totalLaborCost.toFixed(0)}
                    </div>
                  </td>
                </tr>

                {/* Sales Ratio Summary Row */}
                {salesForecastData && (
                  <tr className="bg-green-50">
                    <td className="p-3 border-r-4 border-neutral-300">
                      <div className="text-sm font-medium text-neutral-900">Sales Target Ratio</div>
                      <div className="text-xs text-neutral-500 font-normal">Planned / Projected</div>
                    </td>
                    {dayOfWeekMap.map((day) => {
                      const dailyEstimated = scheduleData.dailyEstimatedSales[day] || 0;
                      const dailyProjected = salesForecastData.dailyProjectedSales[day] || 0;
                      return (
                        <td key={day} className="p-3 text-center">
                          <div className="text-sm text-neutral-900">
                            ${dailyEstimated.toFixed(0)} / ${dailyProjected.toFixed(0)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center bg-green-100 border-l-4 border-neutral-300">
                      <div className="text-sm font-medium text-neutral-900">
                        ${schedule.metrics.estimatedTotalSales.toFixed(0)} / ${salesForecastData.totalProjectedSales.toFixed(0)}
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
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
                        {scheduleData.timeBlockViolations.map((violation, idx) => (
                          <div key={idx} className="bg-orange-50 p-2 rounded text-xs">
                            <p className="font-medium text-orange-800">{violation.type}</p>
                            <p className="text-orange-700 mt-1">{violation.description}</p>
                            <p className="text-orange-600 text-[11px] mt-1">
                              {violation.dayOfWeek} • {violation.startTime} - {violation.endTime}
                            </p>
                          </div>
                        ))}
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
                                  {violation.dayOfWeek}
                                </p>
                              )}
                              {isShiftViolation(violation) && (
                                <p className="text-yellow-600 text-[11px] mt-1">
                                  {violation.dayOfWeek} • {violation.startTime} - {violation.endTime}
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