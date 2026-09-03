import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar, Clock, User, ArrowLeftRight, AlertCircle, Loader2, ChevronLeft, ChevronRight, LogIn, LogOut, MapPin, TrendingUp, Download, FileText } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { employeeService } from "../services/employeeService";
import { scheduleService } from "../services/scheduleService";
import { swapService } from "../services/swapService";
import { timeoffService } from "../services/timeoffService";
import { attendanceService } from "../services/attendanceService";
import { contractService } from "../services/contractService";
import { useAuth } from "../contexts/AuthContext";
import { useFormatters } from "../hooks/useFormatters";
import { useTranslation } from "react-i18next";
import { UserRole } from "../types/auth";
import type { Employee } from "../types/employee";
import type { EmployeeShift, Shift } from "../types/scheduling";
import type { TeamShift, SwapRequest, SwapRequestsListResponse, SwapRequestStatus } from "../types/swap";
import type { TimeoffRequest } from "../types/timeoff";
import type { ClockRecord, AttendanceStats } from "../types/attendance";
import { formatFileSize, type EmployeeContract } from "../types/contract";
import {
  daysOfWeek,
  backendToUIAvailability,
  uiToBackendAvailability,
} from "../utils/availability";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO } from "date-fns";

const portalTabs = ["schedule", "attendance", "timeoff", "swaps", "availability", "contracts"];
const defaultPortalTab = portalTabs[0];

const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const toMinutes = (time: string) => {
  const [hourStr, minuteStr] = time.split(':');
  return parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);
};

const swapStatusLabel = (status: SwapRequestStatus): string => {
  if (status === "PENDING_APPROVAL") return "awaiting admin approval";
  return status.toLowerCase();
};

const swapStatusBadgeClass = (status: SwapRequestStatus): string => {
  switch (status) {
    case "APPROVED":
      return "text-green-700 bg-green-50 border-green-300";
    case "PENDING_APPROVAL":
      return "text-blue-700 bg-blue-50 border-blue-300";
    case "DENIED":
    case "DECLINED":
    case "CANCELLED":
      return "text-neutral-500 bg-neutral-50 border-neutral-300";
    default:
      return "text-amber-700 bg-amber-50 border-amber-300";
  }
};

/**
 * Shades used to tell an employee's locations apart on the calendar.
 *
 * The location being viewed always takes the first (darkest) shade; the rest
 * are handed out in a stable order so a given location keeps its colour as you
 * move between weeks. Shades of one hue rather than distinct colours, since
 * these are all the same kind of thing - the employee's own shifts - and only
 * the place differs.
 *
 * Wraps if someone works at more than the palette holds, which beats running
 * out of colours entirely; the legend still names every location.
 */
const LOCATION_SHADES = [
  { block: 'bg-blue-600 text-white', swatch: 'bg-blue-600' },
  { block: 'bg-blue-400 text-white', swatch: 'bg-blue-400' },
  { block: 'bg-blue-300 text-blue-950', swatch: 'bg-blue-300' },
  { block: 'bg-blue-200 text-blue-950', swatch: 'bg-blue-200' },
];

const shadeFor = (index: number) => LOCATION_SHADES[index % LOCATION_SHADES.length];

// Groups shifts by employee, one row per employee, sorted so the logged-in
// employee's own row always appears first.
const groupByEmployee = (shifts: TeamShift[]): { employeeId: string; employeeName: string; isMine: boolean; shifts: TeamShift[] }[] => {
  const groups = new Map<string, { employeeId: string; employeeName: string; isMine: boolean; shifts: TeamShift[] }>();
  shifts.forEach(shift => {
    const existing = groups.get(shift.employeeId);
    if (existing) {
      existing.shifts.push(shift);
    } else {
      groups.set(shift.employeeId, {
        employeeId: shift.employeeId,
        employeeName: shift.employeeName,
        isMine: shift.isMine,
        shifts: [shift],
      });
    }
  });
  return Array.from(groups.values()).sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    return a.employeeName.localeCompare(b.employeeName);
  });
};

