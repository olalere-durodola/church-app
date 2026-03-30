import { describe, it, expect } from 'vitest';
import { getAvatarColor, getInitials } from './avatarUtils';

describe('getInitials', () => {
  it('returns uppercase first letters of first and last name', () => {
    expect(getInitials('Adaeze', 'Okonkwo')).toBe('AO');
  });

  it('handles single-character names', () => {
    expect(getInitials('A', 'B')).toBe('AB');
  });

  it('returns ?? for empty strings', () => {
    expect(getInitials('', '')).toBe('??');
  });
});

describe('getAvatarColor', () => {
  it('returns a hex colour string', () => {
    const color = getAvatarColor('John', 'Doe');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns the same colour for the same name', () => {
    expect(getAvatarColor('Jane', 'Smith')).toBe(getAvatarColor('Jane', 'Smith'));
  });

  it('returns one of the 8 palette colours', () => {
    const PALETTE = [
      '#3b82f6', '#22c55e', '#f97316', '#a855f7',
      '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
    ];
    const color = getAvatarColor('Emmanuel', 'Nwosu');
    expect(PALETTE).toContain(color);
  });
});
