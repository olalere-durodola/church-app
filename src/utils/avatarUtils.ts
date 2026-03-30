const AVATAR_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
];

export function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0]?.toUpperCase() ?? '?';
  const l = lastName.trim()[0]?.toUpperCase() ?? '?';
  return f + l;
}

export function getAvatarColor(firstName: string, lastName: string): string {
  const str = firstName + lastName;
  const sum = Array.from(str).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
