import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Clock, Users, DollarSign, AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import type { Schedule, ConstraintViolation, Shift } from "../types/scheduling";
import type { Employee } from "../types/employee";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface ScheduleViewerProps {
  schedule: Schedule;
  employees: Employee[];
}

export function ScheduleViewer({ schedule, employees }: ScheduleViewerProps) {
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

    // Separate scheduled and unscheduled employees
    const scheduledEmployeeIds = new Set(Object.keys(shiftsByEmployeeAndDay));
    const scheduledEmployees = employees.filter(emp => scheduledEmployeeIds.has(emp.id));
    const unscheduledEmployees = employees.filter(emp => !scheduledEmployeeIds.has(emp.id));

    // Create Set of employee IDs with violations for O(1) lookup
    const violationsByEmployee = new Set(
      schedule.violations?.map(v => v.employeeId).filter(Boolean) || []
    );

    // Create Map of employee ID -> violations for detailed information
    const violationDetailsMap: Record<string, ConstraintViolation[]> = {};
    schedule.violations?.forEach(violation => {
      if (violation.employeeId) {
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
      violationDetailsMap,
      understaffedDays
    };
  }, [schedule, employees]);

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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-200">
                  <th className="text-left p-3 text-sm font-medium text-neutral-700 bg-neutral-50">Employee</th>
                  {dayOfWeekMap.map((day, index) => (
                    <th key={day} className="text-center p-3 text-sm font-medium text-neutral-700 bg-neutral-50">
                      <div>{days[index]}</div>
                      <div className="text-xs text-neutral-500 font-normal">Jan {20 + index}</div>
                    </th>
                  ))}
                  <th className="text-center p-3 text-sm font-medium text-neutral-700 bg-neutral-50">
                    <div>Total</div>
                    <div className="text-xs text-neutral-500 font-normal">Hours • Pay</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Scheduled Employees */}
                {scheduleData.scheduledEmployees.map((employee) => {
                  const employeeShifts = scheduleData.shiftsByEmployeeAndDay[employee.id] || {};
                  const hasViolation = scheduleData.violationsByEmployee.has(employee.id);

                  // Calculate totals for this employee
                  const allEmployeeShifts = Object.values(employeeShifts).flat();
                  const totalHours = allEmployeeShifts.reduce((sum, shift) => sum + shift.durationHours, 0);
                  const totalPay = allEmployeeShifts.reduce((sum, shift) => sum + shift.laborCost, 0);

                  return (
                    <tr key={employee.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {hasViolation && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          <div>
                            <p className="text-sm font-medium">{employee.fullName}</p>
                            <p className="text-xs text-neutral-500">${employee.normalPayRate}/hr</p>
                          </div>
                        </div>
                      </td>
                      {dayOfWeekMap.map((day) => {
                        const shifts = employeeShifts[day] || [];
                        const hasUnderstaffing = scheduleData.understaffedDays.has(day);
                        const employeeViolations = scheduleData.violationDetailsMap[employee.id] || [];

                        return (
                          <td key={day} className="p-2 text-center">
                            {shifts.length > 0 ? (
                              <div className="space-y-1">
                                {shifts.map((shift) => {
                                  const shiftContent = (
                                    <div
                                      className={`text-xs rounded px-2 py-2 ${
                                        hasViolation
                                          ? "bg-red-100 border border-red-300"
                                          : shift.isOvertime
                                            ? "bg-purple-100 border border-purple-300"
                                            : "bg-green-100 border border-green-300"
                                      }`}
                                    >
                                      <p className="text-[10px] text-neutral-700 font-medium">
                                        {shift.startTime} - {shift.endTime}
                                      </p>
                                    </div>
                                  );

                                  return hasViolation && employeeViolations.length > 0 ? (
                                    <TooltipProvider key={shift.id}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-help">
                                            {shiftContent}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-white border border-neutral-200 shadow-lg">
                                          <div className="space-y-2">
                                            <p className="font-semibold text-sm text-neutral-900">Violations:</p>
                                            {employeeViolations.map((violation, idx) => (
                                              <div key={idx} className="text-xs space-y-0.5">
                                                <p className="font-medium text-red-600">{violation.type}</p>
                                                <p className="text-neutral-700">{violation.description}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div key={shift.id}>
                                      {shiftContent}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className={`text-xs text-neutral-300 ${hasUnderstaffing ? 'bg-amber-50' : ''}`}>
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center bg-neutral-50">
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
                    <td className="p-3">
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
                    <td className="p-3 text-center bg-neutral-50">
                      <div className="text-xs text-neutral-300">—</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-300 bg-green-100 rounded"></div>
                <span className="text-xs text-neutral-600">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-300 bg-purple-100 rounded"></div>
                <span className="text-xs text-neutral-600">Overtime</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-300 bg-red-100 rounded"></div>
                <span className="text-xs text-neutral-600">Violation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
                <span className="text-xs text-neutral-600">Understaffed Day</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Conflicts Alert */}
      {schedule.violations && schedule.violations.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="text-amber-900">{schedule.violations.length} scheduling conflict{schedule.violations.length !== 1 ? 's' : ''} detected</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline">View Conflicts</Button>
              <Button size="sm">Auto-Resolve</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}