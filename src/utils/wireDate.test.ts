import { describe, it, expect } from 'vitest';

import { formatWireDate, parseWireDate } from './wireDate';

describe('parseWireDate', () => {
  it('parses the backend dd/MM/yyyy format day-first', () => {
    const date = parseWireDate('15/03/1995');
    expect(date?.getDate()).toBe(15);
    expect(date?.getMonth()).toBe(2); // March
    expect(date?.getFullYear()).toBe(1995);
  });

  it('reads an ambiguous date as day-first, not month-first', () => {
    // 01/02 is exactly the case the old free-text field got wrong for US users.
    const date = parseWireDate('01/02/1995');
    expect(date?.getDate()).toBe(1);
    expect(date?.getMonth()).toBe(1); // February
  });

  it('returns undefined for empty or malformed input', () => {
    expect(parseWireDate('')).toBeUndefined();
    expect(parseWireDate('   ')).toBeUndefined();
    expect(parseWireDate('1995-03-15')).toBeUndefined();
    expect(parseWireDate('15/3/1995')).toBeUndefined();
    expect(parseWireDate('not a date')).toBeUndefined();
  });

  it('rejects calendar-invalid dates instead of rolling them over', () => {
    // `new Date(1995, 1, 31)` silently becomes 3 March; that must not pass.
    expect(parseWireDate('31/02/1995')).toBeUndefined();
    expect(parseWireDate('32/01/1995')).toBeUndefined();
    expect(parseWireDate('15/13/1995')).toBeUndefined();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    expect(parseWireDate('29/02/1996')?.getDate()).toBe(29);
    expect(parseWireDate('29/02/1995')).toBeUndefined();
  });
});

describe('formatWireDate', () => {
  it('emits zero-padded dd/MM/yyyy', () => {
    expect(formatWireDate(new Date(1995, 0, 1))).toBe('01/01/1995');
    expect(formatWireDate(new Date(1995, 11, 25))).toBe('25/12/1995');
  });

  it('round-trips with parseWireDate', () => {
    for (const wire of ['15/03/1995', '01/01/1970', '29/02/1996', '31/12/2001']) {
      expect(formatWireDate(parseWireDate(wire)!)).toBe(wire);
    }
  });

  it('uses local date parts so the day cannot shift by timezone', () => {
    // Midnight local — a UTC-based formatter would report the previous day
    // anywhere west of Greenwich.
    expect(formatWireDate(new Date(1995, 2, 15, 0, 0, 0))).toBe('15/03/1995');
  });
});
