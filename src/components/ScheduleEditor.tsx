import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Sparkles, Loader2, Calendar, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useWeek } from "../contexts/WeekContext";
import { useFormatters } from "../hooks/useFormatters";
import { useBusinessHours } from "../contexts/BusinessHoursContext";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/auth";
import type { BusinessDayHours } from "../types/businessHours";
import type { OptimizationObjective } from "../types/scheduling";
import type { Employee } from "../types/employee";

const dayOfWeekMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

// Indexed by Date.getDay(), so Sunday first.
const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const { formatDate, formatCurrency, formatClockTime } = useFormatters();
  const { t } = useTranslation();
  const {
    resolveDate,
    week,
    overrides,
    updateWeek,
    saveOverride,
    deleteOverride,
    loading: hoursLoading,
  } = useBusinessHours();
  const { user } = useAuth();
  const [savingHours, setSavingHours] = useState(false);
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

  /**
   * The hours each date in the range will be generated against.
   *
   * Shown rather than summarised: business hours bound every shift the generator can
   * create, and a schedule built against the wrong ones has to be regenerated rather
   * than corrected. One row per day makes a mistake visible without opening the editor -
   * a Sunday that should be open reads as "Closed" right here.
   *
   * Resolved per date rather than per weekday so a holiday override shows as the closure
   * it is, on the date it falls.
   */
  const scheduledDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const days: Array<{ key: string; date: Date; label: string; status: ReturnType<typeof resolveDate> }> = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    // Capped so a long range cannot run away with the card; a fortnight already shows
    // every distinct weekday twice.
    while (cursor <= last && days.length < 14) {
      const date = new Date(cursor);
      days.push({
        key: formatDateToISO(date),
        date,
        label: weekdayShort[date.getDay()],
        status: resolveDate(date),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [startDate, endDate, resolveDate]);

  const closedCount = scheduledDays.filter((d) => d.status.closed).length;


  // Only the account owner may change trading hours, matching the header's editor. A
  // manager still sees them, since they bound the schedule they are about to generate.
  const canEditHours = user?.role === UserRole.ADMIN;

  /**
   * Write one weekday's hours, from a date in the range.
   *
   * The whole week is PUT because that is the shape the endpoint takes - it saves the
   * pattern as a unit rather than a day at a time, so a partial write cannot leave a
   * business half on its old hours.
   */
  const patchWeekday = async (isoDate: string, patch: Partial<BusinessDayHours>) => {
    const dayName = dayOfWeekMap[(new Date(`${isoDate}T00:00:00`).getDay() + 6) % 7];
    const next = week.map((d) => (d.dayOfWeek === dayName ? { ...d, ...patch } : d));
    try {
      setSavingHours(true);
      await updateWeek(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update business hours');
    } finally {
      setSavingHours(false);
    }
  };

  /** Save a one-off for a single date, leaving the weekday pattern alone. */
  const saveDateOverride = async (
    isoDate: string,
    value: { isClosed: boolean; openTime: string; closeTime: string; label: string | null }
  ) => {
    try {
      setSavingHours(true);
      await saveOverride({ date: isoDate, ...value });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save special hours');
    } finally {
      setSavingHours(false);
    }
  };

  /** Drop a date's one-off, returning it to the weekday pattern. */
  const clearDateOverride = async (isoDate: string) => {
    const existing = overrides.find((o) => o.date === isoDate);
    if (!existing?.id) return;
    try {
      setSavingHours(true);
      await deleteOverride(existing.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove special hours');
    } finally {
      setSavingHours(false);
    }
  };

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

            {/* Two columns: the five settings stack on the left, business hours fill the
                right. Stacked full-width, the hours list left a column of dead space beside
                it while the settings sat in a shallow row above - side by side each column
                is as tall as the other and the card loses a third of its height. */}
            <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500 font-medium">{t('schedule.titleLabel')}</label>
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
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500 font-medium">{t('schedule.optimizationObjective')}</label>
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
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500 font-medium">Employees to Schedule</label>
                  <div className="flex items-center gap-2 border border-neutral-200 rounded-md px-3 py-2 h-9">
                    <p className="text-sm text-neutral-700">
                      {selectedEmployeeIds.length === employees.length
                        ? `All (${employees.length})`
                        : `${selectedEmployeeIds.length} of ${employees.length} selected`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business hours for the range being generated.
                  These bound every shift the generator can create, so they are shown and
                  edited here rather than only behind the header's clock: a schedule built
                  against the wrong hours has to be regenerated, not corrected.

                  A list rather than a row of seven boxes. Horizontally, seven days crowd
                  the card at any size, and a day with two intervals ("9a-12p, 1p-5p") has
                  nowhere to go; down the page each day owns a line and simply grows taller.

                  Always open: hours vary week to week for most businesses, so a collapsed
                  summary would read "Varies" and cost a click every single time.

                  Last before the generate button rather than up among the dates: it is the
                  tallest thing on the card and the one most often left alone, so putting it
                  between the dates and the controls pushed everything else down the page. */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-neutral-500 font-medium">
                    {t('schedule.businessHoursLabel')}
                  </label>
                  {closedCount > 0 && (
                    <span className="text-xs text-amber-700">
                      {t('schedule.businessHoursClosedCount', { count: closedCount })}
                    </span>
                  )}
                </div>

                {hoursLoading ? (
                  <div className="flex items-center border border-neutral-200 rounded-md px-3 h-9">
                    <p className="text-sm text-neutral-400">{t('schedule.businessHoursLoading')}</p>
                  </div>
                ) : (
                  <div className="border border-neutral-200 rounded-md divide-y divide-neutral-100 overflow-hidden">
                    {scheduledDays.map(({ key, date, label, status }) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
                      >
                        <span
                          className={`text-xs w-8 shrink-0 ${
                            status.closed ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          {label}
                        </span>
                        {/* text-sm/neutral-700 to match the date and employee values -
                            these are field values too, and sat a size smaller and a shade
                            darker than every other one on the card. */}
                        <span
                          className={`text-sm whitespace-nowrap ${
                            status.closed ? 'text-neutral-400' : 'text-neutral-700'
                          }`}
                        >
                          {status.closed
                            ? t('schedule.businessHoursClosed')
                            : status.hours
                              ? `${formatClockTime(status.hours.openTime)} – ${formatClockTime(status.hours.closeTime)}`
                              : '—'}
                        </span>
                        {/* Beside the hours rather than flushed right: the button acts on
                            the times next to it, and a gap the width of the card between
                            them reads as two unrelated things. */}
                        <DayHoursPopover
                          isoDate={key}
                          date={date}
                          status={status}
                          canEdit={canEditHours}
                          saving={savingHours}
                          onSaveWeekday={patchWeekday}
                          onSaveOverride={saveDateOverride}
                          onClearOverride={clearDateOverride}
                        />
                        {status.label && (
                          <span className="text-xs text-amber-700 min-w-0 truncate">
                            {status.label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
/**
 * Every half hour, plus 24:00 for a business that closes at midnight.
 *
 * Matches the header editor's options so the two cannot offer different times for the
 * same field. "24:00" is not a LocalTime the backend parses directly - parseFlexibleTime
 * maps it to midnight - but it is what someone means by closing at the end of the day.
 */
const HOUR_OPTIONS = (() => {
  const times: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  times.push('24:00');
  return times;
})();

const FULL_WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * One day's hours, as a button that opens its own editor.
 *
 * The button shows the state and says it is editable; the popover holds the three things
 * a day can need - open or closed, the times, and whether this is the weekday's pattern
 * or a one-off for this date. Keeping them together is what makes "close Sunday" and
 * "shut on Christmas Day" the same gesture rather than two hidden ones.
 */
function DayHoursPopover({
  isoDate,
  date,
  status,
  canEdit,
  saving,
  onSaveWeekday,
  onSaveOverride,
  onClearOverride,
}: {
  isoDate: string;
  date: Date;
  status: { closed: boolean; hours: { openTime: string; closeTime: string } | null; label: string | null; isOverride: boolean };
  canEdit: boolean;
  saving: boolean;
  onSaveWeekday: (isoDate: string, patch: Partial<BusinessDayHours>) => Promise<void>;
  onSaveOverride: (
    isoDate: string,
    value: { isClosed: boolean; openTime: string; closeTime: string; label: string | null }
  ) => Promise<void>;
  onClearOverride: (isoDate: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { formatClockTimeCompact, formatDateShortWeekday } = useFormatters();
  const [open, setOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(status.closed);
  const [openTime, setOpenTime] = useState(status.hours?.openTime ?? '09:00');
  const [closeTime, setCloseTime] = useState(status.hours?.closeTime ?? '21:00');
  // A change means this date unless said otherwise. Editing one day in a week someone is
  // about to generate is nearly always about that day - a Tuesday closed for a burst pipe,
  // not a decision to shut every Tuesday - and getting it wrong that way is the recoverable
  // direction: a stray one-off affects one date, a stray pattern change affects every week.
  const [everyWeek, setEveryWeek] = useState(false);
  const [label, setLabel] = useState(status.label ?? '');
  const [editingLabel, setEditingLabel] = useState(false);

  /**
   * Seed the form from the day's current state, once per opening.
   *
   * Keyed on `open` alone. Listing the status fields as dependencies re-ran this while the
   * popover was still open - a save updates `status`, which fed the new values back into
   * the form mid-edit and made the next save write whatever the *previous* one had
   * produced. Adding a note then saved a closure, because `isClosed` had been re-seeded
   * from a day the earlier save had just closed.
   */
  useEffect(() => {
    if (!open) return;
    setIsClosed(status.closed);
    setOpenTime(status.hours?.openTime ?? '09:00');
    setCloseTime(status.hours?.closeTime ?? '21:00');
    setEveryWeek(false);
    setLabel(status.label ?? '');
    setEditingLabel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Always the hours, or "Closed" - the label now lives above the box, so it no longer
  // competes with the one thing this row exists to show.
  // Locale-aware: "9a – 9p" in the US, "09 – 21" in the UK. formatTimeShort was a
  // hardcoded 24-hour form, which showed UK times to US users.
  const summary = status.closed
    ? t('schedule.businessHoursClosed')
    : status.hours
      ? `${formatClockTimeCompact(status.hours.openTime)} – ${formatClockTimeCompact(status.hours.closeTime)}`
      : '—';

  const handleSave = async () => {
    const trimmed = label.trim();

    if (everyWeek) {
      // The weekday pattern carries no label - it describes what the business normally
      // does, which needs no reason. An existing one-off on this date is cleared, or the
      // pattern change would sit behind it and appear not to have worked.
      if (status.isOverride) await onClearOverride(isoDate);
      await onSaveWeekday(isoDate, { isClosed, openTime, closeTime });
    } else {
      await onSaveOverride(isoDate, {
        isClosed,
        openTime,
        closeTime,
        label: trimmed || null,
      });
    }
    setOpen(false);
  };

  // "Mon, 5 Oct" / "Mon, Oct 5" rather than the bare "Monday 5", which read as a
  // day-of-month with no month and differed from every other date on the page.
  const dateLabel = formatDateShortWeekday(date);

  return (
    <Popover open={open} onOpenChange={canEdit ? setOpen : undefined}>
      <PopoverTrigger asChild>
        {/* A plain <button>: the shared <Button> is not wrapped in forwardRef, so asChild
            cannot attach the trigger ref and the popover never positions itself. */}
        <button
          type="button"
          disabled={!canEdit || saving}
          // The note leads the tooltip where there is one, since on an open day the
          // summary shows hours and the note has nowhere else to appear.
          title={
            status.label
              ? `${status.label}${canEdit ? ` — ${t('schedule.businessHoursEditDay')}` : ''}`
              : canEdit
                ? t('schedule.businessHoursEditDay')
                : t('schedule.businessHoursReadOnlyHint')
          }
          // A one-off keeps a dashed border - it still differs from the weekly pattern -
          // but no longer takes amber text, since the label above now says what it is and
          // two markers for one fact read as two facts.
          className={`inline-flex items-center justify-center rounded h-6 w-6 shrink-0 transition-colors ${
            canEdit
              ? 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 cursor-pointer'
              : 'text-neutral-300 cursor-default'
          }`}
        >
          {/* A pencil rather than an ellipsis: the row has exactly one action, and
              "edit" is what it is - an overflow glyph implies a menu of choices. */}
          <Pencil className="w-3 h-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="center" collisionPadding={12} className="w-60 p-3">
        <div className="flex flex-col gap-2.5">
          {/* The date names what is being edited; the label sits beside it rather than
              below the controls, because it describes the day as a whole - open or shut,
              one-off or not - and is not a step in setting the hours. */}
          <div className="flex items-center gap-2 min-h-6">
            <span className="text-xs font-medium text-neutral-900 shrink-0">{dateLabel}</span>
            {/* Quiet until wanted: most days never carry a label, and a permanently open
                input with placeholder text pulls the eye every time the popover opens.
                The button gives way to the field on click, and a day that already has a
                label opens straight into it. */}
            {editingLabel || label ? (
              <Input
                autoFocus={editingLabel}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => setEditingLabel(false)}
                placeholder={t('schedule.businessHoursLabelPlaceholder')}
                // md:text-sm on the shared Input beats a bare text-xs at this width, so
                // the typed value came out 14px next to 12px labels; md:text-xs wins it
                // back. The placeholder is an example rather than a value, so it sits
                // smaller and lighter still and reads as a hint.
                className="h-6 text-xs md:text-xs px-1.5 flex-1 min-w-0 placeholder:text-[10px] placeholder:text-neutral-400"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingLabel(true)}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {t('schedule.businessHoursAddLabel')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!isClosed} onCheckedChange={(c: boolean) => setIsClosed(!c)} />
            <span className="text-xs text-neutral-600">
              {isClosed ? t('schedule.businessHoursClosed') : t('schedule.businessHoursOpen')}
            </span>
          </div>

          {!isClosed && (
            <div className="flex items-center gap-1.5">
              <PopoverHourSelect value={openTime} onChange={setOpenTime} />
              <span className="text-xs text-neutral-400">–</span>
              <PopoverHourSelect value={closeTime} onChange={setCloseTime} />
            </div>
          )}

          <div className="border-t border-neutral-200 pt-2 flex flex-col gap-2">
            {/* Opt in to changing the pattern. Unticked - the default - the edit is a
                one-off on this date, which is what editing a day from the week you are
                about to generate almost always means. */}
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={everyWeek}
                onCheckedChange={(c: boolean | string) => setEveryWeek(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-neutral-600 leading-snug">
                {t('schedule.businessHoursEveryWeek', { day: FULL_WEEKDAY[date.getDay()] })}
              </span>
            </label>

          </div>

          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Time picker sized for the popover, where there is room for the full "HH:mm". */
function PopoverHourSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 flex-1 text-xs px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-56">
        {HOUR_OPTIONS.map((time) => (
          <SelectItem key={time} value={time} className="text-xs">
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
