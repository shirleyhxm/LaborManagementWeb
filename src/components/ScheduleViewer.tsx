import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Clock, Users, DollarSign, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Calendar, List, TrendingUp, Download, ChevronLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { useBusiness } from "../contexts/BusinessContext";
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

const HOURS_IN_DAY = 24;

// "HH:MM" (or "HH:MM:SS") -> fractional hours since midnight.
const parseTimeToHours = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
};

// Midnight-ending shifts come back as "00:00", which would otherwise position
// the block at hour 0 and give it a negative width.
const parseEndTimeToHours = (time: string): number => {
  const hours = parseTimeToHours(time);
  return hours === 0 ? HOURS_IN_DAY : hours;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Employee | timeline | day total | week total. Every column except the
// timeline is squeezed to what its content actually needs, so the leftover
// width (1fr) that shift blocks are drawn in is as large as possible.
//
// On a phone the fixed columns are the problem: at 390px they claim 206px of
// ~360px and leave the timeline too narrow to read. Below `sm` the name column
// gives up ~30px and the two total columns shrink to what "40h"/"$800" need at
// their smaller type, roughly doubling the timeline's share.
const dayGridClass =
  "grid grid-cols-[minmax(72px,86px)_1fr_30px_40px] sm:grid-cols-[minmax(88px,116px)_1fr_38px_52px] items-center";

// Shift text is what makes a block readable, so the timeline is scaled to the
// hours the day actually uses rather than a fixed midnight-to-midnight span.
// A 1h shift is 1/24 of a 24h track (unreadable at any window size) but 1/10
// of a 10h working day - the same block, several times wider. Padded out to
// whole hours so the axis still reads as clock time.
const DEFAULT_WINDOW: [number, number] = [8, 20];
const MIN_WINDOW_HOURS = 6;

const getDayWindow = (shifts: Shift[]): [number, number] => {
  if (shifts.length === 0) return DEFAULT_WINDOW;

  let start = Math.floor(Math.min(...shifts.map(s => parseTimeToHours(s.startTime))));
  let end = Math.ceil(Math.max(...shifts.map(s => parseEndTimeToHours(s.endTime))));

  // Keep a floor on the span so a single short shift doesn't blow up to fill
  // the whole row, which would misrepresent it as a full day of work.
  if (end - start < MIN_WINDOW_HOURS) {
    const pad = (MIN_WINDOW_HOURS - (end - start)) / 2;
    start = Math.max(0, Math.floor(start - pad));
    end = Math.min(HOURS_IN_DAY, Math.ceil(start + MIN_WINDOW_HOURS));
    start = Math.max(0, end - MIN_WINDOW_HOURS);
  }
  return [start, end];
};

const formatHourLabel = (hour: number): string => {
  const h = hour % HOURS_IN_DAY;
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
};

// "14:00" -> "2p", "14:30" -> "2:30p". Roughly half the width of 24h clock
// time, which is what lets short blocks keep a readable label. Minutes are
// only shown when a shift doesn't start or end on the hour.
const formatShiftTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 || hours === 24 ? 'a' : 'p';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes ? `${h12}:${String(minutes).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
};

// Hours read as whole numbers unless a fraction is actually present, so the
// common "8h" case doesn't pay for a redundant ".0".
const formatHours = (hours: number): string =>
  Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;

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
  const { currentBusiness } = useBusiness();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'schedule' | 'list'>('schedule');
  const [draggedShift, setDraggedShift] = useState<{shift: Shift; fromEmployeeId: string; fromDay: string} | null>(null);
  const [dropTarget, setDropTarget] = useState<{employeeId: string; day: string} | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  // A reassign takes as long as the backend needs to re-derive overtime across the
  // whole schedule — well over a second on a full week. Until the reload lands the
  // grid still shows the *pre-move* shifts, so a second drag would re-send a shift id
  // the backend has already retired and 404 even though the first move succeeded.
  // The ref is the guard (it blocks the next drop synchronously, before React can
  // re-render); the state drives the busy styling.
  const modifyInFlight = useRef(false);
  const [isModifying, setIsModifying] = useState(false);

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

  // Reset to Monday when paging to a different week
  useEffect(() => {
    setSelectedDayIndex(0);
  }, [currentWeekIndex, schedule.id]);

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
    const dayShiftCounts: Record<string, number> = {};
    dayOfWeekMap.forEach(day => {
      dailyLaborCosts[day] = 0;
      dayShiftCounts[day] = 0;
    });

    shiftsInCurrentWeek.forEach(shift => {
      const dayOfWeek = shift.dayOfWeek || getDayOfWeekFromDate(shift.date);
      dailyLaborCosts[dayOfWeek] += shift.laborCost;
      dayShiftCounts[dayOfWeek] += 1;
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
      dailyEstimatedSales,
      dayShiftCounts
    };
  }, [schedule, employees, displayDates]);

  const { dayShiftCounts } = scheduleData;
  const selectedDay = dayOfWeekMap[selectedDayIndex];
  const selectedDate = displayDates[selectedDayIndex];
  const isSelectedDayInRange = isDateInScheduleRange(selectedDate);

  // One window for the whole day, not per row - every employee's blocks share
  // an axis, so equal-length shifts stay visually equal and can be compared
  // down the column.
  const [windowStart, windowEnd] = useMemo(() => {
    const shiftsToday = Object.values(scheduleData.shiftsByEmployeeAndDay)
      .flatMap(byDay => byDay[selectedDay] || []);
    return getDayWindow(shiftsToday);
  }, [scheduleData.shiftsByEmployeeAndDay, selectedDay]);

  const windowHours = windowEnd - windowStart;
  // Fractional position of a clock time within the visible window.
  const toPct = (hour: number) => ((hour - windowStart) / windowHours) * 100;

  // Track width in pixels, so gaps expressed in hours can be turned into the
  // pixel budget a label is allowed to overflow into. Measured from the live
  // element and kept current on resize.
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, selectedDayIndex]);

  const pxPerHour = windowHours > 0 ? trackWidth / windowHours : 0;

  // Hour labels are thinned to whatever the measured track can actually hold.
  // A count of hours alone isn't enough: the same 12h window is comfortable at
  // every 2h on a desktop track and collides at every 2h on a phone, where the
  // whole track is narrower than the labels' combined width. "12p" plus
  // breathing room needs ~28px, so the step is the smallest one that clears it.
  const HOUR_LABEL_PX = 28;
  const hourStep = useMemo(() => {
    if (pxPerHour === 0) return windowHours > 16 ? 3 : windowHours > 9 ? 2 : 1;
    return [1, 2, 3, 4, 6].find((step) => step * pxPerHour >= HOUR_LABEL_PX) ?? 6;
  }, [pxPerHour, windowHours]);

  // For each shift, how much empty room sits either side of it. A label may
  // spill into that room but no further, so adjacent shifts' labels never
  // overlap each other.
  const buildShiftsWithGaps = (dayShifts: Shift[]) => {
    const ordered = [...dayShifts].sort(
      (a, b) => parseTimeToHours(a.startTime) - parseTimeToHours(b.startTime)
    );
    return ordered.map((shift, i) => {
      const start = parseTimeToHours(shift.startTime);
      const end = parseEndTimeToHours(shift.endTime);
      const prevEnd = i > 0 ? parseEndTimeToHours(ordered[i - 1].endTime) : windowStart;
      const nextStart = i < ordered.length - 1
        ? parseTimeToHours(ordered[i + 1].startTime)
        : windowEnd;
      // Split each gap between the two blocks that share it, and leave a small
      // gutter so labels stay visually separated.
      const GUTTER_PX = 3;
      const toGapPx = (hours: number) =>
        Math.max(0, (Math.max(0, hours) * pxPerHour) / 2 - GUTTER_PX);
      // The label stays centered on its block, so it can only borrow the same
      // amount on both sides - an uneven pair would drag the text off-center.
      const overhang = Math.min(toGapPx(start - prevEnd), toGapPx(nextStart - end));
      // "10a–12p" needs roughly this much room; the start time alone ("10a")
      // needs far less. On a phone track the full range rarely fits, and an
      // empty block reads as an unfilled slot rather than a short shift — so
      // fall back to the start time before giving up on a label entirely.
      // Below even that, the tooltip still carries the full detail.
      const RANGE_WIDTH_PX = 52;
      const START_WIDTH_PX = 24;
      const available = (end - start) * pxPerHour + overhang * 2;
      const label =
        pxPerHour === 0 || available >= RANGE_WIDTH_PX
          ? 'range'
          : available >= START_WIDTH_PX
            ? 'start'
            : 'none';
      return { shift, overhang, label };
    });
  };

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
    // Only allow dragging for draft schedules, and not while a reassign is still
    // saving — the shift ids on screen are only trustworthy once the reload lands.
    if (schedule.status !== 'DRAFT' || modifyInFlight.current) {
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

    // Drop while a previous reassign is still in flight: the ids on screen may already
    // be stale, so sending one would fail against a shift the backend has replaced.
    if (modifyInFlight.current) {
      setDraggedShift(null);
      setDropTarget(null);
      setIsDraggingOver(false);
      return;
    }

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
      if (!currentBusiness) return;

      modifyInFlight.current = true;
      setIsModifying(true);

      // Call backend API to modify shift
      const { scheduleService } = await import('../services/scheduleService');
      await scheduleService.modifyShift(
        currentBusiness.id,
        schedule.id,
        draggedShift.shift.id,
        newEmployeeId,
        undefined, // dayOfWeek stays the same
        undefined, // startTime stays the same
        undefined, // endTime stays the same
        'User'
      );

      // Reload the schedule to get updated data. The move itself has already been
      // committed by this point, so a failure here is a stale-grid problem rather
      // than a failed reassign, and has to be reported as such.
      if (onScheduleUpdate) {
        try {
          await onScheduleUpdate();
        } catch {
          alert(
            'Shift moved, but the schedule could not be refreshed. ' +
            'Reload the page before making further changes.'
          );
          return;
        }
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
      // Cleared only after the reload above has replaced the grid's shift ids, so the
      // next drag can't pick up an id this move retired.
      modifyInFlight.current = false;
      setIsModifying(false);
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
    const headers = ['Employee', 'Date', 'Day', 'Start Time', 'End Time', 'Duration (Hours)', 'Shift Type', 'Wage Cost'];

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

    // Employer on-costs (e.g. Employer NI) apply per employee per week, not
    // per shift, so they're summarized as trailing totals rather than a
    // per-row column that would misleadingly imply a per-shift allocation.
    const summaryRows = schedule.metrics.totalEmployerOnCost > 0 ? [
      [],
      ['', '', '', '', '', '', 'Total Wage Cost', schedule.metrics.totalLaborCost.toFixed(2)],
      ['', '', '', '', '', '', 'Employer On-Costs', schedule.metrics.totalEmployerOnCost.toFixed(2)],
      ['', '', '', '', '', '', 'True Labor Cost', (schedule.metrics.totalLaborCost + schedule.metrics.totalEmployerOnCost).toFixed(2)]
    ] : [];

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
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
    <div className="space-y-4">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Wage Cost */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Wage Cost</p>
              <p className="text-xl font-bold text-neutral-900">
                ${schedule.metrics.totalLaborCost.toFixed(0)}
              </p>
              {schedule.metrics.totalEmployerOnCost > 0 && (
                <p className="text-xs text-neutral-500">
                  +${schedule.metrics.totalEmployerOnCost.toFixed(0)} employer on-costs
                  {" "}(${(schedule.metrics.totalLaborCost + schedule.metrics.totalEmployerOnCost).toFixed(0)} true cost)
                </p>
              )}
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
              <p className="text-xl font-bold text-neutral-900">
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
              <p className="text-xl font-bold text-neutral-900">
                {scheduleData.scheduledEmployees.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Labor Cost % of Sales */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Labor Cost % of Sales</p>
              <p className="text-xl font-bold text-neutral-900">
                {salesForecastData
                  ? ((schedule.metrics.totalLaborCost / salesForecastData.totalProjectedSales) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Schedule Table */}
      <Card className="p-4 gap-0">
        <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-lg font-semibold whitespace-nowrap">
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

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border bg-blue-50 border-blue-300" />
                <span className="text-neutral-600">Regular Shift</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border bg-purple-100 border-purple-600" />
                <span className="text-neutral-600">Overtime Shift</span>
              </div>
              {/* Reassigning takes long enough that without this the grid just looks
                  unresponsive, which is what prompts the re-drag this guard blocks. */}
              {isModifying && (
                <div className="flex items-center gap-1.5 text-blue-700">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving…</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        {viewMode === 'schedule' ? (
          // Day-by-day Schedule View
          <div>
            {/* Day selector. The seven days stay on one row at every width —
                wrapping them 5+2 reads as a break in the week rather than a
                reflow — so the tabs shrink instead, and the shift count drops
                to a bare number once there's no room for the word. */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-3 p-1 bg-neutral-100 rounded-lg">
              {dayOfWeekMap.map((day, index) => {
                const date = displayDates[index];
                const isInRange = isDateInScheduleRange(date);
                const isSelected = index === selectedDayIndex;
                const monthName = monthNames[date.getMonth()];
                const shiftCount = dayShiftCounts[day] || 0;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`min-w-0 px-0.5 sm:px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-sm border border-blue-300'
                        : isInRange
                          ? 'text-neutral-700 hover:bg-neutral-200 border border-transparent'
                          : 'text-neutral-400 hover:bg-neutral-200 border border-transparent'
                    }`}
                  >
                    <div>{days[index]}</div>
                    <div className={`text-[11px] sm:text-xs font-normal whitespace-nowrap ${
                      isSelected ? 'text-blue-600' : 'text-neutral-500'
                    }`}>
                      {/* "Aug 24" doesn't fit a phone-width tab; the month is
                          already in the week header above, so only the date
                          survives the squeeze. */}
                      <span className="hidden sm:inline">{monthName} </span>
                      {date.getDate()}
                    </div>
                    <div className={`text-[10px] sm:text-[11px] font-normal whitespace-nowrap ${
                      isSelected ? 'text-blue-600' : 'text-neutral-400'
                    }`}>
                      {isInRange ? (
                        <>
                          {shiftCount}
                          <span className="hidden sm:inline">
                            {` shift${shiftCount !== 1 ? 's' : ''}`}
                          </span>
                        </>
                      ) : (
                        <span title="Out of range">
                          <span className="hidden sm:inline">Out of range</span>
                          <span className="sm:hidden">—</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          <div>
            <div>
              {/* Header Row */}
              <div className={dayGridClass}>
                <div className="text-left px-2 py-2 text-xs font-medium text-neutral-700 bg-neutral-50">
                  Employee
                </div>
                {/* Hour ruler, spanning only the window in use */}
                <div className="bg-neutral-50 px-2 py-2">
                  <div className="relative h-4">
                    {Array.from({ length: windowHours + 1 }, (_, i) => windowStart + i)
                      .filter((hour) => {
                        // The closing tick is worth keeping — it's the only one
                        // that names when the day ends — but only when the last
                        // stepped tick isn't already sitting on top of it.
                        if (hour === windowEnd) {
                          const lastStepped =
                            windowStart + Math.floor(windowHours / hourStep) * hourStep;
                          return (windowEnd - lastStepped) * pxPerHour >= HOUR_LABEL_PX;
                        }
                        return (hour - windowStart) % hourStep === 0;
                      })
                      .map((hour) => (
                        <div
                          key={hour}
                          className="absolute top-0"
                          style={{
                            left: `${toPct(hour)}%`,
                            // Edge ticks would overhang the track, so anchor
                            // the first from its left and the last from its right.
                            transform: hour === windowEnd
                              ? 'translateX(-100%)'
                              : hour === windowStart
                                ? 'translateX(0)'
                                : 'translateX(-50%)',
                          }}
                        >
                          <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                            {formatHourLabel(hour)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="text-center px-1 py-2 text-xs font-medium text-neutral-700 bg-neutral-50">
                  Day
                </div>
                <div className="text-center px-1 py-2 text-xs font-medium text-neutral-700 bg-neutral-50">
                  Week
                </div>
              </div>

              {/* Body Rows */}
              <div>
                {/* Scheduled Employees */}
                {scheduleData.scheduledEmployees.map((employee, rowIndex) => {
                  const employeeShifts = scheduleData.shiftsByEmployeeAndDay[employee.id] || {};

                  // Weekly totals stay across the whole displayed week, independent
                  // of which day tab is selected.
                  const allEmployeeShifts = Object.values(employeeShifts).flat();
                  const totalHours = allEmployeeShifts.reduce((sum, shift) => sum + shift.durationHours, 0);
                  const totalPay = allEmployeeShifts.reduce((sum, shift) => sum + shift.laborCost, 0);

                  const shifts = employeeShifts[selectedDay] || [];
                  const dayHours = shifts.reduce((sum, shift) => sum + shift.durationHours, 0);
                  const shiftsWithGaps = buildShiftsWithGaps(shifts);

                  const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === selectedDay;
                  const isDraft = schedule.status === 'DRAFT';
                  const showPreview = isDropZone && draggedShift && isDraggingOver;

                  return (
                    <div key={employee.id} className={`${dayGridClass} hover:bg-neutral-50 border-b border-neutral-100`}>
                      <div className="px-2 py-2 min-w-0">
                        <p className="text-xs font-medium truncate" title={employee.fullName}>
                          {employee.fullName}
                        </p>
                        <p className="text-[10px] text-neutral-500">${employee.normalPayRate}/hr</p>
                        {employee.groups && employee.groups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {employee.groups.map((group, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-neutral-50 border-neutral-300 text-neutral-600"
                              >
                                {group}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timeline for the selected day - no track chrome, just
                          the blocks themselves against the row background. */}
                      <div
                        className={`px-2 py-1.5 transition-colors ${
                          isDropZone && isSelectedDayInRange
                            ? isDraggingOver
                              ? 'bg-green-50'
                              : 'bg-red-50'
                            : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, employee.id, selectedDay)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, employee.id, selectedDay)}
                      >
                        <div className="relative h-8" ref={rowIndex === 0 ? trackRef : undefined}>
                          {isSelectedDayInRange && shiftsWithGaps.map(({ shift, overhang, label }) => {
                            const isBeingDragged = draggedShift?.shift.id === shift.id;
                            const startHour = parseTimeToHours(shift.startTime);
                            const endHour = parseEndTimeToHours(shift.endTime);

                            return (
                              <div
                                key={shift.id}
                                title={`${shift.startTime} - ${shift.endTime} (${shift.durationHours.toFixed(1)}h)${shift.isOvertime ? ' • Overtime' : ''}`}
                                className={`absolute inset-y-0 rounded border flex items-center justify-center transition-all ${
                                  isDraft ? (isModifying ? 'cursor-wait' : 'cursor-move') : ''
                                } ${isBeingDragged || isModifying ? 'opacity-50' : 'opacity-100'} ${
                                  shift.isOvertime
                                    ? 'bg-purple-100 border-purple-600 hover:bg-purple-200'
                                    : 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                                }`}
                                style={{
                                  left: `${toPct(startHour)}%`,
                                  width: `${((endHour - startHour) / windowHours) * 100}%`,
                                }}
                                draggable={isDraft && !isModifying}
                                onDragStart={(e) => handleDragStart(e, shift, employee.id, selectedDay)}
                                onDragEnd={handleDragEnd}
                              >
                                {/* A short block's label overflows equally into the
                                    empty time on either side rather than being
                                    clipped - bounded by the real gap to the next
                                    shift, so neighbouring labels never collide. */}
                                {label !== 'none' && (
                                  <span
                                    className="text-[11px] leading-none text-neutral-700 font-medium whitespace-nowrap pointer-events-none"
                                    style={{ marginLeft: `-${overhang}px`, marginRight: `-${overhang}px` }}
                                  >
                                    {label === 'range'
                                      ? `${formatShiftTime(shift.startTime)}–${formatShiftTime(shift.endTime)}`
                                      : formatShiftTime(shift.startTime)}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {showPreview && isSelectedDayInRange && draggedShift && (() => {
                            const startHour = parseTimeToHours(draggedShift.shift.startTime);
                            const endHour = parseEndTimeToHours(draggedShift.shift.endTime);
                            return (
                              <div
                                className="absolute inset-y-0 rounded border border-dashed border-green-500 bg-green-200 opacity-75 flex items-center justify-center"
                                style={{
                                  left: `${toPct(startHour)}%`,
                                  width: `${((endHour - startHour) / windowHours) * 100}%`,
                                }}
                              >
                                <span className="text-[11px] leading-none text-neutral-700 font-medium whitespace-nowrap pointer-events-none">
                                  {formatShiftTime(draggedShift.shift.startTime)}–{formatShiftTime(draggedShift.shift.endTime)}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Daily total */}
                      <div className="px-1 py-2 text-center">
                        {isSelectedDayInRange && dayHours > 0 ? (
                          <div className="text-xs font-medium text-neutral-900">
                            {formatHours(dayHours)}
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-300">—</div>
                        )}
                      </div>

                      {/* Weekly total */}
                      <div className="px-1 py-2 text-center">
                        <div className="text-xs font-medium text-neutral-900">
                          {formatHours(totalHours)}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          ${totalPay.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Divider between scheduled and unscheduled employees */}
                {scheduleData.scheduledEmployees.length > 0 && scheduleData.unscheduledEmployees.length > 0 && (
                  <div className="border-t-2 border-dashed border-neutral-300" />
                )}

                {/* Unscheduled Employees */}
                {scheduleData.unscheduledEmployees.map((employee) => {
                  const isDropZone = dropTarget?.employeeId === employee.id && dropTarget?.day === selectedDay;
                  const showPreview = isDropZone && draggedShift && isDraggingOver;

                  return (
                    <div key={employee.id} className={`${dayGridClass} hover:bg-neutral-50 opacity-60 border-b border-neutral-100`}>
                      <div className="px-2 py-2 min-w-0">
                        <p className="text-xs font-medium text-neutral-500 truncate" title={employee.fullName}>
                          {employee.fullName}
                        </p>
                        <p className="text-[10px] text-neutral-400">${employee.normalPayRate}/hr</p>
                        {employee.groups && employee.groups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {employee.groups.map((group, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-neutral-50 border-neutral-300 text-neutral-500"
                              >
                                {group}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className={`px-2 py-1.5 transition-colors ${
                          isDropZone && isSelectedDayInRange
                            ? isDraggingOver
                              ? 'bg-green-50'
                              : 'bg-red-50'
                            : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, employee.id, selectedDay)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, employee.id, selectedDay)}
                      >
                        <div className="relative h-8">
                          {showPreview && isSelectedDayInRange && draggedShift && (() => {
                            const startHour = parseTimeToHours(draggedShift.shift.startTime);
                            const endHour = parseEndTimeToHours(draggedShift.shift.endTime);
                            return (
                              <div
                                className="absolute inset-y-0 rounded border border-dashed border-green-500 bg-green-200 opacity-75 flex items-center justify-center"
                                style={{
                                  left: `${toPct(startHour)}%`,
                                  width: `${((endHour - startHour) / windowHours) * 100}%`,
                                }}
                              >
                                <span className="text-[11px] leading-none text-neutral-700 font-medium whitespace-nowrap pointer-events-none">
                                  {formatShiftTime(draggedShift.shift.startTime)}–{formatShiftTime(draggedShift.shift.endTime)}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="px-1 py-2 text-center">
                        <div className="text-xs text-neutral-300">—</div>
                      </div>
                      <div className="px-1 py-2 text-center">
                        <div className="text-xs text-neutral-300">—</div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Drag-and-drop hint. Only shown on drafts, where the shift blocks are
              actually draggable — on a published schedule handleDragStart bails
              out, so advertising it there would just be a promise the grid
              doesn't keep. */}
          {schedule.status === 'DRAFT' && schedule.shifts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <p className="text-xs text-neutral-500">
                💡 Tip: Drag a shift onto another employee's row to reassign it — same day
                only; drops onto unavailable or double-booked employees are refused.
              </p>
            </div>
          )}
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