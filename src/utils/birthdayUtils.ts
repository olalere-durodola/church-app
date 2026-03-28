import type { Member } from '../types/member';

export function getBirthdaysThisMonth(members: Member[], today: Date): Member[] {
  const currentMonth = today.getMonth() + 1;
  return members
    .filter(m => m.birthdayMonth === currentMonth && m.birthdayDay !== null)
    .sort((a, b) => (a.birthdayDay ?? 0) - (b.birthdayDay ?? 0));
}

export function getBirthdaysComingUp(members: Member[], today: Date): Member[] {
  // Build the 7-day window as an array of { month, day } objects
  const window: Array<{ month: number; day: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    window.push({ month: d.getMonth() + 1, day: d.getDate() });
  }

  const positionInWindow = (m: Member): number =>
    window.findIndex(w => w.month === m.birthdayMonth && w.day === m.birthdayDay);

  return members
    .filter(m => m.birthdayMonth !== null && m.birthdayDay !== null && positionInWindow(m) !== -1)
    .sort((a, b) => positionInWindow(a) - positionInWindow(b));
}
