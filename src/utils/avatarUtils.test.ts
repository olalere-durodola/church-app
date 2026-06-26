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
      '#b98b33', '#4f8a76', '#b0512a', '#6e7c95',
      '#9a6a8e', '#6e8a55', '#5e7a8c', '#7a6ca6',
    ];
    const color = getAvatarColor('Emmanuel', 'Nwosu');
    expect(PALETTE).toContain(color);
  });
});
