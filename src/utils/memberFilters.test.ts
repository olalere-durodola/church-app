import { describe, it, expect } from 'vitest';
import { filterMembers } from './memberFilters';
import type { Member } from '../types/member';
import { Timestamp } from 'firebase/firestore';

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
    departments: [],
    membershipDate: null,
    notes: '',
    birthdayMonth: null,
    birthdayDay: null,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

const members: Member[] = [
  makeMember({ id: '1', fullName: 'alice smith', status: 'Active', gender: 'Female', departments: ['Choir'] }),
  makeMember({ id: '2', fullName: 'bob jones', status: 'Inactive', gender: 'Male', departments: ['Choir'] }),
  makeMember({ id: '3', fullName: 'carol white', status: 'Visitor', gender: 'Female', departments: [] }),
];

describe('filterMembers', () => {
  it('returns all members when no filters applied', () => {
    expect(filterMembers(members, '', '', '', '')).toHaveLength(3);
  });

  it('filters by search query (case-insensitive, matches fullName)', () => {
    expect(filterMembers(members, 'alice', '', '', '').map(m => m.id)).toEqual(['1']);
    expect(filterMembers(members, 'JONES', '', '', '').map(m => m.id)).toEqual(['2']);
  });

  it('filters by status', () => {
    expect(filterMembers(members, '', 'Active', '', '').map(m => m.id)).toEqual(['1']);
  });

  it('filters by gender', () => {
    const result = filterMembers(members, '', '', 'Female', '');
    expect(result.map(m => m.id)).toEqual(['1', '3']);
  });

  it('filters by department', () => {
    const result = filterMembers(members, '', '', '', 'Choir');
    expect(result.map(m => m.id)).toEqual(['1', '2']);
  });

  it('applies all filters together', () => {
    const result = filterMembers(members, 'alice', 'Active', 'Female', 'Choir');
    expect(result.map(m => m.id)).toEqual(['1']);
  });
});
