import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { toIsoDate } from '../hooks/useBusinessHours';
import { useBusinessHours } from '../contexts/BusinessHoursContext';
import { summarizeWeek } from '../utils/businessHoursSummary';
import { useFormatters } from '../hooks/useFormatters';
import { DAYS_OF_WEEK } from '../types/businessHours';
import type { BusinessDayHours, DayOfWeek } from '../types/businessHours';

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
 * Every half hour of the day, plus 24:00 for a business that closes at midnight.
 *
 * "24:00" is not a LocalTime the backend can parse directly - parseFlexibleTime maps it to
 * midnight - but it is what someone means when they say they close at the end of the day,
 * and offering "00:00" instead reads as opening rather than closing.
 */
const TIME_OPTIONS = (() => {
  const times: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  times.push('24:00');
  return times;
})();

/**
 * Business hours configuration, opened from the schedule header.
 *
 * A popover rather than a settings page: these change perhaps twice a year, so they do not
 * earn a permanent place in the navigation, but they belong within reach of the schedule
 * they govern. The trigger doubles as the display, so the current hours are readable
 * without opening anything.
 */
export function BusinessHoursPopover() {
  const { user } = useAuth();
  const { formatClockTimeCompact } = useFormatters();
  const { week, overrides, loading, updateWeek, saveOverride, deleteOverride } =
    useBusinessHours();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BusinessDayHours[]>([]);
  const [saving, setSaving] = useState(false);
  const [exceptionsOpen, setExceptionsOpen] = useState(false);

  // New-exception form
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newClosed, setNewClosed] = useState(true);
  const [newOpenTime, setNewOpenTime] = useState('09:00');
  const [newCloseTime, setNewCloseTime] = useState('17:00');

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
              openTime: monday.openTime,
              closeTime: monday.closeTime,
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

  const handleAddException = async () => {
    if (!newDate) {
      toast.error('Pick a date for the exception');
      return;
    }
    try {
      setSaving(true);
      await saveOverride({
        date: newDate,
        isClosed: newClosed,
        openTime: newOpenTime,
        closeTime: newCloseTime,
        label: newLabel || null,
      });
      toast.success('Exception saved');
      setNewDate('');
      setNewLabel('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save exception');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id?: string) => {
    if (!id) return;
    try {
      await deleteOverride(id);
      toast.success('Exception removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove exception');
    }
  };

  // Past holidays are noise once they have gone by - the list is for what is coming.
  const upcoming = useMemo(() => {
    const today = toIsoDate(new Date());
    return overrides.filter((o) => o.date >= today);
  }, [overrides]);

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
          {upcoming.length > 0 && (
            <span className="hidden md:inline text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
              {upcoming.length}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {/* collisionPadding keeps the panel inside the viewport rather than flipping it off
          the top edge, and the max-height lets a week plus a long exception list scroll
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
            <div key={day.dayOfWeek} className="flex items-center gap-2">
              <span className="w-9 text-xs font-medium text-neutral-700">
                {DAY_LABEL[day.dayOfWeek]}
              </span>

              <Switch
                checked={!day.isClosed}
                disabled={!canEdit}
                onCheckedChange={(checked: boolean) =>
                  patchDay(day.dayOfWeek, { isClosed: !checked })
                }
              />

              {day.isClosed ? (
                <span className="flex-1 text-xs text-neutral-400">Closed</span>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <TimeSelect
                    value={day.openTime}
                    disabled={!canEdit}
                    onChange={(v) => patchDay(day.dayOfWeek, { openTime: v })}
                  />
                  <span className="text-xs text-neutral-400">–</span>
                  <TimeSelect
                    value={day.closeTime}
                    disabled={!canEdit}
                    onChange={(v) => patchDay(day.dayOfWeek, { closeTime: v })}
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

        <Collapsible open={exceptionsOpen} onOpenChange={setExceptionsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 border-t border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <span>Holidays &amp; exceptions</span>
              <span className="flex items-center gap-1 text-neutral-500">
                {upcoming.length > 0 && <span>{upcoming.length} upcoming</span>}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${exceptionsOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 py-2 space-y-2 border-t border-neutral-100">
              {upcoming.length === 0 && (
                <p className="text-xs text-neutral-500">
                  No upcoming exceptions. Add one for a holiday or a one-off closure.
                </p>
              )}

              {upcoming.map((o) => (
                <div
                  key={o.id ?? o.date}
                  className="flex items-center gap-2 text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800">{o.date}</div>
                    <div className="text-neutral-500 truncate">
                      {o.isClosed ? 'Closed' : `${o.openTime}–${o.closeTime}`}
                      {o.label ? ` · ${o.label}` : ''}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteException(o.id)}
                      className="text-neutral-400 hover:text-red-600 shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {canEdit && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={!newClosed} onCheckedChange={(c: boolean) => setNewClosed(!c)} />
                    {newClosed ? (
                      <span className="text-xs text-neutral-500 flex-1">Closed all day</span>
                    ) : (
                      <div className="flex items-center gap-1 flex-1">
                        <TimeSelect value={newOpenTime} onChange={setNewOpenTime} />
                        <span className="text-xs text-neutral-400">–</span>
                        <TimeSelect value={newCloseTime} onChange={setNewCloseTime} />
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs shrink-0"
                      onClick={handleAddException}
                      disabled={saving || !newDate}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {canEdit && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-neutral-200">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 text-xs px-2 flex-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-56">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t} className="text-xs">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
