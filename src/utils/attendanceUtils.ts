const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns all Date objects for every day in the given month.
 * @param month — 1-based (January = 1, December = 12)
 */
export function getMonthDays(year: number, month: number): Date[] {
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1–12, got ${month}`);
  }
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function formatDisplayDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse without timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}
