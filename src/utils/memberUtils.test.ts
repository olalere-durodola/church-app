import { describe, it, expect } from 'vitest';
import { normalizeFullName, getValidDaysForMonth } from './memberUtils';

describe('normalizeFullName', () => {
  it('lowercases and trims', () => {
    expect(normalizeFullName('John', 'Doe')).toBe('john doe');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeFullName('Mary  Jane', 'Watson')).toBe('mary jane watson');
  });

  it('trims surrounding whitespace from each part', () => {
    expect(normalizeFullName('  Alice  ', '  Smith  ')).toBe('alice smith');
  });
});

describe('getValidDaysForMonth', () => {
  it('returns 31 for January', () => {
    expect(getValidDaysForMonth(1)).toBe(31);
  });

  it('returns 28 for February (no leap year support)', () => {
    expect(getValidDaysForMonth(2)).toBe(28);
  });

  it('returns 30 for April', () => {
    expect(getValidDaysForMonth(4)).toBe(30);
  });

  it('returns 31 for December', () => {
    expect(getValidDaysForMonth(12)).toBe(31);
  });

  it('throws for invalid month values', () => {
    expect(() => getValidDaysForMonth(0)).toThrow(RangeError);
    expect(() => getValidDaysForMonth(13)).toThrow(RangeError);
  });
});
