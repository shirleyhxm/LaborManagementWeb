import { DAYS_OF_WEEK } from '../types/businessHours';
import type { BusinessDayHours } from '../types/businessHours';

const SHORT_DAY: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

/**
 * "09:00" as "9", "09:30" as "9:30" - the minutes only earn their space when set.
 *
 * Deliberately not 12-hour: the summary sits in a toolbar where "9am-9pm" is half again
 * as long as "9-9", and the grid axis it describes is already 24-hour.
 */
export function formatTimeShort(time: string): string {
  const [h, m] = time.split(':');
  const hour = Number(h);
  return m && m !== '00' ? `${hour}:${m}` : `${hour}`;
}

/** One run of consecutive days sharing the same hours. */
interface DayRun {
  start: string;
  end: string;
  label: string;
}

function describe(day: BusinessDayHours): string {
  return day.isClosed
    ? 'Closed'
    : `${formatTimeShort(day.openTime)}-${formatTimeShort(day.closeTime)}`;
}

/**
 * Group the week into runs of consecutive days that share hours.
 *
 * Runs rather than distinct values: a business open 9-5 on Monday and Friday but 10-4
 * between is three runs, not two, because "Mon, Fri" is not a range anyone reads quickly.
 */
function toRuns(week: BusinessDayHours[]): DayRun[] {
  const ordered = DAYS_OF_WEEK.map((d) => week.find((w) => w.dayOfWeek === d)).filter(
    (d): d is BusinessDayHours => Boolean(d)
  );
  if (ordered.length === 0) return [];

  const runs: DayRun[] = [];
  ordered.forEach((day) => {
    const label = describe(day);
    const last = runs[runs.length - 1];
    if (last && last.label === label) {
      last.end = SHORT_DAY[day.dayOfWeek];
    } else {
      runs.push({
        start: SHORT_DAY[day.dayOfWeek],
        end: SHORT_DAY[day.dayOfWeek],
        label,
      });
    }
  });
  return runs;
}

function renderRun(run: DayRun): string {
  const days = run.start === run.end ? run.start : `${run.start}-${run.end}`;
  return `${days} ${run.label}`;
}

/**
 * The week in one line, for the button that opens the editor.
 *
 * Collapses to "Daily 9-9" when every day matches, and to two runs where the week splits
 * cleanly (the common weekday/weekend shape). Past that it says "Varies" rather than
 * spilling a third clause into a toolbar: the full week is one click away, and a summary
 * nobody can read at a glance is worse than one that admits it.
 */
export function summarizeWeek(week: BusinessDayHours[]): string {
  const runs = toRuns(week);
  if (runs.length === 0) return 'Not set';

  if (runs.length === 1) {
    return runs[0].label === 'Closed' ? 'Closed all week' : `Daily ${runs[0].label}`;
  }

  if (runs.length === 2) {
    return runs.map(renderRun).join(' · ');
  }

  return 'Varies';
}
