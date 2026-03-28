import { describe, it, expect } from 'vitest';
import { getBirthdaysThisMonth, getBirthdaysComingUp } from './birthdayUtils';
import type { Member } from '../types/member';
import { Timestamp } from 'firebase/firestore';

// Minimal member factory for tests
function makeMember(overrides: Partial<Member> & { id: string }): Member {
  return {
    firstName: 'Test',
    lastName: 'User',
    fullName: 'test user',
    phone: '',
    email: '',
    address: '',
    gender: 'Male',
    status: 'Active',
    department: null,
    membershipDate: null,
    notes: '',
    createdAt: Timestamp.now(),
    birthdayMonth: null,
    birthdayDay: null,
    ...overrides,
  };
}

describe('getBirthdaysThisMonth', () => {
  const today = new Date(2026, 2, 27); // March 27, 2026

  it('returns members with birthday in current month', () => {
    const members = [
      makeMember({ id: '1', birthdayMonth: 3, birthdayDay: 15 }),
      makeMember({ id: '2', birthdayMonth: 4, birthdayDay: 1 }),
    ];
    const result = getBirthdaysThisMonth(members, today);
    expect(result.map(m => m.id)).toEqual(['1']);
  });

  it('excludes members with null birthday', () => {
    const members = [
      makeMember({ id: '1', birthdayMonth: null, birthdayDay: null }),
      makeMember({ id: '2', birthdayMonth: 3, birthdayDay: 10 }),
    ];
    const result = getBirthdaysThisMonth(members, today);
    expect(result.map(m => m.id)).toEqual(['2']);
  });

  it('sorts by birthdayDay ascending', () => {
    const members = [
      makeMember({ id: '1', birthdayMonth: 3, birthdayDay: 20 }),
      makeMember({ id: '2', birthdayMonth: 3, birthdayDay: 5 }),
      makeMember({ id: '3', birthdayMonth: 3, birthdayDay: 12 }),
    ];
    const result = getBirthdaysThisMonth(members, today);
    expect(result.map(m => m.id)).toEqual(['2', '3', '1']);
  });
});

describe('getBirthdaysComingUp', () => {
  it('returns members with birthday within next 7 days inclusive', () => {
    const today = new Date(2026, 2, 27); // March 27
    const members = [
      makeMember({ id: '1', birthdayMonth: 3, birthdayDay: 27 }), // today — included
      makeMember({ id: '2', birthdayMonth: 4, birthdayDay: 2 }),  // April 2 — included
      makeMember({ id: '3', birthdayMonth: 4, birthdayDay: 3 }),  // April 3 — excluded (8th day)
      makeMember({ id: '4', birthdayMonth: 4, birthdayDay: 4 }),  // April 4 — excluded (9th day)
    ];
    const result = getBirthdaysComingUp(members, today);
    expect(result.map(m => m.id)).toEqual(['1', '2']);
  });

  it('handles year boundary: Dec 29 today sees Jan birthdays', () => {
    const today = new Date(2026, 11, 29); // Dec 29
    const members = [
      makeMember({ id: '1', birthdayMonth: 12, birthdayDay: 31 }), // Dec 31 — included
      makeMember({ id: '2', birthdayMonth: 1, birthdayDay: 4 }),   // Jan 4 — included
      makeMember({ id: '3', birthdayMonth: 1, birthdayDay: 5 }),   // Jan 5 — excluded (8th day)
    ];
    const result = getBirthdaysComingUp(members, today);
    expect(result.map(m => m.id)).toEqual(['1', '2']);
  });

  it('excludes members with null birthday', () => {
    const today = new Date(2026, 2, 27);
    const members = [
      makeMember({ id: '1', birthdayMonth: null, birthdayDay: null }),
    ];
    expect(getBirthdaysComingUp(members, today)).toHaveLength(0);
  });

  it('sorts chronologically within the window', () => {
    const today = new Date(2026, 11, 29); // Dec 29
    const members = [
      makeMember({ id: '1', birthdayMonth: 1, birthdayDay: 2 }),   // Jan 2
      makeMember({ id: '2', birthdayMonth: 12, birthdayDay: 30 }), // Dec 30
      makeMember({ id: '3', birthdayMonth: 1, birthdayDay: 1 }),   // Jan 1
    ];
    const result = getBirthdaysComingUp(members, today);
    expect(result.map(m => m.id)).toEqual(['2', '3', '1']);
  });
});
