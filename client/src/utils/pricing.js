/** Display helpers for flexible bookings. Prices themselves always come from the server (POST /bookings/quote). */
import { fmtDate } from './format';

export const MODE_LABEL = { full_day: 'Entire day', events: 'Selected events', date: 'Whole date' };
export const TYPE_LABEL = { legacy: 'Earlier format', single_event: 'Single event', multi_event: 'Several events', full_day: 'Full-day package', multi_day: 'Several days' };
export const DISCOUNT_LABEL = { full_day: 'Full-day package', multi_event: 'Multiple events on one day', multi_day: 'Multiple wedding days', repeat: 'Returning couple' };

export const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const dayTitle = (d) => fmtDate(`${ymd(d)}T00:00:00Z`, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const dayShort = (d) => fmtDate(`${ymd(d)}T00:00:00Z`, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Same name matching the server uses to decide which events a vendor covers (for greying out choices only). */
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const matchesName = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `)); };
export const vendorOffers = (vendor, eventName) => !vendor?.eventsOffered?.length || vendor.eventsOffered.some((x) => matchesName(eventName, x));

/**
 * Selection state shared by the vendor-profile modal and the booking planner:
 *   { 'YYYY-MM-DD': { mode: 'full_day' | 'events', events: [eventId] } }
 * -> request days for the API.
 */
export const selectionToDays = (sel) => Object.entries(sel)
  .filter(([, v]) => v && (v.mode === 'full_day' || v.events?.length))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, v]) => (v.mode === 'full_day' ? { date, mode: 'full_day' } : { date, mode: 'events', events: v.events }));

/** Safe localStorage (private windows and blocked storage throw). */
export const store = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};
