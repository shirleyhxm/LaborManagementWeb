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
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  isClosed: boolean;
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

/** The open window on a date, or null when the business is shut. */
export interface ResolvedHours {
  openTime: string;
  closeTime: string;
}
