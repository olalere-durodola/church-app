/**
 * Build a wa.me WhatsApp deep link from a stored phone number.
 *
 * Phone numbers in this app are free-text, so we normalise to an
 * international, digits-only form that wa.me expects (no +, spaces, or dashes).
 *
 * Heuristics (church serves US + Nigerian members):
 *  - already has a country code via leading "+"        → keep its digits
 *  - 10 digits                                          → assume US, prefix 1
 *  - 11 digits starting with 0 (e.g. 0803…)             → Nigerian local, swap 0 → 234
 *  - anything else                                      → use digits as-is
 */
export function whatsappNumber(phone: string): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;

  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return null; // too short to be a real number

  if (hadPlus) return digits;
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(phone: string, message?: string): string | null {
  const num = whatsappNumber(phone);
  if (!num) return null;
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(phone: string): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}
