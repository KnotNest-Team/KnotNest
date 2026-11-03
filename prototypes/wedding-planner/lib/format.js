/**
 * Small formatting helpers. They copy the behaviour of client/src/utils/format.js on purpose, so this
 * prototype folder has no imports from the application.
 */

export const inr = (n = 0) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
export const inrShort = (n = 0) => {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  if (a >= 1e3) return `${sign}₹${Math.round(a / 1e3)}K`;
  return `${sign}₹${Math.round(a)}`;
};
export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
export const cx = (...a) => a.filter(Boolean).join(' ');

/** "HH:MM" (24-hour) -> minutes after midnight. Throws on impossible times instead of guessing. */
export function toMin(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`Not a 24-hour time: "${hhmm}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes after midnight -> "7:30 PM". 1440 (end of day) reads as 12:00 AM, and later times wrap. */
export function clock(min) {
  const h = Math.floor(min / 60) % 24;
  return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const duration = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`);

/** Whole days from `from` to `to` (both "YYYY-MM-DD"), negative when `to` is earlier. */
export const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
export const shortDate = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const monthKey = (ymd) => ymd.slice(0, 7);
export const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
