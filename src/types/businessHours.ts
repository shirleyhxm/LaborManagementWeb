/**
 * Day names as the backend spells them (java.time.DayOfWeek).
 *
 * Ordered Monday-first, which is the order the editor renders. The week the *schedule*
 * starts on is a separate business setting (weekStartsOn) and does not change how the
 * hours editor is laid out.
 */
export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/** One continuous stretch of a day the business is open. "HH:mm" to "HH:mm". */
export interface OpenInterval {
  openTime: string;
  closeTime: string;
}

/**
 * When the business is open on one day of an ordinary week.
 *
 * `closeTime` may be earlier than `openTime`, meaning the day runs past midnight.
 *
 * A closed day keeps its times rather than blanking them, so reopening a day restores the
 * hours it last had instead of making the owner retype them.
 */
export interface BusinessDayHours {
  dayOfWeek: DayOfWeek;
  /** First opening of the day. With several stretches, this is the span's start. */
  openTime: string; // "HH:mm"
  /** Last closing of the day. With several stretches, this is the span's end. */
  closeTime: string; // "HH:mm"
  isClosed: boolean;
  /**
   * Every open stretch, in order - one for an ordinary day, two for a day that closes over
   * lunch. The server always fills this on responses; on writes it wins over openTime and
   * closeTime, which the server recomputes from it.
   */
  intervals?: OpenInterval[];
}

/**
 * A date whose hours differ from the weekly pattern.
 *
 * `label` is why: "Christmas Day" reads differently from the silent fact that the business
 * never opens on Sundays, and the schedule view shows the two differently.
 */
export interface BusinessHourOverride {
  id?: string;
  date: string; // ISO date (YYYY-MM-DD)
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
  label?: string | null;
  /** As BusinessDayHours.intervals. */
  intervals?: OpenInterval[];
}

/** The backend always returns all seven days, filled from defaults where unsaved. */
export interface BusinessHours {
  businessId: string;
  week: BusinessDayHours[];
  overrides: BusinessHourOverride[];
}

export interface UpdateBusinessHoursRequest {
  week: BusinessDayHours[];
}

/**
 * When the business is open on a date. `openTime`/`closeTime` are the span; `intervals`
 * are the stretches actually open inside it, always at least one.
 */
export interface ResolvedHours {
  openTime: string;
  closeTime: string;
  intervals: OpenInterval[];
}

/**
 * The stretches of a day, whether or not the server sent them.
 *
 * Falls back to the single openTime-closeTime stretch so a response from before stretches
 * existed - or a hand-built object in a test - still reads correctly.
 */
export function intervalsOf(hours: {
  openTime: string;
  closeTime: string;
  intervals?: OpenInterval[];
}): OpenInterval[] {
  return hours.intervals && hours.intervals.length > 0
    ? hours.intervals
    : [{ openTime: hours.openTime, closeTime: hours.closeTime }];
}
