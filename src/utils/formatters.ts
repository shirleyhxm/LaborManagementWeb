import type { RegionDefinition } from '../i18n/regions';

/**
 * Locale-aware formatting primitives.
 *
 * These are plain functions taking an explicit region so they can be used from
 * services and tests. Components should reach for the `useFormatters` hook,
 * which binds the active region for them.
 *
 * `Intl` formatters are relatively expensive to construct, and these run inside
 * grid cells rendered hundreds of times per schedule, so instances are cached
 * per (locale, options) pair.
 */

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getNumberFormat(locale: string, options: Intl.NumberFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

function getDateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatCache.set(key, formatter);
  }
  return formatter;
}

/** Accepts what the API actually returns: Date, ISO string, or epoch ms. */
export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Money, with the region's currency and symbol placement.
 * $1,234.50 in the US; £1,234.50 in the UK.
 */
export function formatCurrency(
  region: RegionDefinition,
  amount: number,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
): string {
  return getNumberFormat(region.code, {
    style: 'currency',
    currency: region.currency,
    ...options,
  }).format(amount);
}

/**
 * Money without the pennies — for dashboard tiles and chart axes where the
 * fractional part is noise.
 */
export function formatCurrencyCompact(region: RegionDefinition, amount: number): string {
  return formatCurrency(region, amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * The region's bare currency symbol ("$", "£") for labels that place it
 * inline, e.g. "Pay Rate (£/hr)". Taken from `Intl` rather than a hardcoded
 * map so it stays correct for any currency a new region introduces.
 */
export function getCurrencySymbol(region: RegionDefinition): string {
  const parts = getNumberFormat(region.code, {
    style: 'currency',
    currency: region.currency,
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? region.currency;
}

/** A plain number with the region's grouping and decimal separators. */
export function formatNumber(
  region: RegionDefinition,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return getNumberFormat(region.code, options).format(value);
}

export function formatPercent(
  region: RegionDefinition,
  /** A ratio in 0–1, not an already-multiplied percentage. */
  ratio: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return getNumberFormat(region.code, {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options,
  }).format(ratio);
}

/** 1/20/2025 in the US; 20/01/2025 in the UK. */
export function formatDate(
  region: RegionDefinition,
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' },
): string {
  return getDateFormat(region.code, options).format(toDate(value));
}

/** "Jan 20, 2025" / "20 Jan 2025" — the default for lists and cards. */
export function formatDateMedium(region: RegionDefinition, value: DateInput): string {
  return formatDate(region, value, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "Mon, Jan 20" / "Mon, 20 Jan" — compact, for schedule columns. */
export function formatDateShortWeekday(region: RegionDefinition, value: DateInput): string {
  return formatDate(region, value, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "January 20, 2025" / "20 January 2025". */
export function formatDateLong(region: RegionDefinition, value: DateInput): string {
  return formatDate(region, value, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** 2:30 PM in the US; 14:30 in the UK. */
export function formatTime(
  region: RegionDefinition,
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return getDateFormat(region.code, {
    ...clockOptions(region),
    ...options,
  }).format(toDate(value));
}

/**
 * The hour/minute options for a region's clock convention.
 *
 * A 24-hour clock is written zero-padded ("09:00", not "9:00"), which needs
 * `hour: '2-digit'`; a 12-hour clock is not ("9:00 AM"), which needs
 * `hour: 'numeric'`.
 */
function clockOptions(region: RegionDefinition): Intl.DateTimeFormatOptions {
  return {
    hour: region.use12HourClock ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: region.use12HourClock,
  };
}

export function formatDateTime(region: RegionDefinition, value: DateInput): string {
  return getDateFormat(region.code, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...clockOptions(region),
  }).format(toDate(value));
}

/**
 * Formats a stored "HH:MM" (or "HH:MM:SS") clock string.
 *
 * Shift times are wall-clock strings with no date attached, so they must not
 * go through `new Date(...)` — that would drag the browser's timezone in and
 * shift a 09:00 shift by the UTC offset. The parts are placed on an arbitrary
 * fixed date purely so `Intl` can render them.
 */
export function formatClockTime(region: RegionDefinition, time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const reference = new Date(2000, 0, 1, hours % 24, minutes);
  return getDateFormat(region.code, clockOptions(region)).format(reference);
}

/**
 * The abbreviated clock label used inside schedule blocks, where horizontal
 * space is scarce: "2p" / "2:30p" in the US, "14" / "14:30" in the UK.
 * Minutes appear only when the time isn't on the hour.
 */
export function formatClockTimeCompact(region: RegionDefinition, time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  if (!region.use12HourClock) {
    const h24 = hours % 24;
    return minutes
      ? `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      : String(h24).padStart(2, '0');
  }

  const suffix = hours < 12 || hours === 24 ? 'a' : 'p';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes ? `${h12}:${String(minutes).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

/**
 * The hour ruler above the schedule grid. 24-hour regions get a bare "14",
 * 12-hour regions the familiar "2p".
 */
export function formatHourLabel(region: RegionDefinition, hour: number): string {
  const h = hour % 24;
  if (!region.use12HourClock) return String(h).padStart(2, '0');
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

/** Localized weekday names, ordered from the region's first day of the week. */
export function getWeekdayNames(
  region: RegionDefinition,
  format: 'long' | 'short' | 'narrow' = 'short',
): string[] {
  const formatter = getDateFormat(region.code, { weekday: format });
  // 2024-01-07 is a Sunday, so adding the index walks the week from Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    formatter.format(new Date(2024, 0, 7 + ((i + region.weekStartsOn) % 7))),
  );
}

/**
 * Localized weekday names keyed by the backend's day-name enum
 * ("MONDAY" → "Mon" / "Mon."), independent of which day the region's week
 * starts on.
 */
export function getWeekdayNamesByEnum(
  region: RegionDefinition,
  format: 'long' | 'short' | 'narrow' = 'short',
): Record<string, string> {
  const formatter = getDateFormat(region.code, { weekday: format });
  const names: Record<string, string> = {};
  DAY_ENUM_ORDER.forEach((day, index) => {
    // 2024-01-07 is a Sunday, matching index 0.
    names[day] = formatter.format(new Date(2024, 0, 7 + index));
  });
  return names;
}

/** Sunday-first, matching `java.time.DayOfWeek` values used by the API. */
export const DAY_ENUM_ORDER = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** Localized month names, January first. */
export function getMonthNames(
  region: RegionDefinition,
  format: 'long' | 'short' = 'short',
): string[] {
  const formatter = getDateFormat(region.code, { month: format });
  return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2024, i, 1)));
}

/**
 * A week range with the redundant parts elided:
 * "Jan 20 – 26, 2025" / "20 – 26 Jan 2025" when the month matches,
 * widening to full dates when the range straddles a month or year boundary.
 */
export function formatDateRange(
  region: RegionDefinition,
  start: DateInput,
  end: DateInput,
): string {
  const startDate = toDate(start);
  const endDate = toDate(end);

  // formatRange handles the eliding, and knows where each locale puts the day
  // relative to the month.
  return getDateFormat(region.code, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).formatRange(startDate, endDate);
}
