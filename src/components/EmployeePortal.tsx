import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Calendar, Clock, User, ArrowLeftRight, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { employeeService } from "../services/employeeService";
import { scheduleService } from "../services/scheduleService";
import { swapService } from "../services/swapService";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/auth";
import type { Employee } from "../types/employee";
import type { Shift } from "../types/scheduling";
import type { TeamShift, SwapRequest, SwapRequestsListResponse } from "../types/swap";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";

const timeOffRequests = [
  { dates: "Feb 14-16", reason: "Personal", status: "approved" },
  { dates: "Mar 1-3", reason: "Vacation", status: "pending" },
];

const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Helper to convert backend availability to UI format (hours array per day)
const backendToUIAvailability = (backendAvailability: Employee['availability']): Record<string, number[]> => {
  const uiAvailability: Record<string, number[]> = {};

  // Initialize all days with empty arrays
  daysOfWeek.forEach(day => {
    uiAvailability[day] = [];
  });

  // Convert each availability range to hours
  backendAvailability.forEach(avail => {
    const startHour = parseInt(avail.startTime.split(':')[0]);
    const endHour = parseInt(avail.endTime.split(':')[0]);

    // Add all hours in the range (exclusive of end hour)
    for (let hour = startHour; hour < endHour; hour++) {
      if (!uiAvailability[avail.dayOfWeek].includes(hour)) {
        uiAvailability[avail.dayOfWeek].push(hour);
      }
    }
  });

  // Sort hours for each day
  Object.keys(uiAvailability).forEach(day => {
    uiAvailability[day].sort((a, b) => a - b);
  });

  return uiAvailability;
};

// Helper to convert UI availability to backend format (time ranges)
const uiToBackendAvailability = (uiAvailability: Record<string, number[]>): Employee['availability'] => {
  const backendAvailability: Employee['availability'] = [];

  Object.entries(uiAvailability).forEach(([day, hours]) => {
    if (hours.length === 0) return;

    // Group consecutive hours into ranges
    const sortedHours = [...hours].sort((a, b) => a - b);
    let rangeStart = sortedHours[0];
    let rangeEnd = sortedHours[0] + 1;

    for (let i = 1; i <= sortedHours.length; i++) {
      const currentHour = sortedHours[i];

      if (currentHour === rangeEnd) {
        // Extend current range
        rangeEnd = currentHour + 1;
      } else {
        // Save current range and start new one
        backendAvailability.push({
          dayOfWeek: day,
          startTime: `${String(rangeStart).padStart(2, '0')}:00`,
          endTime: `${String(rangeEnd).padStart(2, '0')}:00`,
        });

        if (i < sortedHours.length) {
          rangeStart = currentHour;
          rangeEnd = currentHour + 1;
        }
      }
    }
  });

  return backendAvailability;
};

