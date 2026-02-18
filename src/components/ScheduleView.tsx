import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Save, Loader2, AlertCircle, Users } from "lucide-react";
import { useEmployees } from "../hooks/useEmployees";
import { useScheduling } from "../hooks/useScheduling";
import { useSalesForecast } from "../hooks/useSalesForecast";
import { useWeek } from "../contexts/WeekContext";
import { scheduleService } from "../services/scheduleService";
import type { Schedule, OptimizationObjective } from "../types/scheduling";
import { enrichSchedule } from "../utils/scheduleUtils";
import { ScheduleEditor } from "./ScheduleEditor";
import { ScheduleViewer } from "./ScheduleViewer";

const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function ScheduleView() {
  const { id: scheduleId } = useParams();
  const navigate = useNavigate();

  // Use hooks to fetch real data from backend
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const { schedule, loading: scheduleLoading, generateSchedule, loadSchedule } = useScheduling();
  const { forecast } = useSalesForecast();
  const { selectedWeek } = useWeek();

  const [scheduleHistory, setScheduleHistory] = useState<Schedule[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isReplacingSchedule = useRef(false);

  const isCreatingNew = scheduleId === 'new' || !scheduleId;

  // Helper to format Date to YYYY-MM-DD without timezone conversion
  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter schedules for the selected week
  const schedulesForWeek = useMemo(() => {
    if (!selectedWeek || !scheduleHistory.length) return [];

    // Convert selected week Date objects to ISO strings for comparison
    const selectedStartStr = formatDateToISO(selectedWeek.startDate);
    const selectedEndStr = formatDateToISO(selectedWeek.endDate);

    return scheduleHistory.filter((s) => {
      // Check if schedule period overlaps with selected week
      const scheduleStart = s.schedulePeriod.startDate;
      const scheduleEnd = s.schedulePeriod.endDate;

      return (
        scheduleStart <= selectedEndStr &&
        scheduleEnd >= selectedStartStr
      );
    });
  }, [scheduleHistory, selectedWeek]);

  // Load schedule based on route param
  useEffect(() => {
    const fetchSchedule = async () => {
      if (isCreatingNew) {
        // Check if a schedule exists for the selected week's date range
        // Skip this check if user is intentionally replacing the schedule
        if (selectedWeek && !isReplacingSchedule.current) {
          const selectedStartStr = formatDateToISO(selectedWeek.startDate);
          const selectedEndStr = formatDateToISO(selectedWeek.endDate);

          try {
            const existingSchedule = await scheduleService.getScheduleByDateRange(selectedStartStr, selectedEndStr);
            if (existingSchedule) {
              // Navigate to the existing schedule instead of showing creator
              navigate(`/schedule/${existingSchedule.id}`, { replace: true });
              return;
            }
          } catch (error) {
            console.error('Error checking for existing schedule:', error);
          }
        }

        // Reset the replacing flag and show creator
        isReplacingSchedule.current = false;
        loadSchedule(null as any);
        return;
      }

      if (!scheduleId) return;

      try {
        const fetchedSchedule = await scheduleService.getScheduleById(scheduleId);
        const enrichedSchedule = enrichSchedule(fetchedSchedule, employees);
        loadSchedule(enrichedSchedule);
      } catch (error) {
        console.error('Error loading schedule:', error);
        // If schedule not found, redirect to new
        navigate('/schedule/new');
      }
    };

    if (!employeesLoading && employees.length > 0) {
      fetchSchedule();
    }
  }, [scheduleId, employees, employeesLoading, loadSchedule, navigate, isCreatingNew, selectedWeek]);

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

  // Auto-navigate when week changes while viewing a schedule
  useEffect(() => {
    if (!selectedWeek || loadingHistory || !schedule || !scheduleId || scheduleId === 'new') return;

    const checkScheduleForWeek = async () => {
      const selectedStartStr = formatDateToISO(selectedWeek.startDate);
      const selectedEndStr = formatDateToISO(selectedWeek.endDate);

      // Check if current schedule matches the selected week
      const scheduleStart = schedule.schedulePeriod.startDate;
      const scheduleEnd = schedule.schedulePeriod.endDate;

      const matchesWeek = scheduleStart === selectedStartStr && scheduleEnd === selectedEndStr;

      if (!matchesWeek) {
        // Week changed, check if a schedule exists for the newly selected week
        try {
          const existingSchedule = await scheduleService.getScheduleByDateRange(selectedStartStr, selectedEndStr);
          if (existingSchedule) {
            navigate(`/schedule/${existingSchedule.id}`);
          } else {
            // No schedule for this week, navigate to create new
            navigate('/schedule/new');
          }
        } catch (error) {
          console.error('Error checking for existing schedule:', error);
          navigate('/schedule/new');
        }
      }
    };

    checkScheduleForWeek();
  }, [selectedWeek, scheduleId, schedule, navigate, loadingHistory]);

  // Handle replace schedule confirmation
  const handleReplaceSchedule = () => {
    setShowReplaceConfirm(false);
    isReplacingSchedule.current = true;
    navigate('/schedule/new');
  };

  // Handle schedule generation
  const handleGenerateSchedule = async (params: {
    employeeIds: string[];
    laborCostBudget: number;
    optimizationObjective: OptimizationObjective;
    title?: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      // Use the dates provided by the user
      const startDateObj = new Date(params.startDate);
      const endDateObj = new Date(params.endDate);

      // Create operating hours for each date in the range
      const operatingHours: Record<string, { openTime: string; closeTime: string }> = {};
      const currentDate = new Date(startDateObj);
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        operatingHours[dateStr] = { openTime: "09:00", closeTime: "21:00" };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create ScheduleInput with date-based period
      const scheduleInput = {
        employeeIds: params.employeeIds,
        laborCostBudget: params.laborCostBudget,
        schedulePeriod: {
          startDate: params.startDate,
          endDate: params.endDate,
          operatingHours,
        },
        optimizationObjective: params.optimizationObjective,
      };

      const scheduleTitle = params.title || `Schedule ${new Date().toLocaleDateString()}`;

      const newSchedule = await generateSchedule(
        scheduleInput,
        scheduleTitle,
        "User"
      );

      // Refresh the schedule history to include the new schedule
      if (newSchedule) {
        const updatedHistory = await scheduleService.getAllSchedules();
        setScheduleHistory(updatedHistory);

        // Navigate to the newly generated schedule
        navigate(`/schedule/${newSchedule.id}`);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

  // Handle schedule publishing
  const handlePublishSchedule = async () => {
    if (!schedule) return;

    try {
      setIsPublishing(true);
      const publishedSchedule = await scheduleService.publishSchedule(schedule.id, "User");

      // Update the current schedule with published data
      const enrichedSchedule = enrichSchedule(publishedSchedule, employees);
      loadSchedule(enrichedSchedule);

      // Refresh the schedule history list
      const updatedHistory = await scheduleService.getAllSchedules();
      setScheduleHistory(updatedHistory);

      console.log('Schedule published successfully');
    } catch (error) {
      console.error('Error publishing schedule:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Handle double-tap to edit schedule name
  const handleScheduleNameClick = () => {
    if (isCreatingNew || !schedule) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms

    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Double tap detected
      setIsEditingName(true);
      setEditedName(schedule.name || "");
    }

    setLastTapTime(now);
  };

  // Handle schedule name update
  const handleScheduleNameUpdate = async () => {
    if (!schedule || !scheduleId || scheduleId === 'new') return;

    const trimmedName = editedName.trim();
    if (!trimmedName || trimmedName === schedule.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const updatedSchedule = await scheduleService.updateSchedule(scheduleId, { name: trimmedName });
      const enrichedSchedule = enrichSchedule(updatedSchedule, employees);
      loadSchedule(enrichedSchedule);

      // Refresh the schedule history list
      const updatedHistory = await scheduleService.getAllSchedules();
      setScheduleHistory(updatedHistory);
    } catch (error) {
      console.error('Error updating schedule name:', error);
      alert('Failed to update schedule name. Please try again.');
    } finally {
      setIsEditingName(false);
    }
  };

  // Handle Enter key press
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScheduleNameUpdate();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  // Calculate projected sales from forecast data
  const salesForecastData = useMemo(() => {
    if (!forecast?.weeklyPattern) return undefined;

    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const dailyProjectedSales: Record<string, number> = {};
    let totalProjectedSales = 0;

    daysOfWeek.forEach(dayName => {
      const dayData = forecast.weeklyPattern[dayName] || {};
      const dailyForecast = Object.values(dayData).reduce((sum, sales) => sum + sales, 0);
      dailyProjectedSales[dayName] = dailyForecast;
      totalProjectedSales += dailyForecast;
    });

    return {
      totalProjectedSales,
      dailyProjectedSales
    };
  }, [forecast]);

  const isDraft = schedule?.status === "DRAFT";

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <Input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleScheduleNameUpdate}
                className="h-auto text-2xl font-semibold py-1 px-2 max-w-md"
              />
            ) : (
              <h2
                className={`text-neutral-900 ${!isCreatingNew && schedule ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                onClick={handleScheduleNameClick}
                title={!isCreatingNew && schedule ? "Double-tap to edit" : ""}
              >
                {isCreatingNew ? "Schedule Creator" : schedule?.name || "Schedule"}
              </h2>
            )}
            {!isCreatingNew && schedule && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                  schedule.status === "DRAFT"
                    ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                    : schedule.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-gray-100 text-gray-800 border border-gray-300"
                }`}
              >
                {schedule.status === "DRAFT" && "Draft"}
                {schedule.status === "PUBLISHED" && "Published"}
                {schedule.status === "ARCHIVED" && "Archived"}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCreatingNew && isDraft && (
            <Button
              className="gap-2"
              onClick={handlePublishSchedule}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />Publishing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />Save & Publish
                </>
              )}
            </Button>
          )}
          {!isCreatingNew && schedule && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowReplaceConfirm(true)}
            >
              Replace Schedule
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
        <ScheduleViewer
          schedule={schedule}
          employees={employees}
          salesForecastData={salesForecastData}
          onScheduleUpdate={async () => {
            // Reload the schedule after update
            if (scheduleId && scheduleId !== 'new') {
              try {
                const updatedSchedule = await scheduleService.getScheduleById(scheduleId);
                const enrichedSchedule = enrichSchedule(updatedSchedule, employees);
                loadSchedule(enrichedSchedule);
              } catch (error) {
                console.error('Error reloading schedule:', error);
              }
            }
          }}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-neutral-500">Loading schedule...</p>
        </div>
      )}

      {/* Replace Schedule Confirmation Dialog */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Replace Existing Schedule?
            </h3>
            <p className="text-gray-600 mb-6">
              Creating a new schedule for this date range will permanently delete the existing schedule. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowReplaceConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReplaceSchedule}
                className="bg-red-600 hover:bg-red-700"
              >
                Replace Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}