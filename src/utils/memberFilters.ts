import type { Member } from '../types/member';

export function filterMembers(
  members: Member[],
  search: string,
  status: string,
  gender: string,
  department: string
): Member[] {
  const query = search.toLowerCase();
  return members.filter(m => {
    if (query && !m.fullName.includes(query)) return false;
    if (status && m.status !== status) return false;
    if (gender && m.gender !== gender) return false;
    if (department && !m.departments.includes(department)) return false;
    return true;
  });
}
