import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Sparkles, Loader2, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWeek } from "../contexts/WeekContext";
import { useFormatters } from "../hooks/useFormatters";
import type { OptimizationObjective } from "../types/scheduling";
import type { Employee } from "../types/employee";

const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface ScheduleEditorProps {
  employees: Employee[];
  onGenerateSchedule: (params: {
    employeeIds: string[];
    optimizationObjective: OptimizationObjective;
    title?: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function ScheduleEditor({ employees, onGenerateSchedule, isGenerating }: ScheduleEditorProps) {
  const { selectedWeek } = useWeek();
  const { formatDate, formatCurrency } = useFormatters();
  const { t } = useTranslation();
  const [selectedObjective, setSelectedObjective] = useState<OptimizationObjective>("MINIMIZE_LABOR_COST");
  // Everyone is selected by default, matching what the scheduling engine does with the
  // whole roster. Employees load asynchronously, so the first render often sees an empty
  // list; the effect below selects each employee as it first appears rather than once at
  // mount, and `seenEmployeeIds` keeps that from re-selecting anyone the manager removed.
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => employees.map(emp => emp.id));
  const seenEmployeeIds = useRef<Set<string>>(new Set(employees.map(emp => emp.id)));
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState<string>("");

  // Helper to format Date to YYYY-MM-DD without timezone conversion
  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize date range from selected week if available, otherwise use next 14 days
  const [startDate, setStartDate] = useState<string>(() => {
    if (selectedWeek) {
      return formatDateToISO(selectedWeek.startDate);
    }
    const today = new Date();
    return formatDateToISO(today);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (selectedWeek) {
      return formatDateToISO(selectedWeek.endDate);
    }
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 13); // 14 days total (inclusive)
    return formatDateToISO(twoWeeksLater);
  });

  // Select employees as they arrive, but only the first time each one is seen, so a
  // manager who removes someone does not get them added back on the next roster refresh.
  useEffect(() => {
    const newIds = employees.map(emp => emp.id).filter(id => !seenEmployeeIds.current.has(id));
    const currentIds = new Set(employees.map(emp => emp.id));
    seenEmployeeIds.current = currentIds;
    if (newIds.length === 0) return;
    // Drop ids of employees no longer on the roster while we are here.
    setSelectedEmployeeIds(prev => [...prev.filter(id => currentIds.has(id)), ...newIds]);
  }, [employees]);

  // Update dates when selected week changes
  useEffect(() => {
    if (selectedWeek) {
      setStartDate(formatDateToISO(selectedWeek.startDate));
      setEndDate(formatDateToISO(selectedWeek.endDate));
    }
  }, [selectedWeek]);

  // Helper to format date string without timezone issues
  const formatDateForDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return formatDate(new Date(Number(year), Number(month) - 1, Number(day)));
  };

  const handleGenerate = async () => {
    // Validate date range
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before or equal to end date');
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      alert('Please select at least one employee to schedule');
      return;
    }

    // Use the placeholder value as default title if user didn't provide one.
    //
    // Named in the manager's own vocabulary ("Rota …" under en-GB), but note this is
    // *stored* on the schedule rather than re-derived for display: a rota named here keeps
    // that name if the region later changes. That is the right trade — it is a name the
    // manager chose by accepting the default, and silently rewriting saved names on a
    // region switch would be worse than one written in the vocabulary of the day.
    const defaultTitle = t('schedule.defaultTitle', {
      start: formatDateForDisplay(startDate),
      end: formatDateForDisplay(endDate),
    });
    const finalTitle = scheduleTitle.trim() || defaultTitle;

    await onGenerateSchedule({
      employeeIds: selectedEmployeeIds,
      optimizationObjective: selectedObjective,
      title: finalTitle,
      startDate,
      endDate,
    });
  };

  const unselectedEmployees = employees.filter(emp => !selectedEmployeeIds.includes(emp.id));

  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <Card>
        {/* No header: the fields below are self-labelled, so a title only repeated
            them. CardContent has to supply the top padding the header did. */}
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Base size to match the Employee Selection card's description below, but
                muted and with no title above it, so it reads as a note rather than a header. */}
            <p className="text-base text-muted-foreground">{t('schedule.objectiveHint')}</p>

            {/* Date Range Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500 font-medium">Start Date</label>
                <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 h-9">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <p className="text-sm text-neutral-700">
                    {formatDateForDisplay(startDate)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500 font-medium">End Date</label>
                <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 h-9">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <p className="text-sm text-neutral-700">
                    {formatDateForDisplay(endDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Other Controls */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Schedule Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">{t('schedule.titleLabel')}</label>
                <Input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="h-9"
                  // The same string handleGenerate falls back to, so the placeholder is a
                  // true preview of the name an untouched field produces.
                  placeholder={t('schedule.defaultTitle', {
                    start: formatDateForDisplay(startDate),
                    end: formatDateForDisplay(endDate),
                  })}
                />
              </div>

              {/* Scheduling Objective */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">{t('schedule.optimizationObjective')}</label>
                <Select value={selectedObjective} onValueChange={(val) => setSelectedObjective(val as OptimizationObjective)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Values are the backend's enum and never localized; only the labels are. */}
                    <SelectItem value="MINIMIZE_LABOR_COST">{t('schedule.objectiveMinimizeCost')}</SelectItem>
                    <SelectItem value="MAXIMIZE_SALES">{t('schedule.objectiveMaximizeSales')}</SelectItem>
                    <SelectItem value="BALANCED">{t('schedule.objectiveBalanced')}</SelectItem>
                    <SelectItem value="MAXIMIZE_FAIRNESS">{t('schedule.objectiveMaximizeFairness')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Selection Summary */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">Employees to Schedule</label>
                <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 h-9">
                  <p className="text-sm text-neutral-700">
                    {selectedEmployeeIds.length === employees.length
                      ? `All (${employees.length})`
                      : `${selectedEmployeeIds.length} of ${employees.length} selected`}
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button - Centered */}
            <div className="flex">
              <Button
                className="gap-2"
                onClick={handleGenerate}
                disabled={isGenerating || employees.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('schedule.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t('schedule.generate')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Selection Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Selection</CardTitle>
          <CardDescription>
            Everyone is scheduled by default. Remove anyone who should be left out, and drag them back to include them again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Employees — also the drop target for including someone again. */}
            <div
              onDragOver={(e) => {
                if (draggedEmployee) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedEmployee && !selectedEmployeeIds.includes(draggedEmployee)) {
                  setSelectedEmployeeIds([...selectedEmployeeIds, draggedEmployee]);
                }
              }}
              className={`border rounded-lg p-4 transition-colors ${
                draggedEmployee ? 'bg-neutral-200 border-neutral-400' : 'bg-neutral-100 border-neutral-200'
              }`}
            >
              <h3 className="text-sm font-medium text-neutral-900 mb-3">Selected for Scheduling</h3>
              {selectedEmployeeIds.length > 0 ? (
                <div className="grid gap-2">
                  {selectedEmployeeIds.map((empId) => {
                    const emp = employees.find(e => e.id === empId);
                    if (!emp) return null;
                    return (
                      <div
                        key={empId}
                        className="flex items-center justify-between bg-white border border-neutral-200 rounded px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{emp.fullName}</p>
                          <p className="text-xs text-neutral-500">
                            {t('schedule.payRatePerHour', { rate: formatCurrency(emp.normalPayRate) })}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== empId));
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Keeps the box present as a drop target once everyone has been removed. */
                <p className="text-sm text-neutral-500 py-2">
                  {draggedEmployee
                    ? t('schedule.dropToInclude')
                    : "No one is selected — drag employees here to schedule them"}
                </p>
              )}
            </div>

            {/* Unselected Employees */}
            {unselectedEmployees.length > 0 && (
              <div className="border border-neutral-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">
                  Available Employees ({unselectedEmployees.length})
                </h3>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {unselectedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-2 bg-white border border-neutral-200 rounded px-3 py-2 cursor-move hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        setDraggedEmployee(employee.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedEmployee(null);
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{employee.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          {t('schedule.payRatePerHour', { rate: formatCurrency(employee.normalPayRate) })}
                        </p>
                      </div>
                      <div className="text-xs text-neutral-400">Drag to select</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}