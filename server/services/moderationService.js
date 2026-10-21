/**
 * Lightweight automatic checks on chat messages. Flags help admins spot scams and off-platform deals
 * without reading every conversation. Messages are still delivered; the sender sees a gentle note.
 */
const PATTERNS = {
  email: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
  upi: /\b[\w.-]{2,}@(?:ok(?:axis|hdfcbank|icici|sbi)|ybl|ibl|axl|paytm|upi|apl|ptyes|ptaxis|pthdfc|ptsbi|fbl|jupiteraxis|kotak|icici|sbi|hdfcbank|axisbank|freecharge|waaxis|wahdfcbank)\b/i,
  link: /\b(?:https?:\/\/|www\.)\S+|\bwa\.me\/\S+/i,
  abuse: /\b(?:idiot|stupid|bastard|fraud(?:ster)?|scammer|chutiya|bewakoof|kamina|harami|f+u+c+k+|sh[i1]t)\b/i,
};

/** Indian mobile numbers written any way: 9876543210, 98765 43210, +91-98765-43210, 0 98765 43210. */
const hasPhone = (text) => (text.match(/\+?[\d][\d\s().-]{8,}\d/g) || [])
  .some((chunk) => /^(?:0|91)?[6-9]\d{9}$/.test(chunk.replace(/\D/g, '')));

export function flagsFor(text = '') {
  const flags = [];
  if (hasPhone(text)) flags.push('phone');
  const upi = PATTERNS.upi.test(text);
  if (upi) flags.push('upi');
  if (!upi && PATTERNS.email.test(text)) flags.push('email');
  for (const k of ['link', 'abuse']) if (PATTERNS[k].test(text)) flags.push(k);
  return flags;
}

export const FLAG_NOTE = 'Sharing phone numbers, payment IDs or links? Keep bookings and payments on KnotNest so you stay protected if anything goes wrong.';
