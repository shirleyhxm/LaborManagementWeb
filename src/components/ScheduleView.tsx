import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Save, Loader2, AlertCircle, Users } from "lucide-react";
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import { scheduleService } from "../services/scheduleService";
import type { Schedule, OptimizationObjective } from "../types/scheduling";
import { enrichSchedule } from "../utils/scheduleUtils";
import { ScheduleEditor } from "./ScheduleEditor";
import { ScheduleViewer } from "./ScheduleViewer";

const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function ScheduleView() {
  // Use hooks to fetch real data from backend
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const { schedule, loading: scheduleLoading, generateSchedule, loadSchedule } = useScheduling();

  const [selectedPreviousSchedule, setSelectedPreviousSchedule] = useState("new");
  const [scheduleHistory, setScheduleHistory] = useState<Schedule[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  // Load latest schedule on component mount (only once)
  useEffect(() => {
    const fetchLatestSchedule = async () => {
      try {
        const latestSchedule = await scheduleService.getLatestSchedule();
        const enrichedSchedule = enrichSchedule(latestSchedule, employees);
        loadSchedule(enrichedSchedule);
        setSelectedPreviousSchedule(latestSchedule.id);
        setHasAutoLoaded(true);
      } catch (error) {
        // 404 is expected if no schedule history exists yet
        if (error instanceof Error && !error.message.includes('404')) {
          console.error('Error loading latest schedule:', error);
        }
      }
    };

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

  // Handle schedule generation
  const handleGenerateSchedule = async (params: {
    employeeIds: string[];
    laborCostBudget: number;
    optimizationObjective: OptimizationObjective;
  }) => {
    try {
      // Create operating hours
      const operatingHours: Record<string, { openTime: string; closeTime: string }> = {};
      dayOfWeekMap.forEach(day => {
        operatingHours[day] = { openTime: "09:00", closeTime: "21:00" };
      });

      // Create ScheduleInput
      const scheduleInput = {
        employeeIds: params.employeeIds,
        laborCostBudget: params.laborCostBudget,
        schedulePeriod: {
          daysToSchedule: dayOfWeekMap,
          operatingHours,
        },
        optimizationObjective: params.optimizationObjective,
      };

      const newSchedule = await generateSchedule(
        scheduleInput,
        `Schedule ${new Date().toLocaleDateString()}`,
        "User"
      );

      // Refresh the schedule history list
      const updatedHistory = await scheduleService.getAllSchedules();
      setScheduleHistory(updatedHistory);

      // Switch to viewing the newly generated schedule
      if (newSchedule) {
        setSelectedPreviousSchedule(newSchedule.id);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

  const isCreatingNew = selectedPreviousSchedule === "new";

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
          {!isCreatingNew && (
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Save & Publish
            </Button>
          )}
        </div>
      </div>

      {/* Loading/Error States */}
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
      ) : isCreatingNew ? (
        /* Schedule Creation Mode */
        <ScheduleEditor
          employees={employees}
          onGenerateSchedule={handleGenerateSchedule}
          isGenerating={scheduleLoading}
        />
      ) : schedule ? (
        /* Schedule Viewing Mode */
        <ScheduleViewer schedule={schedule} employees={employees} />
      ) : (
        <div className="text-center py-12">
          <p className="text-neutral-500">Loading schedule...</p>
        </div>
      )}
    </div>
  );
}