const toMinutes = (time: string) => {
  const [hourStr, minuteStr] = time.split(':');
  return parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);
};

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
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize with empty availability
  const [availability, setAvailability] = useState<Record<string, number[]>>({});

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

  const formatHour = (hour: number) => {
      if (hour === 0) return "12am";
      if (hour === 12) return "12pm";
      return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  const handleSaveAvailability = async () => {
    if (!businessId || !employee) return;

    setSaving(true);
    try {
      const backendAvailability = uiToBackendAvailability(availability);
      await employeeService.updateEmployee(businessId, employee.id, {
        availability: backendAvailability,
      });

      // Refresh employee data
      const updatedEmployee = await employeeService.getEmployeeById(businessId, employee.id);
      setEmployee(updatedEmployee);
      alert('Availability saved successfully!');
    } catch (err) {
      console.error('Failed to save availability:', err);
      alert('Failed to save availability. Please try again.');
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
          setAvailability(backendToUIAvailability(emp.availability));
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
    try {
      if (action === "accept") await swapService.acceptSwapRequest(businessId, id);
      else if (action === "decline") await swapService.declineSwapRequest(businessId, id);
      else await swapService.cancelSwapRequest(businessId, id);
      refetchSwapRequests();
    } catch (err) {
      console.error(`Failed to ${action} swap request:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${action} swap request`);
    } finally {
      setSwapActionId(null);
    }
  };

  // Separately, shifts from today through 4 weeks out, for the "This Week" /
  // "Next Shift" stat cards - these always reflect today regardless of which
  // week is being browsed in the calendar below, and need a window wide
  // enough to find the next upcoming shift even if none falls in this
  // calendar week.
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);

  useEffect(() => {
    if (!businessId || !employee) return;

    const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lookaheadEnd = endOfWeek(addWeeks(todayWeekStart, 3), { weekStartsOn: 1 });

    scheduleService.getEmployeeShifts(
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

  const formatShiftDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatShiftTime = (time: string) => {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const suffix = hour < 12 ? 'am' : 'pm';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return minuteStr === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minuteStr}${suffix}`;
  };

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  const thisWeekHours = upcomingShifts
    .filter(shift => {
      const shiftDate = parseISO(shift.date);
      return shiftDate >= currentWeekStart && shiftDate < addWeeks(currentWeekStart, 1);
    })
    .reduce((sum, shift) => sum + shift.durationHours, 0);

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

  const formatWeekLabel = () => {
    const startMonth = format(selectedWeekStart, 'MMM');
    const endMonth = format(selectedWeekEnd, 'MMM');
    const year = format(selectedWeekEnd, 'yyyy');
    return startMonth === endMonth
      ? `${startMonth} ${format(selectedWeekStart, 'd')}-${format(selectedWeekEnd, 'd')}, ${year}`
      : `${startMonth} ${format(selectedWeekStart, 'd')} - ${endMonth} ${format(selectedWeekEnd, 'd')}, ${year}`;
  };

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
                ${employee.normalPayRate}/hr • Employee ID: {employee.id}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </Button>
          </div>
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
                  {nextShift ? `${formatShiftDate(nextShift.date)}, ${formatShiftTime(nextShift.startTime)}` : 'None scheduled'}
                </p>
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
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">My Schedule</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
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
                      const dayShifts = teamShifts.filter((shift: TeamShift) => isSameDay(parseISO(shift.date), day));
                      const employeeRows = groupByEmployee(dayShifts);
                      const dayHours = dayShifts.filter(s => s.isMine).reduce((sum, s) => sum + s.durationHours, 0);

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
                                {format(day, 'EEEE, MMM d')}
                              </span>
                              {isToday && (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 text-[10px] px-1.5 py-0">
                                  Today
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

                                        return (
                                          <div
                                            key={shift.id}
                                            onClick={() => !isMine && setSwapTargetShift(shift)}
                                            title={`${isMine ? 'You' : employeeName}: ${formatShiftTime(shift.startTime)}-${formatShiftTime(shift.endTime)}`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center text-[11px] font-medium overflow-hidden ${
                                              isMine
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-neutral-200 text-neutral-700 cursor-pointer hover:bg-neutral-300'
                                            }`}
                                          >
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

                  <div className="mt-4 pt-4 border-t border-neutral-200">
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

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Off Requests</CardTitle>
                <Button className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Request Time Off
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeOffRequests.map((request, idx) => (
                  <div
                    key={idx}
                    className="border border-neutral-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm">{request.dates}</p>
                          <Badge
                            variant="outline"
                            className={
                              request.status === "approved"
                                ? "text-green-700 bg-green-50 border-green-300"
                                : "text-amber-700 bg-amber-50 border-amber-300"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-neutral-500 text-sm">{request.reason}</p>
                      </div>
                      {request.status === "pending" && (
                        <Button variant="ghost" size="sm">Cancel</Button>
                      )}
                    </div>
                  </div>
                ))}

                {timeOffRequests.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No time off requests</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available PTO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Vacation Days</span>
                    <span>8 of 15 remaining</span>
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
                              {format(parseISO(request.shiftDate), 'EEE, MMM d')} · {formatShiftTime(request.shiftStartTime)}-{formatShiftTime(request.shiftEndTime)}
                            </p>
                            {request.message && (
                              <p className="text-neutral-500 text-sm italic mt-1">"{request.message}"</p>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                request.status === "ACCEPTED"
                                  ? "text-green-700 bg-green-50 border-green-300 mt-1"
                                  : request.status === "DECLINED" || request.status === "CANCELLED"
                                  ? "text-neutral-500 bg-neutral-50 border-neutral-300 mt-1"
                                  : "text-amber-700 bg-amber-50 border-amber-300 mt-1"
                              }
                            >
                              {request.status.toLowerCase()}
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
                            {format(parseISO(request.shiftDate), 'EEE, MMM d')} · {formatShiftTime(request.shiftStartTime)}-{formatShiftTime(request.shiftEndTime)}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              request.status === "ACCEPTED"
                                ? "text-green-700 bg-green-50 border-green-300 mt-1"
                                : request.status === "DECLINED" || request.status === "CANCELLED"
                                ? "text-neutral-500 bg-neutral-50 border-neutral-300 mt-1"
                                : "text-amber-700 bg-amber-50 border-amber-300 mt-1"
                            }
                          >
                            {request.status.toLowerCase()}
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
                          disabled={saving}
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
                  <div className="space-y-4">
                      {/* Hour labels */}
                      <div className="flex gap-1 ml-24 overflow-x-auto pb-2 scroll-smooth">
                          {hours.map(hour => (
                              <div key={hour} className="flex-shrink-0 w-16 text-center">
                                  <span className="text-xs text-neutral-500">{formatHour(hour)}</span>
                              </div>
                          ))}
                      </div>

                      {/* Days with hour blocks */}
                      {daysOfWeek.map((day) => {
                          const dayHours = availability[day] || [];
                          const hasAvailability = dayHours.length > 0;

                          return (
                              <div key={day} className="flex items-center gap-2">
                                  <div className="w-20 flex-shrink-0">
                                      <span className="text-sm">{day.slice(0, 3)}</span>
                                  </div>
                                  <div className="flex gap-1 overflow-x-auto flex-1 scroll-smooth">
                                      {hours.map(hour => {
                                          const isAvailable = dayHours.includes(hour);
                                          return (
                                              <button
                                                  key={hour}
                                                  onClick={() => toggleHour(day, hour)}
                                                  className={`flex-shrink-0 w-16 h-10 rounded text-xs transition-all border ${
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
                                  <div className="w-16 flex-shrink-0 text-right">
                                      {hasAvailability && (
                                          <span className="text-xs text-neutral-500">{dayHours.length}h</span>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Helper text */}
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-xs text-neutral-500">
                          💡 Tip: Click and drag across hours to quickly select multiple time slots
                      </p>
                  </div>
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduling Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Maximum hours per week</p>
                  <p className="text-xs text-neutral-500">Currently: 40 hours</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Preferred shifts</p>
                  <p className="text-xs text-neutral-500">Evening shifts preferred</p>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={swapTargetShift !== null} onOpenChange={(open: boolean) => { if (!open) { setSwapTargetShift(null); setSwapMessage(""); setSwapError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request shift swap</DialogTitle>
            <DialogDescription>
              {swapTargetShift && (
                <>
                  Request to take {swapTargetShift.employeeName}'s shift on{' '}
                  {format(parseISO(swapTargetShift.date), 'EEE, MMM d')}, {formatShiftTime(swapTargetShift.startTime)}-{formatShiftTime(swapTargetShift.endTime)}.
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
    </div>
  );
}
