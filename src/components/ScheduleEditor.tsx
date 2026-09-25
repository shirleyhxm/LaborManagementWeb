import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Sparkles, Loader2, Calendar, ChevronDown, Pencil } from "lucide-react";
import type { Employee as EmployeeType } from "../types/employee";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useWeek } from "../contexts/WeekContext";
import { useFormatters } from "../hooks/useFormatters";
import { useBusinessHours } from "../contexts/BusinessHoursContext";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/auth";
import type { BusinessDayHours, OpenInterval, ResolvedHours } from "../types/businessHours";
import { OpenIntervalsEditor } from "./OpenIntervalsEditor";
import { intervalProblem } from "../utils/businessHoursIntervals";
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
  const saveDateOverride = async (isoDate: string, value: OverrideValue) => {
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
                    {/* text-neutral-700 to match the other values on this card. The
                        shared trigger inherits --foreground (oklch .145), a shade darker
                        than the dates and hours beside it; scoped here rather than
                        changed in ui/select.tsx, which nine other screens rely on. */}
                    <SelectTrigger className="text-neutral-700">
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
                  {/* The summary is the control. It used to be a read-only box whose
                      roster lived in a second card below, with drag-and-drop between two
                      lists - a lot of screen and a lot of gesture for what is a set of
                      checkboxes. */}
                  <EmployeePicker
                    employees={employees}
                    selectedIds={selectedEmployeeIds}
                    onChange={setSelectedEmployeeIds}
                  />
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
                        {/* Every stretch, not the span: "9:00 AM – 9:00 PM" for a day shut
                            13:00-14:00 would say the business trades straight through. Each
                            stretch keeps itself on one line and the list wraps between them,
                            so three stretches on a narrow card break at a comma rather than
                            mid-time. */}
                        <span
                          className={`text-sm flex flex-wrap gap-x-1 ${
                            status.closed ? 'text-neutral-400' : 'text-neutral-700'
                          }`}
                        >
                          {status.closed || !status.hours
                            ? status.closed
                              ? t('schedule.businessHoursClosed')
                              : '—'
                            : status.hours.intervals.map((stretch, i, all) => (
                                <span key={i} className="whitespace-nowrap">
                                  {formatClockTime(stretch.openTime)} – {formatClockTime(stretch.closeTime)}
                                  {i < all.length - 1 ? ',' : ''}
                                </span>
                              ))}
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

            {/* Beside the button rather than at the top of the card: it says what this
                click will use that is not on this card, which is worth knowing at the
                moment of pressing it and easy to skip over as an intro. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
              {/* A note, not a warning: nothing is wrong, it just says where two of the
                  inputs come from. Amber and a warning triangle both read as "something
                  needs attention here", which this does not.

                  Split around the link rather than one interpolated string, so the
                  destination is a real anchor and the two halves stay translatable. */}
              <span className="text-xs text-neutral-500">
                {t('schedule.rulesNoticeBefore')}{' '}
                <Link to="/rules" className="text-blue-600 hover:text-blue-700 hover:underline">
                  {t('schedule.rulesNoticeLink')}
                </Link>
                {t('schedule.rulesNoticeAfter')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

const FULL_WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** What saving a one-off for a date sends. */
interface OverrideValue {
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  intervals: OpenInterval[];
  label: string | null;
}

/**
 * The stretches to start the editor from: the day's own, or 9 to 5 for a day that has
 * none - a closed day with no remembered hours, reopened.
 */
function seedIntervals(hours: ResolvedHours | null): OpenInterval[] {
  return hours?.intervals?.length ? hours.intervals.map((it) => ({ ...it })) : [{ openTime: '09:00', closeTime: '17:00' }];
}

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
  status: { closed: boolean; hours: ResolvedHours | null; label: string | null; isOverride: boolean };
  canEdit: boolean;
  saving: boolean;
  onSaveWeekday: (isoDate: string, patch: Partial<BusinessDayHours>) => Promise<void>;
  onSaveOverride: (isoDate: string, value: OverrideValue) => Promise<void>;
  onClearOverride: (isoDate: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { formatDateShortWeekday } = useFormatters();
  const [open, setOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(status.closed);
  const [intervals, setIntervals] = useState<OpenInterval[]>(() => seedIntervals(status.hours));
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
    setIntervals(seedIntervals(status.hours));
    setEveryWeek(false);
    setLabel(status.label ?? '');
    setEditingLabel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    const trimmed = label.trim();

    // The span travels with the stretches so a reader that only knows open and close
    // still sees the right extent; the server recomputes it from the stretches anyway.
    const span = {
      openTime: intervals[0].openTime,
      closeTime: intervals[intervals.length - 1].closeTime,
      intervals,
    };

    if (everyWeek) {
      // The weekday pattern carries no label - it describes what the business normally
      // does, which needs no reason. An existing one-off on this date is cleared, or the
      // pattern change would sit behind it and appear not to have worked.
      if (status.isOverride) await onClearOverride(isoDate);
      await onSaveWeekday(isoDate, { isClosed, ...span });
    } else {
      await onSaveOverride(isoDate, { isClosed, ...span, label: trimmed || null });
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

      <PopoverContent align="center" collisionPadding={12} className="w-64 p-3">
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

          {!isClosed && <OpenIntervalsEditor intervals={intervals} onChange={setIntervals} />}

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
            {/* A closed day saves whatever stretches it had, so they are only checked
                while open - reopening restores them rather than asking for them again. */}
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={saving || (!isClosed && intervalProblem(intervals) !== null)}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Who this schedule covers, as a summary that opens the roster.
 *
 * Everyone is selected by default - the generator's own behaviour with a whole roster,
 * and the answer most weeks want - so the common case needs no interaction at all. The
 * summary says "All (4)" until someone narrows it, then counts what is left.
 */
function EmployeePicker({
  employees,
  selectedIds,
  onChange,
}: {
  employees: EmployeeType[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const allSelected = employees.length > 0 && selectedIds.length === employees.length;
  const summary = allSelected
    ? `All (${employees.length})`
    : `${selectedIds.length} of ${employees.length} selected`;

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* A plain <button>: the shared <Button> is not wrapped in forwardRef, so asChild
            cannot attach the trigger ref and the popover never positions itself. */}
        <button
          type="button"
          disabled={employees.length === 0}
          className="flex items-center justify-between gap-2 border border-neutral-200 rounded-md px-3 h-9 text-left transition-colors hover:border-neutral-400 disabled:cursor-default"
        >
          <span className="text-sm text-neutral-700 truncate">
            {employees.length === 0 ? '—' : summary}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
        </button>
      </PopoverTrigger>

      {/* z-50 on the portal wrapper is not enough here: the generate button below sits
          in the same stacking context and paints over the list. */}
      <PopoverContent align="start" collisionPadding={12} className="w-64 p-0 z-[60]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-200">
          <span className="text-xs font-medium text-neutral-900">{summary}</span>
          {/* One control rather than two: the label says what the click will do, so it
              never reads as a checkbox whose state is ambiguous mid-selection. */}
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : employees.map((e) => e.id))}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {employees.map((employee) => {
            const checked = selectedIds.includes(employee.id);
            return (
              <label
                key={employee.id}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-neutral-50 transition-colors"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(employee.id)} />
                <span className="text-xs text-neutral-800 flex-1 min-w-0 truncate">
                  {employee.fullName ?? `${employee.firstName} ${employee.lastName}`}
                </span>
                <span className="text-xs text-neutral-400 shrink-0">
                  {employee.normalPayRate != null ? `$${employee.normalPayRate}/hr` : ''}
                </span>
              </label>
            );
          })}
        </div>

        {selectedIds.length === 0 && (
          // Generation with nobody selected is refused on submit; saying so here is
          // cheaper than letting them press the button to find out.
          <p className="px-3 py-2 text-xs text-amber-700 border-t border-neutral-200">
            Select at least one employee.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
