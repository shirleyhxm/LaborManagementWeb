import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Users, DollarSign, AlertTriangle, Sparkles, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import type { OptimizationObjective } from "../types/scheduling";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleCreatorIntegrated() {
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const { schedule, loading: scheduleLoading, error: scheduleError, generateSchedule } = useScheduling();

  const [selectedObjective, setSelectedObjective] = useState<OptimizationObjective>("MINIMIZE_LABOR_COST");
  const [laborBudget, setLaborBudget] = useState(5000);

  const handleAutoSchedule = async () => {
    if (employees.length === 0) {
      alert("No employees available to schedule");
      return;
    }

    try {
      // Create a sample sales forecast for the week
      const salesForecast: Record<string, Record<string, number>> = {};
      days.forEach(day => {
        salesForecast[day] = {
          "09:00": 800,
          "10:00": 900,
          "11:00": 1000,
          "12:00": 1200,
          "13:00": 1100,
          "14:00": 1000,
          "15:00": 1000,
          "16:00": 900,
          "17:00": 800,
          "18:00": 700,
          "19:00": 600,
          "20:00": 500,
        };
      });

      // Create operating hours for the week
      const operatingHours: Record<string, { openTime: string; closeTime: string }> = {};
      days.forEach(day => {
        operatingHours[day] = {
          openTime: "09:00",
          closeTime: "21:00",
        };
      });

      await generateSchedule({
        employeeIds: employees.map(emp => emp.id),
        laborCostBudget: laborBudget,
        salesForecast,
        schedulingPeriod: {
          daysToSchedule: days,
          operatingHours,
        },
      });
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    }
  };

  // Group shifts by day and time for display
  const getShiftsForDayAndTime = (dayOfWeek: string, timeRange: string) => {
    if (!schedule) return [];

    return schedule.shifts.filter(shift => {
      if (shift.dayOfWeek !== dayOfWeek) return false;

      // Simple time range matching (this is a simplified version)
      const startHour = parseInt(shift.startTime.split(":")[0]);
      if (timeRange === "Morning" && startHour >= 6 && startHour < 14) return true;
      if (timeRange === "Evening" && startHour >= 14 && startHour < 22) return true;
      if (timeRange === "Night" && (startHour >= 22 || startHour < 6)) return true;

      return false;
    });
  };

  // Get staffing requirement for a day/time
  const getStaffingStatus = (dayOfWeek: string, timeRange: string) => {
    if (!schedule) return null;

    const requirements = schedule.staffingRequirements.filter(req => {
      if (req.dayOfWeek !== dayOfWeek) return false;

      const startHour = parseInt(req.startTime.split(":")[0]);
      if (timeRange === "Morning" && startHour >= 6 && startHour < 14) return true;
      if (timeRange === "Evening" && startHour >= 14 && startHour < 22) return true;
      if (timeRange === "Night" && (startHour >= 22 || startHour < 6)) return true;

      return false;
    });

    if (requirements.length === 0) return null;

    const isUnderstaffed = requirements.some(r => r.isUnderstaffed);
    const totalGap = requirements.reduce((sum, r) => sum + r.staffingGap, 0);

    return { isUnderstaffed, totalGap };
  };

  if (employeesLoading) {
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

  if (employeesError) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <p className="text-red-900">Failed to load employees</p>
          <p className="text-sm text-red-700 mt-1">{employeesError.message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const shifts = [
    { time: "6am-2pm", label: "Morning" },
    { time: "2pm-10pm", label: "Evening" },
    { time: "10pm-6am", label: "Night" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-neutral-900">Schedule Creator</h2>
          <p className="text-neutral-500">Week of Jan 20-26, 2025</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleAutoSchedule}
            disabled={scheduleLoading || employees.length === 0}
          >
            {scheduleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {scheduleLoading ? "Generating..." : "Auto-Schedule"}
          </Button>
          <Button className="gap-2" disabled={!schedule}>
            <Save className="w-4 h-4" />
            Save & Publish
          </Button>
        </div>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Objective</CardTitle>
          <CardDescription>Choose your optimization priority</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={selectedObjective} onValueChange={(val) => setSelectedObjective(val as OptimizationObjective)}>
              <SelectTrigger>
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MINIMIZE_LABOR_COST">Minimize Labor Cost</SelectItem>
                <SelectItem value="MAXIMIZE_SALES">Maximize Sales Coverage</SelectItem>
                <SelectItem value="BALANCED">Balanced Approach</SelectItem>
                <SelectItem value="MAXIMIZE_FAIRNESS">Maximize Fairness</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Est. Cost</p>
                <p className="text-sm">
                  {schedule ? `$${schedule.metrics.totalLaborCost.toFixed(0)}` : "$0"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Est. Sales</p>
                <p className="text-sm">
                  {schedule ? `$${schedule.metrics.estimatedTotalSales.toFixed(0)}` : "$0"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Labor %</p>
                <p className="text-sm">
                  {schedule ? `${schedule.metrics.laborCostPercentage.toFixed(1)}%` : "0%"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {scheduleError && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <p className="text-red-900">Failed to generate schedule</p>
            <p className="text-sm text-red-700 mt-1">{scheduleError.message}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Schedule Grid */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Employees</CardTitle>
            <CardDescription className="text-xs">{employees.length} employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
              >
                <div>
                  <p className="text-sm">{emp.fullName}</p>
                  <p className="text-xs text-neutral-500">
                    {emp.availability.length} days available
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  ${emp.normalPayRate}/hr
                </Badge>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No employees found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Schedule Calendar */}
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
            {!schedule ? (
              <div className="text-center py-12 text-neutral-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No schedule generated yet</p>
                <p className="text-xs mt-1">Click "Auto-Schedule" to generate a schedule</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Days Header */}
                  <div className="grid grid-cols-8 gap-2 mb-2">
                    <div className="text-xs text-neutral-500"></div>
                    {dayLabels.map((day, idx) => (
                      <div key={day} className="text-center">
                        <p className="text-sm">{day}</p>
                        <p className="text-xs text-neutral-500">Jan {20 + idx}</p>
                      </div>
                    ))}
                  </div>

                  {/* Schedule Grid */}
                  {shifts.map((shift) => (
                    <div key={shift.time} className="grid grid-cols-8 gap-2 mb-3">
                      <div className="flex flex-col justify-center">
                        <p className="text-sm">{shift.label}</p>
                        <p className="text-xs text-neutral-500">{shift.time}</p>
                      </div>
                      {days.map((day, dayIdx) => {
                        const dayShifts = getShiftsForDayAndTime(day, shift.label);
                        const staffingStatus = getStaffingStatus(day, shift.label);
                        const isUnderstaffed = staffingStatus?.isUnderstaffed || false;
                        const hasViolations = schedule.violations.some(v =>
                          dayShifts.some(s => s.employeeId === v.employeeId)
                        );

                        return (
                          <div
                            key={`${day}-${shift.time}`}
                            className={`min-h-[80px] border-2 border-dashed rounded-lg p-2 space-y-1 ${
                              hasViolations
                                ? "border-red-300 bg-red-50"
                                : isUnderstaffed
                                ? "border-amber-300 bg-amber-50"
                                : dayShifts.length > 0
                                ? "border-green-300 bg-green-50"
                                : "border-neutral-200 bg-white"
                            } transition-colors`}
                          >
                            {dayShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className="text-xs bg-green-100 border border-green-300 rounded px-2 py-1"
                              >
                                <p className="truncate">{shift.employeeName.split(" ")[0]}</p>
                                <p className="text-[10px] text-neutral-500">
                                  {shift.startTime}-{shift.endTime}
                                </p>
                              </div>
                            ))}
                            {isUnderstaffed && staffingStatus && (
                              <p className="text-xs text-amber-600">
                                Need +{staffingStatus.totalGap}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-300 bg-green-100 rounded"></div>
                <span className="text-xs text-neutral-600">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-300 bg-amber-50 rounded"></div>
                <span className="text-xs text-neutral-600">Understaffed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-300 bg-red-50 rounded"></div>
                <span className="text-xs text-neutral-600">Conflict</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Violations Alert */}
      {schedule && schedule.violations.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="text-amber-900">
              {schedule.violations.length} scheduling constraint violations detected
            </p>
            <div className="mt-2 space-y-1">
              {schedule.violations.slice(0, 3).map((violation, idx) => (
                <p key={idx} className="text-sm text-amber-800">
                  • {violation.description}
                </p>
              ))}
              {schedule.violations.length > 3 && (
                <p className="text-sm text-amber-800">
                  ... and {schedule.violations.length - 3} more
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}