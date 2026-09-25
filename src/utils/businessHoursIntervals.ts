import type { OpenInterval } from '../types/businessHours';

/**
 * Why a day's stretches could not be saved, or null if they can.
 *
 * Mirrors invalidIntervalsReason on the server so the editor can say what is wrong and
 * hold back Save, rather than sending the request to find out. The server still checks;
 * this is for the message, not the guarantee.
 *
 * Times are "HH:mm", zero-padded, so they order correctly as strings. "24:00" - offered
 * so a close at midnight reads as a close - sorts after every real time, and the server
 * stores it as midnight, which makes it a wrap: so it too is only allowed last.
 */
export type IntervalProblem = 'empty' | 'zeroLength' | 'wrapNotLast' | 'overlap';

export function intervalProblem(intervals: OpenInterval[]): IntervalProblem | null {
  if (intervals.length === 0) return 'empty';

  for (let i = 0; i < intervals.length; i += 1) {
    const { openTime, closeTime } = intervals[i];
    if (openTime === closeTime) return 'zeroLength';

    const wraps = closeTime < openTime || closeTime === '24:00';
    if (wraps && i !== intervals.length - 1) return 'wrapNotLast';

    if (i > 0 && openTime < intervals[i - 1].closeTime) return 'overlap';
  }
  return null;
}

/** "HH:mm" as minutes since midnight. "24:00" is 1440. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fromMinutes(minutes: number): string {
  if (minutes >= 24 * 60) return '24:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * A sensible stretch to add after the last one: an hour's break, then four hours - or up
 * to midnight, whichever comes first. Null when there is no room left in the day, so the
 * editor can hide the option rather than offer something it would then reject.
 *
 * An hour and four hours are guesses at the common case - a lunch closure, an afternoon
 * session - that the user adjusts; what matters is that the default is always valid.
 */
export function nextInterval(intervals: OpenInterval[]): OpenInterval | null {
  const last = intervals[intervals.length - 1];
  if (!last) return { openTime: '09:00', closeTime: '17:00' };

  // A last stretch that already runs past midnight leaves nothing after it.
  if (last.closeTime < last.openTime || last.closeTime === '24:00') return null;

  const start = toMinutes(last.closeTime) + 60;
  if (start >= 24 * 60) return null;
  const end = Math.min(start + 4 * 60, 24 * 60);
  return { openTime: fromMinutes(start), closeTime: fromMinutes(end) };
}
