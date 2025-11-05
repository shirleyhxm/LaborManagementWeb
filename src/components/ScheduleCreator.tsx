import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Users, DollarSign, AlertTriangle, Sparkles, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import { scheduleService } from "../services/scheduleService";
import type { Schedule } from "../types/scheduling";
import { enrichSchedule } from "../utils/scheduleUtils";
import type { OptimizationObjective } from "../types/scheduling";
import type { Shift } from "../types/scheduling";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function ScheduleCreator() {
    // Use hooks to fetch real data from backend
    const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
    const { schedule, loading: scheduleLoading, error: scheduleError, generateSchedule, loadSchedule } = useScheduling();

    const [selectedObjective, setSelectedObjective] = useState<OptimizationObjective>("MINIMIZE_LABOR_COST");
    const [selectedPreviousSchedule, setSelectedPreviousSchedule] = useState("new");
    const [scheduleHistory, setScheduleHistory] = useState<Schedule[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

    // Load latest schedule on component mount (only once)
    useEffect(() => {
        const fetchLatestSchedule = async () => {
            try {
                const latestSchedule = await scheduleService.getLatestSchedule();

                // Enrich the schedule with missing fields (employee names)
                const enrichedSchedule = enrichSchedule(latestSchedule, employees);
                loadSchedule(enrichedSchedule);

                // Update the dropdown to show the loaded schedule
                setSelectedPreviousSchedule(latestSchedule.id);
                setHasAutoLoaded(true);
            } catch (error) {
                // 404 is expected if no schedule history exists yet
                if (error instanceof Error && !error.message.includes('404')) {
                    console.error('Error loading latest schedule:', error);
                }
            }
        };

        // Only fetch once on initial load if employees are loaded (needed for employee names)
        if (!hasAutoLoaded && !employeesLoading && employees.length > 0) {
            fetchLatestSchedule();
        }
    }, [employees, employeesLoading, loadSchedule, hasAutoLoaded]);

    // Load all schedules for dropdown
    useEffect(() => {
        const fetchScheduleHistory = async () => {
            try {
                setLoadingHistory(true);
                const history = await scheduleService.getAllSchedules();
                setScheduleHistory(history);
            } catch (error) {
                console.error('Error loading schedule history:', error);
            } finally {
                setLoadingHistory(false);
            }
        };

        if (!employeesLoading) {
            fetchScheduleHistory();
        }
    }, [employeesLoading]);

    // Handle schedule selection from dropdown
    const handleScheduleSelection = async (scheduleId: string) => {
        setSelectedPreviousSchedule(scheduleId);

        if (scheduleId === "new") {
            // Clear current schedule to create a new one
            loadSchedule(null as any);
            return;
        }

        try {
            const selectedSchedule = await scheduleService.getScheduleById(scheduleId);
            const enrichedSchedule = enrichSchedule(selectedSchedule, employees);
            loadSchedule(enrichedSchedule);
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    };

    // Determine if we're in view-only mode (viewing historical schedule)
    const isViewOnly = selectedPreviousSchedule !== "new";

    // Pre-process schedule data for efficient rendering
    const scheduleData = useMemo(() => {
        if (!schedule) {
            return null;
        }

        // Create a map of employee ID -> day -> shift
        const shiftsByEmployeeAndDay: Record<string, Record<string, Shift>> = {};

        schedule.shifts.forEach(shift => {
            if (!shiftsByEmployeeAndDay[shift.employeeId]) {
                shiftsByEmployeeAndDay[shift.employeeId] = {};
            }
            shiftsByEmployeeAndDay[shift.employeeId][shift.dayOfWeek] = shift;
        });

        // Separate scheduled and unscheduled employees
        const scheduledEmployeeIds = new Set(Object.keys(shiftsByEmployeeAndDay));
        const scheduledEmployees = employees.filter(emp => scheduledEmployeeIds.has(emp.id));
        const unscheduledEmployees = employees.filter(emp => !scheduledEmployeeIds.has(emp.id));

        // Create Set of employee IDs with violations for O(1) lookup
        const violationsByEmployee = new Set(
            schedule.violations?.map(v => v.employeeId) || []
        );

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
            understaffedDays
        };
    }, [schedule, employees]);

    return (
        <div className="space-y-6">
            {/* Page Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-neutral-900">Schedule Creator</h2>
                    <p className="text-neutral-500">Week of Jan 20-26, 2025</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={selectedPreviousSchedule} onValueChange={handleScheduleSelection}>
                        <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Load previous schedule" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">
                                <div className="flex flex-col">
                                    <span>Create New Schedule</span>
                                </div>
                            </SelectItem>
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                </div>
                            ) : (
                                scheduleHistory.map((history) => (
                                    <SelectItem key={history.id} value={history.id}>
                                        <div className="flex flex-col">
                                            <span>{history.name || `Schedule from ${new Date(history.publishedAt || history.createdAt).toLocaleDateString()}`}</span>
                                            <span className="text-xs text-neutral-500">
                                                by {history.publishedBy || history.createdBy} • {history.shifts.length} shifts
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <Button className="gap-2">
                        <Save className="w-4 h-4" />
                        Save & Publish
                    </Button>
                </div>
            </div>

            {/* Optimization Controls */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>Scheduling Objective</CardTitle>
                            <CardDescription>Choose your optimization priority</CardDescription>
                        </div>
                        <Button
                            className="gap-2"
                            onClick={async () => {
                                if (employees.length === 0) {
                                    alert("No employees available to schedule");
                                    return;
                                }

                                try {
                                    // Create operating hours
                                    const operatingHours: Record<string, { openTime: string; closeTime: string }> = {};
                                    dayOfWeekMap.forEach(day => {
                                        operatingHours[day] = { openTime: "09:00", closeTime: "21:00" };
                                    });

                                    // Create ScheduleInput
                                    const scheduleInput = {
                                        employeeIds: employees.map(emp => emp.id),
                                        laborCostBudget: 5000,
                                        schedulePeriod: {
                                            daysToSchedule: dayOfWeekMap,
                                            operatingHours,
                                        },
                                        optimizationObjective: selectedObjective,
                                    };

                                    await generateSchedule(
                                        scheduleInput,
                                        `Schedule ${new Date().toLocaleDateString()}`,
                                        "User"
                                    );
                                } catch (error) {
                                    console.error('Error generating schedule:', error);
                                }
                            }}
                            disabled={scheduleLoading || employeesLoading || employees.length === 0}
                        >
                            {scheduleLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate Schedule
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Scheduling Objective - View-only when displaying historical schedule */}
                        {!isViewOnly && (
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
                        )}

                        {/* Labor Cost */}
                        <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 bg-neutral-50">
                            <DollarSign className="w-4 h-4 text-neutral-500" />
                            <div className="flex-1">
                                <p className="text-xs text-neutral-500">Labor Cost</p>
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
                    {employeesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : employeesError ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
                            <p className="text-sm text-red-600">Failed to load employees</p>
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                            <p className="text-neutral-500 mb-2">No employees available</p>
                        </div>
                    ) : !scheduleData ? (
                        <div className="text-center py-12">
                            <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                            <p className="text-neutral-500 mb-2">No schedule generated yet</p>
                            <p className="text-sm text-neutral-400">Click "Generate Schedule" to create a new schedule</p>
                        </div>
                    ) : (
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Scheduled Employees */}
                                    {scheduleData.scheduledEmployees.map((employee) => {
                                        const employeeShifts = scheduleData.shiftsByEmployeeAndDay[employee.id] || {};
                                        const hasViolation = scheduleData.violationsByEmployee.has(employee.id);

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
                                                    const shift = employeeShifts[day];
                                                    const hasUnderstaffing = scheduleData.understaffedDays.has(day);

                                                    return (
                                                        <td key={day} className="p-2 text-center">
                                                            {shift ? (
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
                                                                    <p className="text-[10px] text-neutral-500 mt-1">
                                                                        {shift.durationHours}h • ${shift.laborCost.toFixed(0)}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className={`text-xs text-neutral-300 ${hasUnderstaffing ? 'bg-amber-50' : ''}`}>
                                                                    —
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}

                                    {/* Divider between scheduled and unscheduled employees */}
                                    {scheduleData.scheduledEmployees.length > 0 && scheduleData.unscheduledEmployees.length > 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-0">
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
                    )}
                </CardContent>
            </Card>

            {/* Active Conflicts Alert */}
            {schedule && schedule.violations && schedule.violations.length > 0 && (
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
