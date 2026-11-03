/**
 * Vendor calendar holds.
 *
 *   Whole days  Vendor.unavailableDates ('YYYY-MM-DD'): days the vendor blocked, older single-date bookings and
 *               full-day packages (the vendor is with that couple all day).
 *   Time slots  Vendor.bookedSlots: individual events, so a photographer can do a 10 AM haldi for one couple
 *               and an 8 PM sangeet for another. A slot runs from the event's start time for
 *               Setting.eventSlotHours; an event without a readable time holds the whole day.
 *
 * Holds are written with an optimistic version check (Vendor.slotVersion) plus an in-process lock, so two
 * acceptances for overlapping times can never both succeed, on MongoDB or MongoDB-compatible servers.
 */
import Vendor from '../models/Vendor.js';
import ApiError from '../utils/ApiError.js';

export const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const DAY_MIN = 24 * 60;
// % 24: a slot end of 1440 is midnight (12:00 AM), not noon
const hhmm = (m) => { const h = Math.floor(m / 60) % 24; return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

/** "7:30 PM onwards" -> 1170 (minutes after midnight), or null when no time can be read. */
export function startMinutes(t = '') {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(t || '');
  // 12-hour form only for 1-12 h and 0-59 min; anything else ("7:75 PM", "0:30 AM") falls through to the 24-hour check
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12 && Number(m[2] || 0) <= 59) return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2] || 0);
  const h = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t || '');
  return h ? Number(h[1]) * 60 + Number(h[2]) : null;
}
export const slotFor = (time, hours = 4) => {
  const start = startMinutes(time);
  return start == null ? { start: null, end: null } : { start, end: Math.min(DAY_MIN, start + Math.round(hours * 60)) };
};

/** What a booking holds on the vendor's calendar. */
export function holdsFor(booking) {
  const whole = new Set(); const slots = [];
  const days = booking.days?.length ? booking.days : [{ date: booking.weddingDate, mode: 'date' }];
  for (const d of days) {
    const date = ymd(d.date);
    if (d.mode === 'events' && d.events?.length) {
      for (const e of d.events) {
        if (e.start == null) whole.add(date);
        else slots.push({ date, start: e.start, end: e.end ?? Math.min(DAY_MIN, e.start + 240), booking: booking._id });
      }
    } else whole.add(date);
  }
  // a whole-day hold already covers that day's slots
  return { whole: [...whole], slots: slots.filter((s) => !whole.has(s.date)) };
}

/** Conflicts between the wanted holds and the vendor's calendar (ignoring the booking's own holds). */
export function conflictsWith(vendor, { whole = [], slots = [] }, bookingId = null) {
  const own = (s) => bookingId && String(s.booking) === String(bookingId);
  const blocked = new Set(vendor.unavailableDates || []);
  const others = (vendor.bookedSlots || []).filter((s) => !own(s));
  const out = [];
  for (const d of whole) {
    if (blocked.has(d)) out.push({ date: d, why: 'blocked' });
    else if (others.some((s) => s.date === d)) out.push({ date: d, why: 'partly booked' });
  }
  for (const s of slots) {
    if (blocked.has(s.date)) out.push({ date: s.date, why: 'blocked' });
    else {
      const hit = others.find((o) => o.date === s.date && o.start < s.end && s.start < o.end);
      if (hit) out.push({ date: s.date, why: `booked ${hhmm(hit.start)} to ${hhmm(hit.end)}` });
    }
  }
  return out;
}
export const describeConflicts = (list) => [...new Set(list.map((c) => (c.why === 'blocked' ? c.date : `${c.date} (${c.why})`)))].join(', ');

const locks = new Map();
export async function withLock(key, fn) {
  while (locks.has(key)) await locks.get(key).catch(() => {});
  const p = (async () => fn())();
  locks.set(key, p);
  try { return await p; } finally { locks.delete(key); }
}

/** Holds every day and slot of the booking at once, or none of them (409 when anything is taken). */
export async function holdBooking(vendorId, booking) {
  const want = holdsFor(booking);
  return withLock(String(vendorId), async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const v = await Vendor.findById(vendorId).select('unavailableDates bookedSlots slotVersion').lean();
      if (!v) throw ApiError.notFound('Vendor not found');
      const clash = conflictsWith(v, want, booking._id);
      if (clash.length) {
        const dates = describeConflicts(clash);
        throw ApiError.conflict(`${clash.length > 1 ? 'These dates are' : 'This date is'} already blocked in the calendar: ${dates}. Unblock ${clash.length > 1 ? 'them' : 'it'} first.`);
      }
      const r = await Vendor.updateOne(
        { _id: vendorId, slotVersion: v.slotVersion ?? 0 },
        { $push: { unavailableDates: { $each: want.whole }, bookedSlots: { $each: want.slots } }, $inc: { slotVersion: 1 } },
      );
      if (r.modifiedCount) return want;
      // first hold on an older vendor document (no slotVersion field yet)
      if (v.slotVersion == null) await Vendor.updateOne({ _id: vendorId, slotVersion: { $exists: false } }, { $set: { slotVersion: 0 } });
    }
    throw ApiError.conflict('The vendor calendar is busy. Please try again.');
  });
}

/** Releases the booking's holds (whole days it held and its time slots). */
export async function releaseBooking(vendorId, booking) {
  const { whole } = holdsFor(booking);
  return withLock(String(vendorId), async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const v = await Vendor.findById(vendorId).select('bookedSlots slotVersion').lean();
      if (!v) return;
      // rewrite the slot list without this booking's slots (a plain $set works on every MongoDB-compatible server)
      const keep = (v.bookedSlots || []).filter((x) => String(x.booking) !== String(booking._id));
      const r = await Vendor.updateOne(
        { _id: vendorId, ...(v.slotVersion == null ? { slotVersion: { $exists: false } } : { slotVersion: v.slotVersion }) },
        { $set: { bookedSlots: keep, slotVersion: (v.slotVersion ?? 0) + 1 }, $pullAll: { unavailableDates: whole } },
      );
      if (r.modifiedCount || r.matchedCount) return;
    }
    throw ApiError.conflict('The vendor calendar is busy. Please try again.');
  });
}

/** True when the booking's holds are still on the vendor calendar (used before the couple confirms). */
export async function stillHeld(vendorId, booking) {
  const v = await Vendor.findById(vendorId).select('unavailableDates bookedSlots status').lean();
  if (!v || v.status !== 'approved') return false;
  const { whole, slots } = holdsFor(booking);
  const mine = (v.bookedSlots || []).filter((s) => String(s.booking) === String(booking._id));
  return whole.every((d) => v.unavailableDates.includes(d)) && slots.every((s) => mine.some((m) => m.date === s.date && m.start === s.start));
}
