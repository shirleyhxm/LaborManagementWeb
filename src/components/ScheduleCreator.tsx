import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Users, DollarSign, AlertTriangle, Sparkles, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import { scheduleHistoryService, type ScheduleHistoryRecord } from "../services/scheduleHistoryService";
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
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [laborBudget, setLaborBudget] = useState<number>(5000);
    const [isUpdating, setIsUpdating] = useState(false);
    const [scheduleHistory, setScheduleHistory] = useState<ScheduleHistoryRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

    // Load latest schedule on component mount (only once)
    useEffect(() => {
        const fetchLatestSchedule = async () => {
            try {
                const latestHistory = await scheduleHistoryService.getLatestSchedule();

                // Enrich the schedule with missing fields (employee names, duration, labor cost)
                const enrichedSchedule = enrichSchedule(latestHistory.scheduleOutput, employees);
                loadSchedule(enrichedSchedule);

                // Update the dropdown to show the loaded schedule
                setSelectedPreviousSchedule(latestHistory.id);
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

    // Load schedule history for dropdown
    useEffect(() => {
        const fetchScheduleHistory = async () => {
            try {
                setLoadingHistory(true);
                const history = await scheduleHistoryService.getAllScheduleHistory(0, 10);
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
            const historyRecord = await scheduleHistoryService.getScheduleById(scheduleId);
            const enrichedSchedule = enrichSchedule(historyRecord.scheduleOutput, employees);
            loadSchedule(enrichedSchedule);
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    };

    // Find the current history record if viewing a historical schedule
    const currentHistoryRecord = useMemo(() => {
        if (selectedPreviousSchedule === "new") return null;
        return scheduleHistory.find(h => h.id === selectedPreviousSchedule) || null;
    }, [selectedPreviousSchedule, scheduleHistory]);

    // Determine if we're in view-only mode (viewing historical schedule)
    const isViewOnly = selectedPreviousSchedule !== "new";

    // Pre-process schedule data for efficient rendering (O(n) instead of O(n*7))
    const scheduleData = useMemo(() => {
        if (!schedule) {
            console.log('No schedule object');
            return null;
        }

        /*
        console.log('Schedule data:', schedule);
        console.log('Schedule shifts:', schedule.shifts);
        console.log('Schedule shifts length:', schedule.shifts?.length);
         */

        // Initialize shiftsByDay with all 7 days of the week (empty arrays)
        const shiftsByDay: Record<string, Shift[]> = {};
        dayOfWeekMap.forEach(day => {
            shiftsByDay[day] = [];
        });

        // Group shifts by day of week
        schedule.shifts.forEach(shift => {
            shiftsByDay[shift.dayOfWeek].push(shift);
        });

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

        return { shiftsByDay, violationsByEmployee, understaffedDays };
    }, [schedule]);

    const handleUpdateLaborBudget = async (newBudget: number) => {
        if (newBudget <= 0) return;

        setIsUpdating(true);
        try {
            await fetch('/api/scheduling-request/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ laborCostBudget: newBudget }),
            });
            setLaborBudget(newBudget);
        } catch (error) {
            console.error('Failed to update labor budget:', error);
        } finally {
            setIsUpdating(false);
        }
    };

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
                                            <span>Schedule from {new Date(history.generatedAt).toLocaleDateString()}</span>
                                            <span className="text-xs text-neutral-500">
                                                by {history.generatedBy} • {history.scheduleOutput.shifts.length} shifts
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
                                    // Create sample sales forecast for the week
                                    const salesForecast: Record<string, Record<string, number>> = {};
                                    dayOfWeekMap.forEach(day => {
                                        salesForecast[day] = {
                                            "09:00": 800, "10:00": 900, "11:00": 1000, "12:00": 1200,
                                            "13:00": 1100, "14:00": 1000, "15:00": 1000, "16:00": 900,
                                            "17:00": 800, "18:00": 700, "19:00": 600, "20:00": 500,
                                        };
                                    });

                                    // Create operating hours
                                    const operatingHours: Record<string, { openTime: string; closeTime: string }> = {};
                                    dayOfWeekMap.forEach(day => {
                                        operatingHours[day] = { openTime: "09:00", closeTime: "21:00" };
                                    });

                                    await generateSchedule({
                                        employeeIds: employees.map(emp => emp.id),
                                        laborCostBudget: 5000,
                                        salesForecast,
                                        schedulingPeriod: {
                                            daysToSchedule: dayOfWeekMap,
                                            operatingHours,
                                        },
                                    });
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
                        {isViewOnly ? (
                            <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 bg-neutral-50">
                                <div className="flex-1">
                                    <p className="text-xs text-neutral-500">Scheduling Objective</p>
                                    <p className="text-sm">
                                        {currentHistoryRecord?.schedulingRequest.optimizationObjective === "MINIMIZE_LABOR_COST" && "Minimize Labor Cost"}
                                        {currentHistoryRecord?.schedulingRequest.optimizationObjective === "MAXIMIZE_SALES" && "Maximize Sales Coverage"}
                                        {currentHistoryRecord?.schedulingRequest.optimizationObjective === "BALANCED" && "Balanced Approach"}
                                        {currentHistoryRecord?.schedulingRequest.optimizationObjective === "MAXIMIZE_FAIRNESS" && "Maximize Fairness"}
                                    </p>
                                </div>
                            </div>
                        ) : (
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

                        {/* Labor Budget - View-only when displaying historical schedule */}
                        <div
                            className={`flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 ${
                                isViewOnly ? "bg-neutral-50" : "cursor-pointer hover:border-blue-400 transition-colors"
                            }`}
                            onClick={() => !isViewOnly && setIsEditingBudget(!isEditingBudget)}
                        >
                            <DollarSign className="w-4 h-4 text-neutral-500" />
                            <div className="flex-1">
                                <p className="text-xs text-neutral-500">Labor Budget</p>
                                {!isViewOnly && isEditingBudget ? (
                                    <input
                                        type="number"
                                        className="text-sm w-full border-none outline-none p-0 m-0"
                                        value={laborBudget}
                                        onChange={(e) => setLaborBudget(parseFloat(e.target.value) || 0)}
                                        onBlur={() => {
                                            handleUpdateLaborBudget(laborBudget);
                                            setIsEditingBudget(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleUpdateLaborBudget(laborBudget);
                                                setIsEditingBudget(false);
                                            }
                                        }}
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-sm">
                                        ${(isViewOnly ? currentHistoryRecord?.schedulingRequest.laborCostBudget : laborBudget)?.toFixed(0) || "0"}
                                        {isUpdating && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                                    </p>
                                )}
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

            {/* Schedule Grid */}
            <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Employee List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Available Employees</CardTitle>
                        <CardDescription className="text-xs">Drag to schedule</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {employeesLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : employeesError ? (
                            <div className="text-center py-4">
                                <AlertCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
                                <p className="text-sm text-red-600">Failed to load employees</p>
                            </div>
                        ) : employees.length === 0 ? (
                            <p className="text-sm text-neutral-500 text-center py-4">No employees available</p>
                        ) : (
                            employees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm">{emp.fullName}</p>
                                        <p className="text-xs text-neutral-500">{emp.availability.length} days available</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        ${emp.normalPayRate}/hr
                                    </Badge>
                                </div>
                            ))
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
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                {scheduleData ? (
                                    // Display actual schedule from backend
                                    <div className="space-y-4">
                                        {/* Days Grid */}
                                        <div className="grid grid-cols-7 gap-3">
                                            {dayOfWeekMap.map((dayOfWeek, index) => {
                                                const dayShifts = scheduleData.shiftsByDay[dayOfWeek];
                                                const hasUnderstaffing = scheduleData.understaffedDays.has(dayOfWeek);
                                                const dayAbbrev = days[index];

                                                return (
                                                    <div key={dayOfWeek} className="border border-neutral-200 rounded-lg">
                                                        <div className="bg-neutral-50 p-2 text-center border-b border-neutral-200">
                                                            <p className="text-sm font-medium">{dayAbbrev}</p>
                                                            <p className="text-xs text-neutral-500">Jan {20 + index}</p>
                                                        </div>
                                                        <div className="p-2 space-y-2 min-h-[200px]">
                                                            {dayShifts.length > 0 ? (
                                                                dayShifts.map((shift) => {
                                                                    const hasViolation = scheduleData.violationsByEmployee.has(shift.employeeId);
                                                                    return (
                                                                        <div
                                                                            key={shift.id}
                                                                            className={`text-xs rounded px-2 py-2 ${
                                                                                hasViolation
                                                                                    ? "bg-red-100 border border-red-300"
                                                                                    : shift.isOvertime
                                                                                        ? "bg-purple-100 border border-purple-300"
                                                                                        : "bg-green-100 border border-green-300"
                                                                            }`}
                                                                        >
                                                                            {hasViolation && (
                                                                                <div className="flex items-center gap-1 mb-1">
                                                                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                                                                </div>
                                                                            )}
                                                                            <p className="font-medium">{shift.employeeName}</p>
                                                                            <p className="text-[10px] text-neutral-600 mt-1">
                                                                                {shift.startTime} - {shift.endTime}
                                                                            </p>
                                                                            <p className="text-[10px] text-neutral-500">
                                                                                {shift.durationHours}h • ${shift.laborCost.toFixed(0)}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <p className="text-xs text-neutral-400 text-center py-4">No shifts</p>
                                                            )}

                                                            {/* Show understaffing warning */}
                                                            {hasUnderstaffing && (
                                                                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                                    ⚠ Understaffed
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    // Empty state - no schedule generated
                                    <div className="text-center py-12">
                                        <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                                        <p className="text-neutral-500 mb-2">No schedule generated yet</p>
                                        <p className="text-sm text-neutral-400">Click "Generate Schedule" to create a new schedule</p>
                                    </div>
                                )}
                            </div>
                        </div>

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
                                <div className="w-4 h-4 border-2 border-blue-300 bg-blue-50 rounded"></div>
                                <span className="text-xs text-neutral-600">Overstaffed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-red-300 bg-red-50 rounded"></div>
                                <span className="text-xs text-neutral-600">Conflict</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
