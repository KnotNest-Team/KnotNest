import { TRADITIONS, TASK_LEAD_DAYS } from '../data/weddingTraditions.js';

const DAY = 864e5;
const startOfDay = (d) => { const x = new Date(d); return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())); };
const todayUTC = () => startOfDay(new Date());
const UNIQUE_BY_KEY = new Set(['puja', 'feast', 'welcome']); // several of these can coexist

/** "09:30" -> "9:30 AM" */
export function fmtTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}
/** Minutes after midnight for sorting "7:30 PM onwards", "Baraat at 6:00 PM" ... */
export function timeMinutes(t = '') {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(t);
  if (!m) return 24 * 60;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2] || 0);
}

/**
 * Suggested events for a tradition (optionally merged with the partner's tradition).
 * Returns every suggestion with a `selected` flag (false for optional or past ones) and `exists`
 * when an event with that name is already in the plan, so the couple's own events are never touched.
 */
export function planEvents({ culture, partnerCulture, weddingDate, muhurat }, existing = []) {
  const main = TRADITIONS[culture];
  if (!main) return [];
  const base = startOfDay(weddingDate);
  const partner = partnerCulture && partnerCulture !== culture ? TRADITIONS[partnerCulture] : null;
  const take = main.events.map((ev) => ({ ...ev, tradition: partner ? main.label : '' }));
  if (partner) {
    const kinds = new Set(take.map((x) => x.kind));
    const keys = new Set(take.map((x) => x.key));
    for (const ev of partner.events) {
      if (ev.main) continue; // one main ceremony: the primary tradition's
      if (UNIQUE_BY_KEY.has(ev.kind) ? keys.has(ev.key) : kinds.has(ev.kind)) continue;
      // culture = bride's family, partnerCulture = groom's family: their bride-only customs need a decision
      take.push({ ...ev, tradition: partner.label, key: `${partnerCulture}:${ev.key}`, optional: ev.optional || ev.side === 'bride' });
    }
  }
  const names = new Set(existing.map((x) => x.name.trim().toLowerCase()));
  const keysIn = new Set(existing.map((x) => x.templateKey).filter(Boolean));
  const today = todayUTC();
  return take.map((ev) => {
    const date = new Date(base.getTime() + ev.day * DAY);
    const time = ev.main && fmtTime(muhurat) ? `${fmtTime(muhurat)} (muhurat)` : ev.time;
    const exists = keysIn.has(ev.key) || names.has(ev.name.toLowerCase());
    return {
      templateKey: ev.key, name: ev.name, date, time, hostSide: ev.side, meaning: ev.meaning, tradition: ev.tradition,
      optional: !!ev.optional, main: !!ev.main, past: date < today, exists,
      selected: !ev.optional && date >= today && !exists,
    };
  }).sort((a, b) => a.date - b.date || timeMinutes(a.time) - timeMinutes(b.time));
}

/** Checklist due dates counted back from the wedding (never in the past). */
export function taskDueDate(title, weddingDate) {
  const lead = TASK_LEAD_DAYS[title];
  if (!lead || !weddingDate) return undefined;
  const due = new Date(startOfDay(weddingDate).getTime() - lead * DAY);
  const soon = new Date(todayUTC().getTime() + 7 * DAY);
  return due < soon ? soon : due;
}

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY);
