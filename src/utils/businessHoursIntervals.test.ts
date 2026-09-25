import { describe, it, expect } from 'vitest';

import { intervalProblem, nextInterval } from './businessHoursIntervals';

const s = (openTime: string, closeTime: string) => ({ openTime, closeTime });

describe('intervalProblem', () => {
  it('accepts a single stretch', () => {
    expect(intervalProblem([s('09:00', '17:00')])).toBeNull();
  });

  it('accepts stretches in order with a gap', () => {
    expect(intervalProblem([s('09:00', '13:00'), s('14:00', '18:00')])).toBeNull();
  });

  it('accepts stretches that touch', () => {
    // Pointless but harmless: generation merges the shifts back together.
    expect(intervalProblem([s('09:00', '13:00'), s('13:00', '18:00')])).toBeNull();
  });

  it('rejects overlapping stretches', () => {
    expect(intervalProblem([s('09:00', '13:00'), s('12:00', '18:00')])).toBe('overlap');
  });

  it('rejects stretches out of order', () => {
    expect(intervalProblem([s('14:00', '18:00'), s('09:00', '13:00')])).toBe('overlap');
  });

  it('rejects a stretch of no length', () => {
    expect(intervalProblem([s('09:00', '09:00')])).toBe('zeroLength');
  });

  it('lets the last stretch run past midnight', () => {
    expect(intervalProblem([s('11:00', '15:00'), s('18:00', '01:00')])).toBeNull();
  });

  it('does not let an earlier stretch run past midnight', () => {
    expect(intervalProblem([s('22:00', '02:00'), s('09:00', '12:00')])).toBe('wrapNotLast');
  });

  it('treats a 24:00 close as running to midnight, so only last', () => {
    expect(intervalProblem([s('18:00', '24:00')])).toBeNull();
    expect(intervalProblem([s('18:00', '24:00'), s('09:00', '12:00')])).toBe('wrapNotLast');
  });

  it('reports an empty day', () => {
    expect(intervalProblem([])).toBe('empty');
  });
});

describe('nextInterval', () => {
  it('leaves an hour then runs four', () => {
    expect(nextInterval([s('09:00', '13:00')])).toEqual(s('14:00', '18:00'));
  });

  it('stops at midnight rather than wrapping', () => {
    expect(nextInterval([s('09:00', '21:00')])).toEqual(s('22:00', '24:00'));
  });

  it('offers nothing when the day is already full', () => {
    expect(nextInterval([s('09:00', '23:00')])).toBeNull();
    expect(nextInterval([s('09:00', '23:30')])).toBeNull();
  });

  it('offers nothing after a stretch that runs past midnight', () => {
    expect(nextInterval([s('18:00', '02:00')])).toBeNull();
    expect(nextInterval([s('18:00', '24:00')])).toBeNull();
  });

  it('keeps half hours', () => {
    expect(nextInterval([s('09:00', '12:30')])).toEqual(s('13:30', '17:30'));
  });

  it('always produces something the validator accepts', () => {
    for (const close of ['10:00', '12:30', '17:00', '20:00', '22:30']) {
      const first = s('09:00', close);
      const added = nextInterval([first]);
      if (added) expect(intervalProblem([first, added])).toBeNull();
    }
  });
});
