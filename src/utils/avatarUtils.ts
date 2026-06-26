// Muted, on-theme avatar tones (deep enough for white initials)
const AVATAR_COLORS = [
  '#b98b33', '#4f8a76', '#b0512a', '#6e7c95',
  '#9a6a8e', '#6e8a55', '#5e7a8c', '#7a6ca6',
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
