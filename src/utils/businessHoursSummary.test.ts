import { describe, it, expect } from 'vitest';

import { DAYS_OF_WEEK } from '../types/businessHours';
import type { BusinessDayHours, DayOfWeek } from '../types/businessHours';
import { summarizeWeek, formatTimeShort } from './businessHoursSummary';

const week = (
  overrides: Partial<Record<DayOfWeek, Partial<BusinessDayHours>>> = {}
): BusinessDayHours[] =>
  DAYS_OF_WEEK.map((dayOfWeek) => ({
    dayOfWeek,
    openTime: '09:00',
    closeTime: '21:00',
    isClosed: false,
    ...overrides[dayOfWeek],
  }));

describe('formatTimeShort', () => {
  it('drops the minutes on the hour', () => {
    expect(formatTimeShort('09:00')).toBe('9');
    expect(formatTimeShort('21:00')).toBe('21');
  });

  it('keeps minutes when they are set', () => {
    expect(formatTimeShort('09:30')).toBe('9:30');
  });
});

describe('summarizeWeek', () => {
  it('collapses a uniform week', () => {
    expect(summarizeWeek(week())).toBe('Daily 9-21');
  });

  it('names the two runs of a weekday/weekend split', () => {
    const summary = summarizeWeek(
      week({
        SATURDAY: { openTime: '10:00', closeTime: '16:00' },
        SUNDAY: { openTime: '10:00', closeTime: '16:00' },
      })
    );
    expect(summary).toBe('Mon-Fri 9-21 · Sat-Sun 10-16');
  });

  it('reports a closed run as closed', () => {
    const summary = summarizeWeek(week({ SUNDAY: { isClosed: true } }));
    expect(summary).toBe('Mon-Sat 9-21 · Sun Closed');
  });

  it('gives up on a genuinely irregular week', () => {
    // Three runs: the summary would need three clauses to be accurate, which does not
    // fit a toolbar, so it says so instead of misleading.
    const summary = summarizeWeek(
      week({
        WEDNESDAY: { openTime: '10:00', closeTime: '16:00' },
        SATURDAY: { isClosed: true },
      })
    );
    expect(summary).toBe('Varies');
  });

  it('does not merge non-consecutive days that happen to match', () => {
    // Mon and Fri share hours but Tue-Thu do not: "Mon, Fri" is not a range, so this
    // must not collapse into one run.
    const summary = summarizeWeek(
      week({
        TUESDAY: { openTime: '10:00', closeTime: '16:00' },
        WEDNESDAY: { openTime: '10:00', closeTime: '16:00' },
        THURSDAY: { openTime: '10:00', closeTime: '16:00' },
      })
    );
    expect(summary).toBe('Varies');
  });

  it('handles a week that is closed throughout', () => {
    const allClosed = week();
    allClosed.forEach((d) => {
      d.isClosed = true;
    });
    expect(summarizeWeek(allClosed)).toBe('Closed all week');
  });

  it('spells out a day that closes in the middle', () => {
    const split = { intervals: [
      { openTime: '09:00', closeTime: '13:00' },
      { openTime: '14:00', closeTime: '18:00' },
    ] };
    expect(summarizeWeek(week({ MONDAY: split, TUESDAY: split, WEDNESDAY: split,
      THURSDAY: split, FRIDAY: split, SATURDAY: split, SUNDAY: split })))
      .toBe('Daily 9-13, 14-18');
  });

  it('does not group a split day with a straight-through one of the same span', () => {
    // Both span 9-18; only the stretches tell them apart.
    const summary = summarizeWeek(week({
      MONDAY: { openTime: '09:00', closeTime: '18:00' },
      TUESDAY: { openTime: '09:00', closeTime: '18:00', intervals: [
        { openTime: '09:00', closeTime: '13:00' },
        { openTime: '14:00', closeTime: '18:00' },
      ] },
    }));
    expect(summary).not.toBe('Daily 9-18');
  });

  it('reports an empty week rather than throwing', () => {
    expect(summarizeWeek([])).toBe('Not set');
  });

  it('renders times through the formatter it is given', () => {
    // The trigger shows the viewer's region, so a US viewer must not see "9-21".
    const us = (time: string) => {
      const h = Number(time.split(':')[0]);
      const suffix = h < 12 ? 'a' : 'p';
      return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
    };
    expect(summarizeWeek(week(), us)).toBe('Daily 9a-9p');
  });
});
