/**
 * Turns a couple's selection into priced bookings. Used by POST /bookings/quote (live price, nothing saved),
 * POST /bookings/checkout (one booking per vendor) and the original POST /bookings (one vendor).
 *
 * Request shape, per vendor:
 *   { vendor, days: [ { date, mode: 'full_day' },                       // every eligible event that day
 *                     { date, mode: 'events', events: [eventId, ...] },  // chosen events only
 *                     { date, packageName?, event? } ] }                 // whole date (older form)
 * Prices, discounts and the final amount are always computed here; any price sent by the browser is ignored.
 */
import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import Wedding from '../models/Wedding.js';
import ApiError from '../utils/ApiError.js';
import { getSettings } from '../models/Setting.js';
import { notify, notifyAdmins } from './notificationService.js';
import { priceBooking, eventPrice, offersEvent, dayLabel } from './pricingEngine.js';
import { ymd, slotFor, holdsFor, conflictsWith, describeConflicts } from './availabilityService.js';

export const OPEN = ['pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer', 'confirmed'];
export const QUALIFYING = ['confirmed', 'completed'];   // cancelled, declined or pending bookings never count as repeat bookings
const today = () => new Date().toISOString().slice(0, 10);
const MAX_DAYS = 10;

/** Wedding events grouped by date: { 'YYYY-MM-DD': [event, ...] } sorted by time. */
export function eventsByDay(wedding, slotHours) {
  const map = {};
  for (const e of wedding?.events || []) {
    const d = ymd(e.date);
    (map[d] ||= []).push({ _id: e._id, name: e.name, time: e.time || '', date: d, ...slotFor(e.time, slotHours) });
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));
  return map;
}

/** Confirmed or completed bookings the couple already has (from the database, never from the request). */
export const priorBookingCount = (customerId, exclude = []) => Booking.countDocuments({ customer: customerId, status: { $in: QUALIFYING }, _id: { $nin: exclude } });