export function EmployeePortal() {
  const { user } = useAuth();
  const {
    formatDateShortWeekday,
    formatDateMedium,
    formatTime,
    formatCurrency,
    formatClockTimeCompact,
    formatHourLabel,
    formatDateRange,
    formatDate,
  } = useFormatters();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Keep the selected tab in the URL so a refresh (or a shared link) lands on the same tab.
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && portalTabs.includes(tabParam) ? tabParam : defaultPortalTab;

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initialize with empty availability
  const [availability, setAvailability] = useState<Record<string, number[]>>({});
  // Mirrors the last-saved (or last-loaded) availability so the Save button
  // can tell whether there are unsaved edits worth submitting.
  const [savedAvailability, setSavedAvailability] = useState<Record<string, number[]>>({});
  const hasUnsavedAvailabilityChanges = JSON.stringify(availability) !== JSON.stringify(savedAvailability);

  const [teamShifts, setTeamShifts] = useState<TeamShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const [swapTargetShift, setSwapTargetShift] = useState<TeamShift | null>(null);
  const [swapMessage, setSwapMessage] = useState("");
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const [swapRequests, setSwapRequests] = useState<SwapRequestsListResponse>({ incoming: [], outgoing: [] });
  const [swapRequestsLoading, setSwapRequestsLoading] = useState(true);
  const [swapActionId, setSwapActionId] = useState<string | null>(null);
  const [swapActionStatus, setSwapActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [timeoffRequests, setTimeoffRequests] = useState<TimeoffRequest[]>([]);
  const [timeoffLoading, setTimeoffLoading] = useState(true);
  const [timeoffDialogOpen, setTimeoffDialogOpen] = useState(false);
  const [timeoffStartDate, setTimeoffStartDate] = useState("");
  const [timeoffEndDate, setTimeoffEndDate] = useState("");
  const [timeoffReason, setTimeoffReason] = useState("");
  const [timeoffSubmitting, setTimeoffSubmitting] = useState(false);
  const [timeoffError, setTimeoffError] = useState<string | null>(null);
  const [timeoffActionId, setTimeoffActionId] = useState<string | null>(null);
  const [timeoffStatus, setTimeoffStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [activeClockRecord, setActiveClockRecord] = useState<ClockRecord | null>(null);
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([]);
  const [clockLoading, setClockLoading] = useState(true);
  const [clockActionInFlight, setClockActionInFlight] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);
  // Open when someone who works at several locations clocks in, so they say
  // which one rather than having it guessed from their next shift.
  const [isClockInLocationOpen, setIsClockInLocationOpen] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);

  const toggleHour = (day: string, hour: number) => {
      setAvailability(prev => {
          const dayHours = prev[day] || [];
          const isAvailable = dayHours.includes(hour);

          return {
              ...prev,
              [day]: isAvailable
                  ? dayHours.filter(h => h !== hour)
                  : [...dayHours, hour].sort((a, b) => a - b)
          };
      });
  };

  const setHourAvailable = (day: string, hour: number, available: boolean) => {
      setAvailability(prev => {
          const dayHours = prev[day] || [];
          const isAvailable = dayHours.includes(hour);
          if (isAvailable === available) return prev;

          return {
              ...prev,
              [day]: available
                  ? [...dayHours, hour].sort((a, b) => a - b)
                  : dayHours.filter(h => h !== hour)
          };
      });
  };

  // Click-and-drag selection: mousedown on a cell decides whether the drag
  // paints cells available or unavailable (the opposite of that cell's
  // current state), then every cell the pointer enters while the mouse
  // button is held gets set to match - lets one drag sweep a whole range
  // instead of clicking each hour individually.
  const dragModeRef = useRef<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleHourMouseDown = (day: string, hour: number) => {
      const dayHours = availability[day] || [];
      const nextAvailable = !dayHours.includes(hour);
      dragModeRef.current = nextAvailable;
      setIsDragging(true);
      setHourAvailable(day, hour, nextAvailable);
  };

  const handleHourMouseEnter = (day: string, hour: number) => {
      if (!isDragging || dragModeRef.current === null) return;
      setHourAvailable(day, hour, dragModeRef.current);
  };

  useEffect(() => {
      if (!isDragging) return;
      const endDrag = () => {
          setIsDragging(false);
          dragModeRef.current = null;
      };
      window.addEventListener('mouseup', endDrag);
      return () => window.removeEventListener('mouseup', endDrag);
  }, [isDragging]);

  const formatHour = (hour: number) => formatHourLabel(hour);

  const handleSaveAvailability = async () => {
    if (!businessId || !employee) return;

    setSaving(true);
    setAvailabilityStatus(null);
    try {
      const backendAvailability = uiToBackendAvailability(availability);
      await employeeService.updateEmployee(businessId, employee.id, {
        availability: backendAvailability,
      });

      // Refresh employee data
      const updatedEmployee = await employeeService.getEmployeeById(businessId, employee.id);
      setEmployee(updatedEmployee);
      setSavedAvailability(backendToUIAvailability(updatedEmployee.availability));
      setAvailabilityStatus({ type: "success", message: "Availability saved successfully!" });
      setTimeout(() => setAvailabilityStatus(null), 4000);
    } catch (err) {
      console.error('Failed to save availability:', err);
      setAvailabilityStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save availability. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchMyEmployeeData = async () => {
      try {
        setLoading(true);
        setError(null);
        const emp = await employeeService.getMyEmployee();

        if (emp) {
          setEmployee(emp);
          setBusinessId(emp.businessId);
          // Every other call sends this as X-Business-Id. An employee has no
          // business switcher, so if it is left pointing at somewhere they
          // cannot reach - a leftover from another session on this browser -
          // the portal stays broken with no way back.
          localStorage.setItem('current_business_id', emp.businessId);
          const loadedAvailability = backendToUIAvailability(emp.availability);
          setAvailability(loadedAvailability);
          setSavedAvailability(loadedAvailability);
        } else if (user?.role !== UserRole.ADMIN) {
          setError(new Error("No employee record is linked to your account yet. Contact your business admin."));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load employee data"));
      } finally {
        setLoading(false);
      }
    };

    fetchMyEmployeeData();
  }, [user]);

  // Team-wide shifts for the currently browsed calendar week - includes
  // coworkers' shifts (payRate redacted server-side) so an employee can see
  // who else is working, needed to make shift-swap requests possible.
  useEffect(() => {
    if (!businessId || !employee) {
      setShiftsLoading(false);
      return;
    }

    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });

    const fetchTeamShifts = async () => {
      try {
        setShiftsLoading(true);
        const shifts = await swapService.getTeamShifts(
          businessId,
          format(selectedWeekStart, 'yyyy-MM-dd'),
          format(weekEnd, 'yyyy-MM-dd'),
          "PUBLISHED"
        );
        setTeamShifts(shifts);
      } catch (err) {
        console.error('Failed to load team shifts:', err);
        setTeamShifts([]);
      } finally {
        setShiftsLoading(false);
      }
    };

    fetchTeamShifts();
  }, [businessId, employee, selectedWeekStart]);

  // The caller's own shifts at *other* locations for the browsed week. Kept
  // separate from teamShifts, which is this location's roster and exists for
  // shift swaps - a shift somewhere else has no team here to swap with, but
  // the employee still needs to see it on their week.
  const [otherLocationShifts, setOtherLocationShifts] = useState<EmployeeShift[]>([]);
  // Taken from the same response rather than fetched separately - an employee
  // has no businesses of their own to look it up from.
  // Null until a shift, clock record or request tells us the name. Nothing
  // renders a placeholder for it - a location is named or not shown at all.
  const [currentBusinessName, setCurrentBusinessName] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId || !employee) return;

    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });

    scheduleService.getMyShiftsAcrossLocations(
      businessId,
      employee.id,
      format(selectedWeekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd'),
      "PUBLISHED"
    )
      .then(shifts => {
        setOtherLocationShifts(shifts.filter(s => s.businessId !== businessId));
        const here = shifts.find(s => s.businessId === businessId);
        if (here) setCurrentBusinessName(here.businessName);
      })
      .catch(err => {
        console.error('Failed to load shifts at other locations:', err);
        setOtherLocationShifts([]);
      });
  }, [businessId, employee, selectedWeekStart]);

  // Every location the employee works at this week, current one first, then
  // the rest alphabetically. Fixed for the whole week so a location keeps the
  // same shade on every day rather than changing colour day to day.
  const weekLocations = useMemo(() => {
    const others = Array.from(
      new Set(otherLocationShifts.map(s => s.businessName))
    ).sort();
    return [currentBusinessName, ...others];
  }, [otherLocationShifts, currentBusinessName]);

  const shadeForLocation = (businessName?: string) =>
    shadeFor(Math.max(0, weekLocations.indexOf(businessName ?? currentBusinessName)));

  // Whether this employee's attendance spans more than one location. Derived
  // from the records themselves rather than the browsed week's shifts, since
  // the history reaches back further than the calendar shows.
  //
  // The open session counts too: the first clock-in at a second location is
  // exactly when saying which one matters, and it may not be in the fetched
  // history yet.

  // Default the expanded row to today when the browsed week contains it,
  // otherwise fall back to Monday - re-evaluated every time the visible
  // week changes so switching weeks doesn't leave a stale day expanded.
  useEffect(() => {
    const today = new Date();
    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
    const containsToday = today >= selectedWeekStart && today <= weekEnd;
    setExpandedDay(format(containsToday ? today : selectedWeekStart, 'yyyy-MM-dd'));
  }, [selectedWeekStart]);

  const refetchSwapRequests = () => {
    if (!businessId) return;
    setSwapRequestsLoading(true);
    swapService.getMySwapRequests(businessId)
      .then(setSwapRequests)
      .catch(err => {
        console.error('Failed to load swap requests:', err);
        setSwapRequests({ incoming: [], outgoing: [] });
      })
      .finally(() => setSwapRequestsLoading(false));
  };

  useEffect(() => {
    if (!businessId || !employee) {
      setSwapRequestsLoading(false);
      return;
    }
    refetchSwapRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, employee]);

  const handleRequestSwap = async () => {
    if (!businessId || !swapTargetShift) return;

    setSwapSubmitting(true);
    setSwapError(null);
    try {
      await swapService.createSwapRequest(businessId, swapTargetShift.id, swapMessage || undefined);
      setSwapTargetShift(null);
      setSwapMessage("");
      refetchSwapRequests();
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Failed to send swap request");
    } finally {
      setSwapSubmitting(false);
    }
  };

  const handleSwapAction = async (id: string, action: "accept" | "decline" | "cancel") => {
    if (!businessId) return;
    setSwapActionId(id);
    setSwapActionStatus(null);
    try {
      if (action === "accept") await swapService.acceptSwapRequest(businessId, id);
      else if (action === "decline") await swapService.declineSwapRequest(businessId, id);
      else await swapService.cancelSwapRequest(businessId, id);
      refetchSwapRequests();
      const message = action === "accept"
        ? "Request accepted - sent to your admin/manager for approval."
        : action === "decline"
        ? "Request declined."
        : "Request cancelled.";
      setSwapActionStatus({ type: "success", message });
      setTimeout(() => setSwapActionStatus(null), 4000);
    } catch (err) {
      console.error(`Failed to ${action} swap request:`, err);
      setSwapActionStatus({
        type: "error",
        message: err instanceof Error ? err.message : `Failed to ${action} swap request`,
      });
    } finally {
      setSwapActionId(null);
    }
  };

  const refetchTimeoffRequests = () => {
    if (!businessId || !employee) return;
    setTimeoffLoading(true);
    timeoffService.getMyTimeoffRequests(businessId, employee.id)
      .then(requests => setTimeoffRequests([...requests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))))
      .catch(err => {
        console.error('Failed to load timeoff requests:', err);
        setTimeoffRequests([]);
      })
      .finally(() => setTimeoffLoading(false));
  };

  useEffect(() => {
    if (!businessId || !employee) {
      setTimeoffLoading(false);
      return;
    }
    refetchTimeoffRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, employee]);

  const handleSubmitTimeoff = async () => {
    if (!businessId || !employee || !timeoffStartDate || !timeoffEndDate) return;

    setTimeoffSubmitting(true);
    setTimeoffError(null);
    try {
      await timeoffService.submitTimeoffRequest(businessId, employee.id, timeoffStartDate, timeoffEndDate, timeoffReason);
      setTimeoffDialogOpen(false);
      setTimeoffStartDate("");
      setTimeoffEndDate("");
      setTimeoffReason("");
      refetchTimeoffRequests();
      setTimeoffStatus({ type: "success", message: t('portal.timeOffSubmitted') });
      setTimeout(() => setTimeoffStatus(null), 4000);
    } catch (err) {
      setTimeoffError(err instanceof Error ? err.message : t('portal.timeOffSubmitFailed'));
    } finally {
      setTimeoffSubmitting(false);
    }
  };

  const handleCancelTimeoff = async (id: string) => {
    if (!businessId || !employee) return;
    setTimeoffActionId(id);
    setTimeoffStatus(null);
    try {
      await timeoffService.cancelTimeoffRequest(businessId, id, employee.id);
      refetchTimeoffRequests();
      setTimeoffStatus({ type: "success", message: t('portal.timeOffCancelled') });
      setTimeout(() => setTimeoffStatus(null), 4000);
    } catch (err) {
      console.error('Failed to cancel timeoff request:', err);
      setTimeoffStatus({
        type: "error",
        message: err instanceof Error ? err.message : t('portal.timeOffCancelFailed'),
      });
    } finally {
      setTimeoffActionId(null);
    }
  };

  // Separately, shifts from today through 4 weeks out, for the "This Week" /
  // "Next Shift" stat cards - these always reflect today regardless of which
  // week is being browsed in the calendar below, and need a window wide
  // enough to find the next upcoming shift even if none falls in this
  // calendar week.
  // Across every location, not just the one being viewed: hours worked and
  // the next shift are facts about the person, so leaving out another
  // location's shifts would under-report both.
  const [upcomingShifts, setUpcomingShifts] = useState<EmployeeShift[]>([]);

  useEffect(() => {
    if (!businessId || !employee) return;

    const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lookaheadEnd = endOfWeek(addWeeks(todayWeekStart, 3), { weekStartsOn: 1 });

    scheduleService.getMyShiftsAcrossLocations(
      businessId,
      employee.id,
      format(todayWeekStart, 'yyyy-MM-dd'),
      format(lookaheadEnd, 'yyyy-MM-dd'),
      "PUBLISHED"
    )
      .then(setUpcomingShifts)
      .catch(err => {
        console.error('Failed to load upcoming shifts:', err);
        setUpcomingShifts([]);
      });
  }, [businessId, employee]);

  // Contract documents held for this employee. Read-only here - they are
  // uploaded and removed by their manager. Fetched from the self-service
  // endpoint, which resolves the employee from the token rather than the URL,
  // so this cannot be pointed at anyone else's paperwork.
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;

    let cancelled = false;
    setContractsLoading(true);

    contractService
      .getMyContracts()
      .then(result => {
        if (!cancelled) {
          setContracts(result.contracts ?? []);
          setContractsError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load contracts:', err);
          setContractsError(err instanceof Error ? err.message : 'Failed to load contracts');
        }
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee]);

  const handleDownloadContract = async (contract: EmployeeContract) => {
    setDownloadingContractId(contract.id);
    setContractsError(null);
    try {
      await contractService.downloadMyContract(contract.id, contract.fileName);
    } catch (err) {
      setContractsError(err instanceof Error ? err.message : 'Failed to download contract');
    } finally {
      setDownloadingContractId(null);
    }
  };

  /**
   * Whether this employee works at more than one location.
   *
   * Asked once and applied everywhere, rather than per feature: someone
   * assigned to two locations should see their records labelled from the
   * start, not only once they happen to have clocked in at both. Checking each
   * list separately meant a first clock-in showed no location at all, which
   * reads as missing data rather than "there is only one".
   *
   * Built from every signal the portal already has - shifts, clock records,
   * timeoff - because an employee cannot read the assignments endpoint, which
   * is owner-only. Any one of them naming a second location is proof enough.
   */
  const myLocations = useMemo(() => {
    const names = new Map<string, string>();

    // Home location first, so it heads the list when picking. Its name comes
    // from whichever source has it - the week's shifts may be empty, but a
    // clock record or timeoff request from here still carries it.
    const homeName =
      currentBusinessName ??
      [...upcomingShifts, ...clockRecords, ...timeoffRequests].find(
        x => x.businessId === businessId
      )?.businessName;
    if (businessId && homeName) names.set(businessId, homeName);

    // Only named locations are listed - an unnamed one would be unpickable in
    // any meaningful sense.
    const note = (id: string, name?: string | null) => {
      if (name && !names.has(id)) names.set(id, name);
    };
    upcomingShifts.forEach(s => note(s.businessId, s.businessName));
    otherLocationShifts.forEach(s => note(s.businessId, s.businessName));
    clockRecords.forEach(r => note(r.businessId, r.businessName));
    timeoffRequests.forEach(r => note(r.businessId, r.businessName));
    if (activeClockRecord) note(activeClockRecord.businessId, activeClockRecord.businessName);

    return Array.from(names, ([id, name]) => ({ id, name }));
  }, [
    businessId,
    currentBusinessName,
    upcomingShifts,
    otherLocationShifts,
    clockRecords,
    timeoffRequests,
    activeClockRecord,
  ]);

  const worksAtMultipleLocations = myLocations.length > 1;

  const refreshAttendance = () => {
    if (!businessId || !employee) return;

    setClockLoading(true);
    Promise.all([
      attendanceService.getActiveClockRecord(businessId, employee.id),
      attendanceService.getMyClockRecords(businessId, employee.id),
    ])
      .then(([active, records]) => {
        setActiveClockRecord(active);
        setClockRecords(records);
      })
      .catch(err => console.error('Failed to load attendance:', err))
      .finally(() => setClockLoading(false));

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    attendanceService.getAttendanceStats(businessId, employee.id, weekStart, weekEnd)
      .then(setAttendanceStats)
      .catch(err => console.error('Failed to load attendance stats:', err));
  };

  useEffect(() => {
    refreshAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, employee]);

  const handleClockIn = () => {
    if (!businessId || !employee) return;
    setClockError(null);

    // With more than one location it is not ours to guess - the next shift is
    // a decent hint but wrong whenever someone picks up cover or starts early
    // somewhere else, and a clock-in at the wrong location is a payroll error.
    if (worksAtMultipleLocations) {
      setIsClockInLocationOpen(true);
      return;
    }
    clockInAt(businessId);
  };

  const clockInAt = async (targetBusinessId: string) => {
    if (!employee) return;
    setClockActionInFlight(true);
    setClockError(null);
    try {
      // Attach the shift only when it belongs to the location being clocked
      // into, so the record links to the right one.
      const shift = nextShift;
      const shiftHere =
        shift &&
        isSameDay(parseISO(shift.date), new Date()) &&
        shift.businessId === targetBusinessId;

      const record = await attendanceService.clockIn(
        targetBusinessId,
        employee.id,
        undefined,
        shiftHere ? shift.id : undefined
      );
      setActiveClockRecord(record);
      setIsClockInLocationOpen(false);
      refreshAttendance();
    } catch (err: any) {
      setClockError(err?.message || "Failed to clock in");
    } finally {
      setClockActionInFlight(false);
    }
  };

  const handleClockOut = async () => {
    if (!businessId || !employee) return;
    setClockActionInFlight(true);
    setClockError(null);
    try {
      // Post to wherever the open session was started - the backend closes the
      // session regardless, but the endpoint is business-scoped, so using the
      // viewed location would be rejected when they clocked in elsewhere.
      await attendanceService.clockOut(
        activeClockRecord?.businessId ?? businessId,
        employee.id
      );
      setActiveClockRecord(null);
      refreshAttendance();
    } catch (err: any) {
      setClockError(err?.message || "Failed to clock out");
    } finally {
      setClockActionInFlight(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-neutral-600">Loading employee data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <p className="text-red-900">Failed to load employee data</p>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-neutral-600">
            No employee record is linked to your account. This portal will show
            your schedule and availability once you're set up as an employee.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const formatShiftDate = (dateStr: string) =>
    // Shift dates are plain "YYYY-MM-DD"; anchor at local midnight so they
    // don't slip to the previous day west of UTC.
    formatDateShortWeekday(new Date(`${dateStr}T00:00:00`));

  const formatShiftTime = (time: string) => formatClockTimeCompact(time);

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  // These rows come straight from the shifts table and carry no computed
  // duration, so derive it from the times.
  const shiftDurationHours = (shift: EmployeeShift) =>
    (toMinutes(shift.endTime) - toMinutes(shift.startTime)) / 60;

  const thisWeekHours = upcomingShifts
    .filter(shift => {
      const shiftDate = parseISO(shift.date);
      return shiftDate >= currentWeekStart && shiftDate < addWeeks(currentWeekStart, 1);
    })
    .reduce((sum, shift) => sum + shiftDurationHours(shift), 0);

  const nextShift = [...upcomingShifts]
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .find(shift => {
      const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
      return shiftEnd >= now;
    });

  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const selectedWeekDays = eachDayOfInterval({ start: selectedWeekStart, end: selectedWeekEnd });
  const selectedWeekHours = teamShifts
    .filter(shift => shift.isMine)
    .reduce((sum, shift) => sum + shift.durationHours, 0);

  // Intl elides the repeated month/year itself and knows where each region
  // puts the day relative to the month.
  const formatWeekLabel = () => formatDateRange(selectedWeekStart, selectedWeekEnd);

  const goToPreviousWeek = () => setSelectedWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setSelectedWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Employee Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-neutral-900">{employee.fullName}</h2>
              <p className="text-neutral-500">
                {t('schedule.payRatePerHour', { rate: formatCurrency(employee.normalPayRate) })} • Employee ID: {employee.id}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clock In/Out */}
      <Card className={activeClockRecord ? "border-green-300 bg-green-50" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {activeClockRecord ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-neutral-900">
                      Clocked in
                      {/* Named whenever they work at more than one location -
                          "clocked in" alone leaves which one ambiguous. */}
                      {worksAtMultipleLocations && activeClockRecord.businessName && (
                        <span className="text-blue-700"> at {activeClockRecord.businessName}</span>
                      )}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Since {formatTime(activeClockRecord.clockInTime)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="h-8 w-8 text-neutral-400" />
                  <div>
                    <p className="text-neutral-900">Not clocked in</p>
                    <p className="text-sm text-neutral-500">Click below to start your shift</p>
                  </div>
                </>
              )}
            </div>
            {activeClockRecord ? (
              <Button
                onClick={handleClockOut}
                disabled={clockActionInFlight || clockLoading}
                variant="destructive"
                className="gap-2"
              >
                {clockActionInFlight ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                Clock Out
              </Button>
            ) : (
              <Button
                onClick={handleClockIn}
                disabled={clockActionInFlight || clockLoading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {clockActionInFlight ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Clock In
              </Button>
            )}
          </div>
          {clockError && (
            <Alert className="mt-4 border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">{clockError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-neutral-500">This Week</p>
                <p className="text-neutral-900">{thisWeekHours.toFixed(1)} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-neutral-500">Next Shift</p>
                <p className="text-neutral-900">
                  {nextShift ? `${formatShiftDate(nextShift.date)}, ${formatShiftTime(nextShift.startTime)}` : t('portal.noneScheduled')}
                </p>
                {/* Only worth naming when it is somewhere other than where
                    they are looking - otherwise it states the obvious. */}
                {nextShift && nextShift.businessId !== businessId && (
                  <p className="text-xs text-blue-700 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" style={{ flexShrink: 0 }} />
                    {nextShift.businessName}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-neutral-500">Pending</p>
                <p className="text-neutral-900">
                  {swapRequests.incoming.filter(r => r.status === "PENDING").length} request{swapRequests.incoming.filter(r => r.status === "PENDING").length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="schedule">{t('portal.mySchedule')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('portal.attendance')}</TabsTrigger>
          <TabsTrigger value="timeoff">{t('portal.timeOff')}</TabsTrigger>
          <TabsTrigger value="swaps">{t('portal.shiftSwaps')}</TabsTrigger>
          <TabsTrigger value="availability">{t('portal.availability')}</TabsTrigger>
          <TabsTrigger value="contracts">{t('portal.contracts')}</TabsTrigger>
        </TabsList>

        {/* My Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>My Shifts</CardTitle>
                  <CardDescription>Your published shifts by week</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={goToCurrentWeek}
                    className="text-sm font-semibold text-blue-900 px-2 hover:bg-blue-100 rounded py-1 transition-colors"
                  >
                    {formatWeekLabel()}
                  </button>
                  <Button variant="ghost" size="sm" onClick={goToNextWeek} className="h-7 w-7 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-neutral-500 text-sm">Loading shifts...</span>
                </div>
              ) : (
                <>
                  <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 overflow-hidden">
                    {selectedWeekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const isToday = isSameDay(day, now);
                      const isExpanded = expandedDay === dayKey;
                      // The caller's shifts at other locations join their own
                      // row on the timeline rather than sitting in a separate
                      // callout - they are the same person's day, and seeing
                      // them beside each other is the point.
                      const elsewhereToday: TeamShift[] = otherLocationShifts
                        .filter(shift => isSameDay(parseISO(shift.date), day))
                        .map(shift => ({
                          id: shift.id,
                          employeeId: shift.employeeId,
                          employeeName: employee?.fullName ?? 'You',
                          date: shift.date,
                          startTime: shift.startTime,
                          endTime: shift.endTime,
                          durationHours:
                            (toMinutes(shift.endTime) - toMinutes(shift.startTime)) / 60,
                          isOvertime: shift.isOvertime,
                          payRate: shift.payRate,
                          isMine: true,
                          businessId: shift.businessId,
                          businessName: shift.businessName,
                        }));

                      const dayShifts = [
                        ...teamShifts.filter((shift: TeamShift) => isSameDay(parseISO(shift.date), day)),
                        ...elsewhereToday,
                      ];
                      const employeeRows = groupByEmployee(dayShifts);
                      const dayHours = dayShifts.filter(s => s.isMine).reduce((sum, s) => sum + s.durationHours, 0);
                      const approvedTimeoffToday = timeoffRequests.find(request =>
                        request.status === "APPROVED" &&
                        isWithinInterval(day, { start: parseISO(request.startDate), end: parseISO(request.endDate) })
                      );

                      const rowHeight = 40;
                      const trackMinMinutes = dayShifts.length > 0
                        ? Math.min(...dayShifts.map(s => toMinutes(s.startTime)))
                        : 8 * 60;
                      const trackMaxMinutes = dayShifts.length > 0
                        ? Math.max(...dayShifts.map(s => toMinutes(s.endTime)))
                        : 18 * 60;
                      const span = Math.max(trackMaxMinutes - trackMinMinutes, 60);
                      const hourMarks = Array.from(
                        { length: Math.floor(trackMaxMinutes / 60) - Math.ceil(trackMinMinutes / 60) + 1 },
                        (_, i) => Math.ceil(trackMinMinutes / 60) + i
                      );

                      return (
                        <div key={dayKey} className={isToday ? 'bg-blue-50/40' : ''}>
                          <button
                            onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`h-4 w-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <span className={`text-sm ${isToday ? 'text-blue-900 font-semibold' : 'text-neutral-900 font-medium'}`}>
                                {formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}
                              </span>
                              {isToday && (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 text-[10px] px-1.5 py-0">
                                  Today
                                </Badge>
                              )}
                              {approvedTimeoffToday && (
                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-[10px] px-1.5 py-0">
                                  You're off
                                </Badge>
                              )}
                              {/* Working somewhere else today - the only sign
                                  of it without expanding the row. Deliberately
                                  unnamed: with several locations a list would
                                  outgrow the row, and the legend inside names
                                  them all anyway. */}
                              {elsewhereToday.length > 0 && (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 text-[10px] px-1.5 py-0">
                                  Multiple locations
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                              <span>{employeeRows.length} scheduled</span>
                              {dayHours > 0 && <span className="text-blue-700 font-medium">{dayHours.toFixed(1)}h mine</span>}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-3">
                              {approvedTimeoffToday && (
                                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-center gap-2">
                                  <div className="size-2.5 rounded-full bg-amber-500 shrink-0" />
                                  <p className="text-xs text-amber-900">
                                    {t('portal.approvedTimeOffReason', { reason: approvedTimeoffToday.reason })}
                                  </p>
                                </div>
                              )}
                              {/* Names the locations in play, since the blocks
                                  themselves only have room for times. Covers
                                  every location worked this day, each with the
                                  shade its blocks use. */}
                              {elsewhereToday.length > 0 && (
                                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                                  {[
                                    currentBusinessName,
                                    ...Array.from(new Set(elsewhereToday.map(s => s.businessName))),
                                  ].map(name => (
                                    <span key={name} className="inline-flex items-center gap-1.5">
                                      <span
                                        className={`inline-block w-3 h-3 rounded ${shadeForLocation(name).swatch}`}
                                      />
                                      <span className="text-neutral-600">{name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {employeeRows.length === 0 ? (
                                <div className="text-center py-6 text-neutral-400 text-sm">
                                  No published shifts this day
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <div className="shrink-0 w-32" />
                                  <div className="relative flex-1" style={{ height: `${hourMarks.length > 0 ? 20 : 0}px` }}>
                                    {hourMarks.map(hour => (
                                      <div
                                        key={hour}
                                        className="absolute -translate-x-1/2 text-[10px] text-neutral-400"
                                        style={{ left: `${((hour * 60 - trackMinMinutes) / span) * 100}%` }}
                                      >
                                        {formatShiftTime(`${hour.toString().padStart(2, '0')}:00`)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="space-y-1.5">
                                {employeeRows.map(({ employeeId, employeeName, isMine, shifts }) => (
                                  <div key={employeeId} className="flex items-center gap-2">
                                    <div className="shrink-0 w-32 flex items-center gap-1.5 overflow-hidden">
                                      <Avatar className="size-6 shrink-0">
                                        <AvatarFallback className={isMine ? 'bg-blue-600 text-white text-[10px]' : 'bg-neutral-200 text-neutral-600 text-[10px]'}>
                                          {getInitials(employeeName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className={`text-xs truncate ${isMine ? 'text-blue-900 font-medium' : 'text-neutral-600'}`}>
                                        {isMine ? 'You' : employeeName}
                                      </span>
                                    </div>
                                    <div className="relative flex-1" style={{ height: `${rowHeight}px` }}>
                                      {hourMarks.map(hour => (
                                        <div
                                          key={hour}
                                          className="absolute top-0 bottom-0 border-l border-neutral-100"
                                          style={{ left: `${((hour * 60 - trackMinMinutes) / span) * 100}%` }}
                                        />
                                      ))}
                                      {shifts.map(shift => {
                                        const left = ((toMinutes(shift.startTime) - trackMinMinutes) / span) * 100;
                                        const width = Math.max((toMinutes(shift.endTime) - toMinutes(shift.startTime)) / span * 100, 3);

                                        // A shift at another location is still
                                        // theirs, but it belongs to a roster
                                        // that isn't shown here - so it is
                                        // marked by colour and cannot be
                                        // offered for a swap.
                                        const isElsewhere = !!shift.businessName;

                                        return (
                                          <div
                                            key={shift.id}
                                            onClick={() => !isMine && setSwapTargetShift(shift)}
                                            title={
                                              isElsewhere
                                                ? `${shift.businessName}: ${formatShiftTime(shift.startTime)}-${formatShiftTime(shift.endTime)}`
                                                : `${isMine ? 'You' : employeeName}: ${formatShiftTime(shift.startTime)}-${formatShiftTime(shift.endTime)}`
                                            }
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center gap-1 text-[11px] font-medium overflow-hidden ${
                                              isMine
                                                ? shadeForLocation(shift.businessName).block
                                                : 'bg-neutral-200 text-neutral-700 cursor-pointer hover:bg-neutral-300'
                                            }`}
                                          >
                                            {isElsewhere && (
                                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                                            )}
                                            <span className="truncate">
                                              {formatShiftTime(shift.startTime)}-{formatShiftTime(shift.endTime)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {teamShifts.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No published shifts this week</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-sm bg-blue-600 shrink-0" />
                      <span className="text-xs text-neutral-500">Your shifts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-sm bg-neutral-200 shrink-0" />
                      <span className="text-xs text-neutral-500">Coworker shifts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs text-neutral-500">{t('portal.approvedTimeOff')}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Total Hours This Week</span>
                      <span>{selectedWeekHours.toFixed(1)} hours</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('portal.plannedVsActual')}</CardTitle>
              <CardDescription>Scheduled hours vs. hours you've actually clocked, this week</CardDescription>
            </CardHeader>
            <CardContent>
              {!attendanceStats ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <p className="text-xs text-neutral-500">{t('portal.scheduled')}</p>
                    <p className="text-neutral-900 text-lg">{attendanceStats.totalScheduledHours.toFixed(1)} hours</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <p className="text-xs text-neutral-500">{t('portal.actuallyWorked')}</p>
                    <p className="text-neutral-900 text-lg">{attendanceStats.totalHoursWorked.toFixed(1)} hours</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <p className="text-xs text-neutral-500">Attendance Rate</p>
                    </div>
                    <p className="text-neutral-900 text-lg">{attendanceStats.attendanceRate.toFixed(0)}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clock History</CardTitle>
              <CardDescription>Your recent clock in/out records</CardDescription>
            </CardHeader>
            <CardContent>
              {clockLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : clockRecords.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">No clock records yet</p>
              ) : (
                <div className="space-y-2">
                  {clockRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                      <div>
                        <p className="text-sm text-neutral-900">
                          {formatDateShortWeekday(record.clockInTime)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatTime(record.clockInTime)}
                          {" – "}
                          {record.clockOutTime
                            ? formatTime(record.clockOutTime)
                            : "in progress"}
                        </p>
                        {/* Once records span more than one location, every row
                            is labelled - tagging only the away ones would leave
                            the rest ambiguous between "here" and "unknown". */}
                        {worksAtMultipleLocations && record.businessName && (
                          <p className="text-xs text-blue-700 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" style={{ flexShrink: 0 }} />
                            {record.businessName}
                          </p>
                        )}
                      </div>
                      <Badge variant={record.isActive ? "default" : "outline"}>
                        {record.isActive ? "Active" : `${record.durationHours?.toFixed(1) ?? "0.0"}h`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          {timeoffStatus && (
              <Alert
                  variant={timeoffStatus.type === "error" ? "destructive" : "default"}
                  className={timeoffStatus.type === "success" ? "border-green-300 bg-green-50" : ""}
              >
                  <AlertDescription className={timeoffStatus.type === "success" ? "text-green-800" : ""}>
                      {timeoffStatus.message}
                  </AlertDescription>
              </Alert>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('portal.timeOffRequests')}</CardTitle>
                <Button className="gap-2" onClick={() => setTimeoffDialogOpen(true)}>
                  <Calendar className="w-4 h-4" />
                  {t('portal.requestTimeOff')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {timeoffLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {timeoffRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-neutral-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm">
                              {formatShiftDate(request.startDate)}
                              {request.startDate !== request.endDate && ` - ${formatShiftDate(request.endDate)}`}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                request.status === "APPROVED"
                                  ? "text-green-700 bg-green-50 border-green-300"
                                  : request.status === "DENIED" || request.status === "CANCELLED"
                                  ? "text-neutral-500 bg-neutral-50 border-neutral-300"
                                  : "text-amber-700 bg-amber-50 border-amber-300"
                              }
                            >
                              {request.status.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-neutral-500 text-sm">{request.reason}</p>
                          {/* Same rule as the clock records: once requests span
                              more than one location, every row says which. */}
                          {worksAtMultipleLocations && request.businessName && (
                            <p className="text-xs text-blue-700 inline-flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" style={{ flexShrink: 0 }} />
                              {request.businessName}
                            </p>
                          )}
                        </div>
                        {request.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={timeoffActionId === request.id}
                            onClick={() => handleCancelTimeoff(request.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {timeoffRequests.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t('portal.noTimeOffRequests')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('portal.availablePto')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">{t('portal.vacationDays')}</span>
                    <span>{t('portal.daysRemaining', { remaining: 8, total: 15 })}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: "53%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Sick Days</span>
                    <span>5 of 5 remaining</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Swaps Tab */}
        <TabsContent value="swaps" className="space-y-4">
          {swapActionStatus && (
              <Alert
                  variant={swapActionStatus.type === "error" ? "destructive" : "default"}
                  className={swapActionStatus.type === "success" ? "border-green-300 bg-green-50" : ""}
              >
                  <AlertDescription className={swapActionStatus.type === "success" ? "text-green-800" : ""}>
                      {swapActionStatus.message}
                  </AlertDescription>
              </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Incoming Swap Requests</CardTitle>
              <CardDescription>Other employees want to take your shifts</CardDescription>
            </CardHeader>
            <CardContent>
              {swapRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {swapRequests.incoming.map((request) => (
                    <div
                      key={request.id}
                      className="border border-neutral-200 rounded-lg p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {request.requestingEmployeeName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{request.requestingEmployeeName}</p>
                            <p className="text-neutral-500 text-sm">
                              {formatDateShortWeekday(parseISO(request.shiftDate))} · {formatShiftTime(request.shiftStartTime)}-{formatShiftTime(request.shiftEndTime)}
                            </p>
                            {request.message && (
                              <p className="text-neutral-500 text-sm italic mt-1">"{request.message}"</p>
                            )}
                            <Badge variant="outline" className={`mt-1 ${swapStatusBadgeClass(request.status)}`}>
                              {swapStatusLabel(request.status)}
                            </Badge>
                          </div>
                        </div>
                        {request.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={swapActionId === request.id}
                              onClick={() => handleSwapAction(request.id, "decline")}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              disabled={swapActionId === request.id}
                              onClick={() => handleSwapAction(request.id, "accept")}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {swapRequests.incoming.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">
                      <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No incoming swap requests</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Swap Requests</CardTitle>
              <CardDescription>Shifts you want to take from coworkers</CardDescription>
            </CardHeader>
            <CardContent>
              {swapRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : swapRequests.outgoing.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No active swap requests</p>
                  <p className="text-xs mt-1">Click a coworker's shift on the calendar to request it</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swapRequests.outgoing.map((request) => (
                    <div
                      key={request.id}
                      className="border border-neutral-200 rounded-lg p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm">{request.targetEmployeeName}'s shift</p>
                          <p className="text-neutral-500 text-sm">
                            {formatDateShortWeekday(parseISO(request.shiftDate))} · {formatShiftTime(request.shiftStartTime)}-{formatShiftTime(request.shiftEndTime)}
                          </p>
                          <Badge variant="outline" className={`mt-1 ${swapStatusBadgeClass(request.status)}`}>
                            {swapStatusLabel(request.status)}
                          </Badge>
                        </div>
                        {request.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={swapActionId === request.id}
                            onClick={() => handleSwapAction(request.id, "cancel")}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                      <div>
                          <CardTitle>My Availability</CardTitle>
                          <CardDescription>Click hours to toggle availability</CardDescription>
                      </div>
                      <Button
                          onClick={handleSaveAvailability}
                          disabled={saving || !hasUnsavedAvailabilityChanges}
                      >
                          {saving ? (
                              <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Saving...
                              </>
                          ) : (
                              'Save Changes'
                          )}
                      </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  {availabilityStatus && (
                      <Alert
                          variant={availabilityStatus.type === "error" ? "destructive" : "default"}
                          className={`mb-4 ${availabilityStatus.type === "success" ? "border-green-300 bg-green-50" : ""}`}
                      >
                          <AlertDescription className={availabilityStatus.type === "success" ? "text-green-800" : ""}>
                              {availabilityStatus.message}
                          </AlertDescription>
                      </Alert>
                  )}
                  <div className="overflow-x-auto sm:overflow-x-visible -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="space-y-2 min-w-[640px] sm:min-w-0">
                      {/* Hour labels */}
                      <div className="flex gap-2">
                          <div className="w-10 flex-shrink-0" />
                          <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(1.5rem, 1fr))` }}>
                              {hours.map(hour => (
                                  <div key={hour} className="text-center overflow-hidden">
                                      <span className="text-[9px] text-neutral-500 whitespace-nowrap">{formatHour(hour)}</span>
                                  </div>
                              ))}
                          </div>
                          <div className="w-10 flex-shrink-0" />
                      </div>

                      {/* Days with hour blocks */}
                      {daysOfWeek.map((day) => {
                          const dayHours = availability[day] || [];
                          const hasAvailability = dayHours.length > 0;

                          return (
                              <div key={day} className="flex items-center gap-2">
                                  <div className="w-10 flex-shrink-0">
                                      <span className="text-sm">{day.slice(0, 3)}</span>
                                  </div>
                                  <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(1.5rem, 1fr))` }}>
                                      {hours.map(hour => {
                                          const isAvailable = dayHours.includes(hour);
                                          return (
                                              <button
                                                  key={hour}
                                                  onMouseDown={(e) => { e.preventDefault(); handleHourMouseDown(day, hour); }}
                                                  onMouseEnter={() => handleHourMouseEnter(day, hour)}
                                                  className={`h-8 rounded-sm text-[9px] transition-all border select-none ${
                                                      isAvailable
                                                          ? 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                                                          : 'bg-neutral-100 border-neutral-200 text-neutral-400 hover:bg-neutral-200 hover:border-neutral-300'
                                                  }`}
                                                  title={`${day} ${formatHour(hour)}`}
                                              >
                                                  {formatHour(hour).replace(/[apm]/g, '')}
                                              </button>
                                          );
                                      })}
                                  </div>
                                  <div className="w-10 flex-shrink-0 text-right">
                                      {hasAvailability && (
                                          <span className="text-xs text-neutral-500">{dayHours.length}h</span>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  </div>

                  {/* Helper text */}
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">
                          💡 Tip: Click and drag across hours to quickly select multiple time slots
                      </p>
                  </div>
              </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab - read-only. Uploading and removing documents is the
            manager's job, so this side only lists and downloads. */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Contracts</CardTitle>
              <CardDescription>
                Contracts and paperwork held for you by your employer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractsError && (
                <Alert className="mb-4 border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">{contractsError}</AlertDescription>
                </Alert>
              )}

              {contractsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-neutral-500 text-sm">Loading contracts...</span>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No contracts have been shared with you yet</p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 overflow-hidden">
                  {contracts.map((contract) => (
                    <div key={contract.id} className="flex items-center gap-3 px-3 py-2.5">
                      <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-900 truncate">{contract.fileName}</p>
                        <p className="text-xs text-neutral-500">
                          {formatFileSize(contract.sizeBytes)} · Added{" "}
                          {formatDateMedium(contract.uploadedAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={() => handleDownloadContract(contract)}
                        disabled={downloadingContractId === contract.id}
                      >
                        {downloadingContractId === contract.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3 mr-1" />
                        )}
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Which location am I clocking in at? Only asked of people who work at
          more than one - everyone else clocks straight in. */}
      <Dialog open={isClockInLocationOpen} onOpenChange={setIsClockInLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Where are you clocking in?</DialogTitle>
            <DialogDescription>
              You work at more than one location. Pick the one you're starting at —
              you can only be clocked in at one place at a time.
            </DialogDescription>
          </DialogHeader>

          {clockError && (
            <Alert className="bg-red-50 border-red-200 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{clockError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {myLocations.map(location => {
              // Flagged when today's shift is here, so the likely choice is
              // obvious without being chosen for them.
              const hasShiftHere =
                nextShift &&
                isSameDay(parseISO(nextShift.date), new Date()) &&
                nextShift.businessId === location.id;

              return (
                <Button
                  key={location.id}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled={clockActionInFlight}
                  onClick={() => clockInAt(location.id)}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{location.name}</span>
                  {hasShiftHere && (
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300">
                      Shift today
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsClockInLocationOpen(false)}
              disabled={clockActionInFlight}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapTargetShift !== null} onOpenChange={(open: boolean) => { if (!open) { setSwapTargetShift(null); setSwapMessage(""); setSwapError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request shift swap</DialogTitle>
            <DialogDescription>
              {swapTargetShift && (
                <>
                  Request to take {swapTargetShift.employeeName}'s shift on{' '}
                  {formatDateShortWeekday(parseISO(swapTargetShift.date))}, {formatShiftTime(swapTargetShift.startTime)}-{formatShiftTime(swapTargetShift.endTime)}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add a message (optional)"
            value={swapMessage}
            onChange={(e) => setSwapMessage(e.target.value)}
          />
          {swapError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{swapError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSwapTargetShift(null); setSwapMessage(""); setSwapError(null); }} disabled={swapSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleRequestSwap} disabled={swapSubmitting}>
              {swapSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeoffDialogOpen} onOpenChange={(open: boolean) => { setTimeoffDialogOpen(open); if (!open) { setTimeoffStartDate(""); setTimeoffEndDate(""); setTimeoffReason(""); setTimeoffError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.requestTimeOffTitle')}</DialogTitle>
            <DialogDescription>Submit a date range for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="timeoff-start">Start date</Label>
                <Input
                  id="timeoff-start"
                  type="date"
                  value={timeoffStartDate}
                  onChange={(e) => setTimeoffStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeoff-end">End date</Label>
                <Input
                  id="timeoff-end"
                  type="date"
                  min={timeoffStartDate || undefined}
                  value={timeoffEndDate}
                  onChange={(e) => setTimeoffEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeoff-reason">Reason</Label>
              <Textarea
                id="timeoff-reason"
                placeholder={t('portal.reasonPlaceholder')}
                value={timeoffReason}
                onChange={(e) => setTimeoffReason(e.target.value)}
              />
            </div>
          </div>
          {timeoffError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{timeoffError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeoffDialogOpen(false)} disabled={timeoffSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTimeoff}
              disabled={timeoffSubmitting || !timeoffStartDate || !timeoffEndDate || !timeoffReason.trim()}
            >
              {timeoffSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
