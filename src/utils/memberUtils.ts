export function normalizeFullName(firstName: string, lastName: string): string {
  const first = firstName.trim().replace(/\s+/g, ' ');
  const last = lastName.trim().replace(/\s+/g, ' ');
  return `${first} ${last}`.toLowerCase();
}

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function getValidDaysForMonth(month: number): number {
  return DAYS_IN_MONTH[month] ?? 31;
}
