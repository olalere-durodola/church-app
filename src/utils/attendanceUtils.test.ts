import { describe, it, expect } from 'vitest';
import { toDateString, getMonthDays, formatDisplayDate } from './attendanceUtils';

describe('toDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 2, 29))).toBe('2026-03-29');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getMonthDays', () => {
  it('returns 31 days for March', () => {
    const days = getMonthDays(2026, 3);
    expect(days).toHaveLength(31);
  });

  it('returns 28 days for February in a non-leap year', () => {
    const days = getMonthDays(2025, 2);
    expect(days).toHaveLength(28);
  });

  it('returns 29 days for February in a leap year', () => {
    const days = getMonthDays(2024, 2);
    expect(days).toHaveLength(29);
  });

  it('first day has the correct date', () => {
    const days = getMonthDays(2026, 3);
    expect(days[0].getFullYear()).toBe(2026);
    expect(days[0].getMonth()).toBe(2); // 0-indexed
    expect(days[0].getDate()).toBe(1);
  });

  it('last day of March is the 31st', () => {
    const days = getMonthDays(2026, 3);
    expect(days[30].getDate()).toBe(31);
  });

  it('throws RangeError for month 0', () => {
    expect(() => getMonthDays(2026, 0)).toThrow(RangeError);
  });

  it('throws RangeError for month 13', () => {
    expect(() => getMonthDays(2026, 13)).toThrow(RangeError);
  });
});

describe('formatDisplayDate', () => {
  it('formats YYYY-MM-DD as "D Mon YYYY" (no leading zero on day)', () => {
    expect(formatDisplayDate('2026-03-29')).toBe('29 Mar 2026');
  });

  it('formats January correctly without padding', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('5 Jan 2026');
  });
});