/** Validates one vendor's days and prices every event from the vendor's current listing. */
export function resolveDays(vendor, rawDays, { byDay, settings }) {
  if (!Array.isArray(rawDays) || !rawDays.length) throw ApiError.badRequest('Pick at least one day');
  if (rawDays.length > MAX_DAYS) throw ApiError.badRequest(`One booking can cover up to ${MAX_DAYS} days`);
  const fullDayOn = settings.fullDayPackages && vendor.fullDay?.enabled !== false;
  const seen = new Map();
  for (const x of rawDays) {
    if (!x?.date || Number.isNaN(new Date(x.date).getTime())) throw ApiError.badRequest('Each day needs a valid date');
    const date = ymd(x.date);
    if (date < today()) throw ApiError.badRequest('Pick dates that are today or later');
    const mode = ['full_day', 'events'].includes(x.mode) ? x.mode : 'date';
    const prev = seen.get(date);
    if (prev) {
      // full day + individual events of the same day: the full day already includes them (never charged twice)
      if (prev.mode === 'full_day' && mode === 'events') continue;
      if (mode === 'full_day' && prev.mode === 'events') { seen.set(date, { ...x, mode }); continue; }
      if (prev.mode === 'events' && mode === 'events') { prev.events = [...(prev.events || []), ...(x.events || [])]; continue; }
      throw ApiError.badRequest(`${date} is listed twice`);
    }
    seen.set(date, { ...x, mode, events: [...(x.events || [])] });
  }

  const days = [];
  for (const [date, x] of [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (vendor.unavailableDates?.includes(date)) throw ApiError.conflict(`${vendor.businessName} is not available on ${date}`);
    const dayEvents = byDay[date] || [];
    const eligible = dayEvents.filter((e) => offersEvent(vendor, e.name));
    if (x.mode === 'date') {
      // whole-date request (older form, or a day without planned events)
      let ev = null;
      if (x.event) { ev = dayEvents.find((e) => String(e._id) === String(x.event)) || Object.values(byDay).flat().find((e) => String(e._id) === String(x.event)); if (!ev) throw ApiError.badRequest('That wedding event does not exist'); }
      const packageName = x.packageName || '';
      if (packageName && !vendor.packages?.some((p) => p.name === packageName)) throw ApiError.badRequest('That package does not exist for this vendor');
      const price = eventPrice({ ...vendor, eventPricing: [] }, '', packageName);
      days.push({ date, mode: 'date', events: [], subtotal: price, packageName, event: ev?._id || null, eventName: ev?.name || '' });
      continue;
    }
    if (!dayEvents.length) throw ApiError.badRequest(`There are no wedding events on ${dayLabel(date)}. Add them in My Wedding, or book the whole date.`);
    let picked;
    if (x.mode === 'full_day') {
      if (!fullDayOn) throw ApiError.badRequest(`${vendor.businessName} does not offer full-day packages. Pick individual events instead.`);
      if (!eligible.length) throw ApiError.badRequest(`${vendor.businessName} does not cover any of the events on ${dayLabel(date)}`);
      picked = eligible;
    } else {
      const ids = [...new Set((x.events || []).map(String))];
      if (!ids.length) throw ApiError.badRequest(`Pick at least one event on ${dayLabel(date)}`);
      picked = ids.map((id) => {
        const e = dayEvents.find((ev) => String(ev._id) === id);
        if (!e) {
          const moved = Object.values(byDay).flat().find((ev) => String(ev._id) === id);
          throw ApiError.badRequest(moved ? `${moved.name} is now on ${dayLabel(moved.date)}, not ${dayLabel(date)}. Refresh your selection.` : 'One of the chosen events is no longer in your wedding plan. Refresh your selection.');
        }
        if (!offersEvent(vendor, e.name)) throw ApiError.badRequest(`${vendor.businessName} does not provide services for ${e.name}`);
        return e;
      });
    }
    const packageName = x.packageName && vendor.packages?.some((p) => p.name === x.packageName) ? x.packageName : '';
    if (x.packageName && !packageName) throw ApiError.badRequest('That package does not exist for this vendor');
    const events = picked.map((e) => ({ event: e._id, name: e.name, time: e.time, start: e.start, end: e.end, price: eventPrice(vendor, e.name, packageName), packageName }));
    const allOfDay = eligible.length >= 2 && events.length === eligible.length;
    days.push({
      date, mode: x.mode, events, packageName, event: events[0]?.event || null, eventName: events.map((e) => e.name).join(', ').slice(0, 120),
      packagePrice: x.mode === 'full_day' && vendor.fullDay?.price > 0 ? vendor.fullDay.price : null,
      canUpgrade: x.mode === 'events' && allOfDay && fullDayOn,
    });
  }
  return days;
}

/** Prices the days, choosing a full-day package automatically when every event of a day was ticked and that is cheaper. */
export function priceDays(days, ctx, vendor) {
  const base = priceBooking(days, ctx);
  if (!days.some((d) => d.canUpgrade)) return { ...base, notes: [] };
  const up = days.map((d) => (d.canUpgrade ? { ...d, mode: 'full_day', packagePrice: vendor.fullDay?.price > 0 ? vendor.fullDay.price : null } : d));
  const alt = priceBooking(up, ctx);
  if (alt.pricing.final < base.pricing.final) {
    const notes = days.filter((d) => d.canUpgrade).map((d) => `Every event on ${dayLabel(d.date)} was selected, so it is priced as the full-day package (cheaper for you).`);
    return { ...alt, notes };
  }
  return { ...base, notes: [] };
}

/** Problems with the vendor's calendar or the couple's own open bookings (empty = all clear). */
export async function availabilityIssues(vendor, days, { customerId, excludeBooking } = {}) {
  const probe = { _id: null, days: days.map((d) => ({ ...d, events: d.events || [] })) };
  const issues = [];
  const clash = conflictsWith(vendor, holdsFor(probe));
  if (clash.length) issues.push({ type: 'unavailable', message: `${vendor.businessName} is already booked: ${describeConflicts(clash)}` });
  if (customerId) {
    const mine = await Booking.find({ customer: customerId, vendor: vendor._id, status: { $in: OPEN }, ...(excludeBooking && { _id: { $ne: excludeBooking } }) }).select('days weddingDate').lean();
    for (const b of mine) {
      const theirs = b.days?.length ? b.days : [{ date: b.weddingDate, mode: 'date' }];
      for (const d of days) {
        const t = theirs.find((x) => ymd(x.date) === d.date);
        if (!t) continue;
        const wholeA = d.mode !== 'events'; const wholeB = (t.mode || 'date') !== 'events';
        const shared = !wholeA && !wholeB && d.events.some((e) => (t.events || []).some((x) => String(x.event) === String(e.event)));
        if (wholeA || wholeB || shared) { issues.push({ type: 'duplicate', message: `You already have an open booking with this vendor on ${d.date}` }); break; }
      }
    }
  }
  return issues;
}

/**
 * Builds priced bookings for a checkout (nothing saved). items: [{ vendor, days, notes? }]
 * Returns { items: [{ vendor, days, pricing, bookingType, notes, issues }], totals, checkoutDays, settings }.
 */
export async function buildCheckout(customer, items, { strict = true } = {}) {
  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('Choose at least one vendor');
  if (items.length > 12) throw ApiError.badRequest('One checkout can include up to 12 vendors');
  const ids = items.map((i) => String(i?.vendor || ''));
  if (new Set(ids).size !== ids.length) throw ApiError.badRequest('List each vendor once (put all of a vendor\'s days together)');
  const [settings, wedding, priorBookings] = await Promise.all([getSettings(), Wedding.findOne({ customer: customer._id }).select('events').lean(), priorBookingCount(customer._id)]);
  const byDay = eventsByDay(wedding, settings.eventSlotHours);

  const resolved = [];
  for (const it of items) {
    if (!/^[a-f\d]{24}$/i.test(String(it.vendor))) throw ApiError.badRequest('Invalid vendor');
    const vendor = await Vendor.findOne({ _id: it.vendor, status: 'approved' }).lean();
    if (!vendor) throw ApiError.notFound('Vendor not found');
    try {
      const days = resolveDays(vendor, it.days, { byDay, settings });
      resolved.push({ vendor, days, raw: it });
    } catch (e) {
      if (strict) throw e;
      resolved.push({ vendor, days: [], raw: it, error: e.message });
    }
  }
  // the multi-day discount looks at every wedding day in the checkout, whichever vendors they are with
  const checkoutDays = new Set(resolved.flatMap((x) => x.days.map((d) => d.date))).size;
  const out = [];
  for (const x of resolved) {
    if (x.error) { out.push({ vendor: x.vendor, error: x.error, days: [], issues: [{ type: 'invalid', message: x.error }] }); continue; }
    const priced = priceDays(x.days, { rules: settings.discounts, priorBookings, checkoutDays }, x.vendor);
    const issues = await availabilityIssues(x.vendor, priced.days, { customerId: customer._id });
    out.push({ vendor: x.vendor, days: priced.days, pricing: priced.pricing, bookingType: priced.bookingType, notes: priced.notes, issues, rawNotes: x.raw.notes });
  }
  const ok = out.filter((x) => !x.error);
  const totals = {
    subtotal: ok.reduce((t, x) => t + x.pricing.subtotal, 0),
    packageSavings: ok.reduce((t, x) => t + x.pricing.packageSavings, 0),
    discount: ok.reduce((t, x) => t + x.pricing.totalDiscount, 0),
    final: ok.reduce((t, x) => t + x.pricing.final, 0),
    vendors: ok.length, days: checkoutDays,
    events: ok.reduce((t, x) => t + x.days.reduce((s, d) => s + (d.events?.length || 0), 0), 0),
  };
  return { items: out, totals, checkoutDays, priorBookings, settings, wedding };
}

/** Public view of a vendor inside a quote (no owner, calendar internals or view logs). */
export const vendorCard = (v) => ({ _id: v._id, businessName: v.businessName, city: v.city, images: (v.images || []).slice(0, 1), verified: v.verified, rating: v.rating, startingPrice: v.startingPrice, fullDay: v.fullDay });

/**
 * The couple moved or removed wedding events after booking. Open bookings keep their dates, times and price
 * (nothing is silently re-held or re-priced); each affected booking gets an alert, and the vendor and KnotNest
 * are told so they can agree a change with the couple.
 * changes: [{ event, name, kind: 'moved'|'removed', from: { date, time }, to?: { date, time } }]
 */
export async function flagEventChanges(customerId, changes) {
  const list = changes.filter((c) => c.kind === 'removed' || ymd(c.from.date) !== ymd(c.to.date) || (c.from.time || '') !== (c.to.time || ''));
  if (!list.length) return 0;
  const ids = list.map((c) => c.event);
  const bookings = await Booking.find({ customer: customerId, status: { $in: OPEN }, $or: [{ 'days.events.event': { $in: ids } }, { 'days.event': { $in: ids } }, { event: { $in: ids } }] }).populate('vendor', 'businessName owner');
  for (const b of bookings) {
    const touched = list.filter((c) => (b.days || []).some((d) => String(d.event) === String(c.event) || (d.events || []).some((e) => String(e.event) === String(c.event))) || String(b.event) === String(c.event));
    for (const c of touched) {
      const message = c.kind === 'removed'
        ? `${c.name} (${ymd(c.from.date)}) was removed from the wedding plan. This booking still includes it at the agreed price until KnotNest and the vendor update it.`
        : `${c.name} moved from ${ymd(c.from.date)} ${c.from.time || ''} to ${ymd(c.to.date)} ${c.to.time || ''}. This booking still holds the original date and time; please agree the change with the vendor.`.replace(/\s+/g, ' ');
      b.alerts.push({ type: c.kind === 'removed' ? 'event_removed' : 'event_rescheduled', message, at: new Date() });
      if (b.vendor?.owner) await notify(b.vendor.owner, 'Wedding plan changed', message, 'booking', '/vendor/bookings');
      await notifyAdmins('Booked event changed', `${b.vendor?.businessName}: ${message}`, 'booking', '/admin/bookings');
    }
    if (touched.length) await b.save();
  }
  return bookings.length;
}
