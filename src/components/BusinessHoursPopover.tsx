import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useBusinessHours } from '../contexts/BusinessHoursContext';
import { summarizeWeek } from '../utils/businessHoursSummary';
import { useFormatters } from '../hooks/useFormatters';
import { DAYS_OF_WEEK, intervalsOf } from '../types/businessHours';
import { OpenIntervalsEditor } from './OpenIntervalsEditor';
import { intervalProblem } from '../utils/businessHoursIntervals';
import type { BusinessDayHours, DayOfWeek, OpenInterval } from '../types/businessHours';

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];


/**
 * Business hours configuration, opened from the schedule header.
 *
 * A popover rather than a settings page: these change perhaps twice a year, so they do not
 * earn a permanent place in the navigation, but they belong within reach of the schedule
 * they govern. The trigger doubles as the display, so the current hours are readable
 * without opening anything.
 */
/** Stretches plus the span they imply, for a day being edited. */
function spanOf(intervals: OpenInterval[]): Pick<BusinessDayHours, 'openTime' | 'closeTime' | 'intervals'> {
  return {
    openTime: intervals[0].openTime,
    closeTime: intervals[intervals.length - 1].closeTime,
    intervals,
  };
}

export function BusinessHoursPopover() {
  const { user } = useAuth();
  const { formatClockTimeCompact } = useFormatters();
  const { week, loading, updateWeek } = useBusinessHours();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BusinessDayHours[]>([]);
  const [saving, setSaving] = useState(false);

  // Only the owner may change trading hours; a manager still needs to read them to make
  // sense of the schedule, so they get the same popover without the controls.
  const canEdit = user?.role === UserRole.ADMIN;

  // Re-seed the draft whenever the popover opens, so an abandoned edit does not persist
  // into the next time it is opened.
  useEffect(() => {
    if (open) setDraft(week);
  }, [open, week]);

  const summary = useMemo(
    () => summarizeWeek(week, formatClockTimeCompact),
    [week, formatClockTimeCompact]
  );

  const ordered = useMemo(
    () =>
      DAYS_OF_WEEK.map(
        (day) =>
          draft.find((d) => d.dayOfWeek === day) ?? {
            dayOfWeek: day,
            openTime: '09:00',
            closeTime: '21:00',
            isClosed: false,
          }
      ),
    [draft]
  );

  const dirty = useMemo(
    () => JSON.stringify(ordered) !== JSON.stringify(
      DAYS_OF_WEEK.map((day) => week.find((d) => d.dayOfWeek === day)).filter(Boolean)
    ),
    [ordered, week]
  );

  // Held back while any open day has hours the server would reject; the editor says why.
  const hasProblem = ordered.some((d) => !d.isClosed && intervalProblem(intervalsOf(d)) !== null);

  const patchDay = (day: DayOfWeek, patch: Partial<BusinessDayHours>) => {
    setDraft(ordered.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)));
  };

  const copyMondayToWeekdays = () => {
    const monday = ordered.find((d) => d.dayOfWeek === 'MONDAY');
    if (!monday) return;
    setDraft(
      ordered.map((d) =>
        WEEKDAYS.includes(d.dayOfWeek)
          ? {
              ...d,
              ...spanOf(intervalsOf(monday)),
              isClosed: monday.isClosed,
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateWeek(ordered);
      toast.success('Business hours updated');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save business hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* A plain <button> rather than the shared <Button>: that component is not wrapped
          in forwardRef, so `asChild` cannot attach the trigger ref and the popover never
          opens - it renders off-screen at translate(0,-200%), never having measured the
          trigger. Styled to match a small outline Button. Same reason as the one in
          DateOfBirthPicker. */}
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Business hours"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors outline-none hover:bg-neutral-50 focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200"
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">
            {loading ? 'Hours…' : summary}
          </span>
        </button>
      </PopoverTrigger>

      {/* collisionPadding keeps the panel inside the viewport rather than flipping it off
          the top edge, and the max-height lets a week of split days scroll
          instead of overflowing on a short window. */}
      <PopoverContent
        align="end"
        side="bottom"
        collisionPadding={12}
        className="w-[360px] p-0 max-h-[min(80vh,520px)] overflow-y-auto"
      >
        <div className="px-3 py-2.5 border-b border-neutral-200">
          <div className="text-sm font-medium text-neutral-900">Business hours</div>
          <div className="text-xs text-neutral-500">
            {canEdit
              ? 'Closed hours are shaded on the schedule.'
              : 'Only the account owner can change these.'}
          </div>
        </div>

        <div className="px-3 py-2 space-y-1">
          {ordered.map((day) => (
            <div key={day.dayOfWeek} className="flex items-start gap-2">
              <span className="w-9 text-xs font-medium text-neutral-700 leading-7">
                {DAY_LABEL[day.dayOfWeek]}
              </span>

              <Switch
                className="mt-1.5"
                checked={!day.isClosed}
                disabled={!canEdit}
                onCheckedChange={(checked: boolean) =>
                  patchDay(day.dayOfWeek, { isClosed: !checked })
                }
              />

              {day.isClosed ? (
                <span className="flex-1 text-xs text-neutral-400 leading-7">Closed</span>
              ) : (
                // The same stretch editor as the schedule creator's, so a day that closes
                // over lunch can be set - and kept - from here too. Editing only open and
                // close would have been silently undone on save: the server lets the
                // stretches win, and a split day carries them.
                <div className="flex-1 min-w-0">
                  <OpenIntervalsEditor
                    intervals={intervalsOf(day)}
                    disabled={!canEdit}
                    onChange={(intervals) => patchDay(day.dayOfWeek, spanOf(intervals))}
                  />
                </div>
              )}
            </div>
          ))}

          {canEdit && (
            <button
              type="button"
              onClick={copyMondayToWeekdays}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline pt-1"
            >
              Copy Monday to all weekdays
            </button>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-neutral-200">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty || hasProblem}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
