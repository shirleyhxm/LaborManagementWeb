import { describe, it, expect } from 'vitest';

import { getRegion, resolveRegion } from '../i18n/regions';
import {
  formatClockTime,
  formatClockTimeCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatDateMedium,
  formatDateRange,
  formatHourLabel,
  formatPercent,
  getWeekdayNames,
} from './formatters';

const us = getRegion('en-US');
const gb = getRegion('en-GB');

describe('formatCurrency', () => {
  it('uses dollars for the US and pounds for the UK', () => {
    expect(formatCurrency(us, 1234.5)).toBe('$1,234.50');
    expect(formatCurrency(gb, 1234.5)).toBe('£1,234.50');
  });

  it('drops the fractional part in compact form', () => {
    expect(formatCurrencyCompact(us, 12450)).toBe('$12,450');
    expect(formatCurrencyCompact(gb, 12450)).toBe('£12,450');
  });
});

describe('formatDateMedium', () => {
  it('puts the month before the day in the US and after it in the UK', () => {
    const date = new Date(2025, 0, 20);
    expect(formatDateMedium(us, date)).toBe('Jan 20, 2025');
    expect(formatDateMedium(gb, date)).toBe('20 Jan 2025');
  });
});

describe('formatClockTime', () => {
  it('renders a 12-hour clock for the US and a 24-hour clock for the UK', () => {
    // Non-breaking space before the meridiem in recent ICU versions.
    expect(formatClockTime(us, '14:30').replace(/ | /g, ' ')).toBe('2:30 PM');
    expect(formatClockTime(gb, '14:30')).toBe('14:30');
  });

  it('formats a stored clock string without applying a timezone offset', () => {
    // The bug this guards: routing "09:00" through `new Date()` would shift it
    // by the runner's UTC offset.
    expect(formatClockTime(gb, '09:00')).toBe('09:00');
    expect(formatClockTime(gb, '09:00:00')).toBe('09:00');
  });

  it('returns the input unchanged when it is not a clock string', () => {
    expect(formatClockTime(gb, 'not-a-time')).toBe('not-a-time');
  });
});

describe('formatClockTimeCompact', () => {
  it('abbreviates to a meridiem suffix in the US', () => {
    expect(formatClockTimeCompact(us, '14:00')).toBe('2p');
    expect(formatClockTimeCompact(us, '14:30')).toBe('2:30p');
    expect(formatClockTimeCompact(us, '00:00')).toBe('12a');
  });

  it('keeps 24-hour digits in the UK', () => {
    expect(formatClockTimeCompact(gb, '14:00')).toBe('14');
    expect(formatClockTimeCompact(gb, '14:30')).toBe('14:30');
    expect(formatClockTimeCompact(gb, '09:00')).toBe('09');
  });
});

describe('formatHourLabel', () => {
  it('labels the schedule ruler per the region clock', () => {
    expect(formatHourLabel(us, 0)).toBe('12a');
    expect(formatHourLabel(us, 14)).toBe('2p');
    expect(formatHourLabel(gb, 0)).toBe('00');
    expect(formatHourLabel(gb, 14)).toBe('14');
  });
});

describe('getWeekdayNames', () => {
  it('starts the week on Sunday in the US and Monday in the UK', () => {
    expect(getWeekdayNames(us)[0]).toBe('Sun');
    expect(getWeekdayNames(gb)[0]).toBe('Mon');
  });

  it('returns seven distinct days', () => {
    expect(new Set(getWeekdayNames(gb)).size).toBe(7);
  });
});

describe('formatDateRange', () => {
  it('elides the repeated month within a single week', () => {
    const start = new Date(2025, 0, 20);
    const end = new Date(2025, 0, 26);
    expect(formatDateRange(us, start, end)).toContain('Jan 20');
    expect(formatDateRange(gb, start, end)).toContain('20');
  });
});

describe('formatPercent', () => {
  it('formats a 0-1 ratio as a percentage', () => {
    expect(formatPercent(us, 0.83)).toBe('83%');
    expect(formatPercent(gb, 0.83)).toBe('83%');
  });
});

describe('resolveRegion', () => {
  it('matches supported tags exactly, case-insensitively', () => {
    expect(resolveRegion('en-GB')).toBe('en-GB');
    expect(resolveRegion('en-gb')).toBe('en-GB');
    expect(resolveRegion('en-US')).toBe('en-US');
  });

  it('maps other English locales to British conventions', () => {
    expect(resolveRegion('en-AU')).toBe('en-GB');
    expect(resolveRegion('en-IE')).toBe('en-GB');
  });

  it('falls back to the default for unknown or missing tags', () => {
    expect(resolveRegion('fr-FR')).toBe('en-US');
    expect(resolveRegion(null)).toBe('en-US');
    expect(resolveRegion(undefined)).toBe('en-US');
  });
});
