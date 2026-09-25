import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { intervalProblem, nextInterval } from '../utils/businessHoursIntervals';
import type { OpenInterval } from '../types/businessHours';

/**
 * Every half hour, plus 24:00 for a business that closes at midnight.
 *
 * "24:00" is not a LocalTime the backend parses directly - parseFlexibleTime maps it to
 * midnight - but it is what someone means by closing at the end of the day, and offering
 * "00:00" instead reads as opening rather than closing. Shared by both hours editors so
 * they cannot offer different times for the same field.
 */
export const HOUR_OPTIONS = (() => {
  const times: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  times.push('24:00');
  return times;
})();

/**
 * The open stretches of one day, as a list of time pairs.
 *
 * One pair for an ordinary day; a second for a day that closes over lunch. Remove only
 * appears once there are two, so the list can never be emptied into a day that is open
 * with no hours - closing a day is the Open/Closed switch's job, not this one's.
 *
 * Problems are reported inline, in the terms the server would reject them in, and the
 * caller reads the same check to hold back Save.
 */
export function OpenIntervalsEditor({
  intervals,
  onChange,
  disabled,
}: {
  intervals: OpenInterval[];
  onChange: (intervals: OpenInterval[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const problem = intervalProblem(intervals);
  const next = nextInterval(intervals);

  const update = (index: number, patch: Partial<OpenInterval>) =>
    onChange(intervals.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  return (
    <div className="flex flex-col gap-1.5">
      {intervals.map((interval, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <HourSelect
            value={interval.openTime}
            disabled={disabled}
            onChange={(v) => update(index, { openTime: v })}
          />
          <span className="text-xs text-neutral-400">–</span>
          <HourSelect
            value={interval.closeTime}
            disabled={disabled}
            onChange={(v) => update(index, { closeTime: v })}
          />
          {intervals.length > 1 ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(intervals.filter((_, i) => i !== index))}
              title={t('schedule.businessHoursRemoveInterval')}
              className="inline-flex items-center justify-center rounded h-6 w-6 shrink-0 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            // Holds the column so a single pair lines up with a pair that has a remove.
            <span className="w-6 shrink-0" />
          )}
        </div>
      ))}

      {problem && (
        <p className="text-xs text-red-600">{t(`schedule.businessHoursProblem.${problem}`)}</p>
      )}

      {/* Quiet, like "Add label": most days have one stretch and never need this. Hidden
          rather than disabled when the day has no room left, since there is nothing the
          user could do to make it work. */}
      {next && !disabled && (
        <button
          type="button"
          onClick={() => onChange([...intervals, next])}
          className="self-start text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {t('schedule.businessHoursAddInterval')}
        </button>
      )}
    </div>
  );
}

function HourSelect({
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
