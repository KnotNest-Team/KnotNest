import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pageParams } from '../utils/validate.js';
import { notify, notifyAdmins } from '../services/notificationService.js';
import { linkVenueToEvent, unlinkVenueFromEvent } from '../services/weddingService.js';
import { getSettings } from '../models/Setting.js';
import { OPEN, buildCheckout, resolveDays, priceDays, availabilityIssues, eventsByDay, priorBookingCount, vendorCard } from '../services/bookingService.js';
import { holdBooking, releaseBooking, stillHeld, withLock, conflictsWith, holdsFor, describeConflicts } from '../services/availabilityService.js';
import Wedding from '../models/Wedding.js';

export { OPEN };
const day = (d) => new Date(d).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const HOLDS_DATE = ['vendor_accepted', 'awaiting_customer', 'confirmed'];
/** In auto mode, verified vendors skip the admin review steps. */
const autoPass = (settings, vendor) => settings.bookingApproval === 'auto_verified' && vendor.verified;
const step = (booking, status, by, note = '') => { booking.status = status; booking.stageAt = new Date(); booking.history.push({ status, by, note, at: new Date() }); };

/** Every day a booking covers, as YYYY-MM-DD (older single-day bookings use weddingDate). */
export const bookingDays = (b) => (b.days?.length ? b.days.map((x) => day(x.date)) : [day(b.weddingDate)]);

/** Older request bodies: { vendor, weddingDate, event?, packageName? } or { vendor, days: [{ date, event?, packageName? }] }. */
const daysFromBody = (body) => {
  const raw = Array.isArray(body.days) && body.days.length ? body.days : [{ date: body.weddingDate, event: body.event, packageName: body.packageName }];
  return raw.map((x) => ({ ...x, packageName: x?.packageName || body.packageName || '' }));
};

/** Plain JSON for one priced item (quote responses). */
const itemView = (x) => ({
  vendor: vendorCard(x.vendor), error: x.error || null, issues: x.issues || [], notes: x.notes || [], bookingType: x.bookingType,
  days: x.days.map((d) => ({ date: d.date, mode: d.mode, events: d.events, subtotal: d.subtotal, packagePrice: d.packagePrice, amount: d.amount, discount: d.discount || 0, packageName: d.packageName, eventName: d.eventName })),
  pricing: x.pricing || null,
});

/** Saves one booking per vendor in the checkout; every price comes from buildCheckout. */
async function saveCheckout(req, items, { notes = '', expectedTotal } = {}) {
  return withLock(`customer:${req.user._id}`, async () => {
    const built = await buildCheckout(req.user, items);
    const problems = built.items.flatMap((x) => x.issues.map((i) => i.message));
    if (problems.length) throw new ApiError(409, problems[0], { issues: problems });
    // the couple confirms the price they saw; if anything changed since (vendor price, rules, history) they see the new quote first
    if (expectedTotal !== undefined && expectedTotal !== null && Number(expectedTotal) !== built.totals.final)
      throw new ApiError(409, `The price changed to ₹${built.totals.final.toLocaleString('en-IN')} since your quote. Please review it and confirm again.`, { quote: { items: built.items.map(itemView), totals: built.totals } });

    const settings = built.settings;
    const checkout = built.items.length > 1 ? `co_${crypto.randomBytes(6).toString('hex')}` : '';
    const now = new Date();
    const saved = [];
    for (const x of built.items) {
      const days = x.days.map((d) => ({
        date: new Date(`${d.date}T00:00:00.000Z`), event: d.event || null, eventName: d.eventName || '', packageName: d.packageName || '',
        amount: d.amount, mode: d.mode, events: d.events || [], subtotal: d.subtotal, packagePrice: d.packagePrice ?? null,
      }));
      const names = [...new Set(days.flatMap((d) => (d.events.length ? d.events.map((e) => e.name) : d.eventName ? [d.eventName] : [])))];
      const pkgs = [...new Set(days.map((d) => d.packageName).filter(Boolean))];
      const booking = new Booking({
        customer: req.user._id, vendor: x.vendor._id, wedding: built.wedding?._id || null, checkout, bookingType: x.bookingType,
        notes: String(x.rawNotes ?? notes ?? '').slice(0, 2000),
        eventType: names.length ? names.join(', ').slice(0, 120) : (req.body.eventType || 'Wedding'),
        packageName: pkgs.length === 1 ? pkgs[0] : pkgs.length ? 'Mixed' : '',
        weddingDate: days[0].date, event: days[0].event, days,
        amount: x.pricing.final,
        pricing: { ...x.pricing, rules: settings.discounts, quotedAt: now },
      });
      const span = days.length > 1 ? `${days.length} days from ${day(days[0].date)}` : day(days[0].date);
      booking.history.push({ status: 'pending_review', by: 'customer', note: booking.notes, at: now });
      if (autoPass(settings, x.vendor)) {
        step(booking, 'requested', 'system', 'Verified vendor: sent straight to the vendor');
        await notify(x.vendor.owner, 'New booking request', `${req.user.name} requested a booking for ${span}${names.length ? ` (${names.join(', ')})` : ''}.`, 'booking', '/vendor/bookings');
        await notify(req.user._id, 'Booking request sent', `Your request was sent to ${x.vendor.businessName}.`, 'booking', '/customer/bookings');
      } else {
        booking.status = 'pending_review';
        await notifyAdmins('Booking to review', `${req.user.name} requested ${x.vendor.businessName} for ${span}.`, 'booking', '/admin/booking-reviews');
        await notify(req.user._id, 'Booking request received', `KnotNest is reviewing your request to ${x.vendor.businessName}. We'll pass it on shortly.`, 'booking', '/customer/bookings');
      }
      await booking.save();
      saved.push(booking);
    }
    return { bookings: saved, totals: built.totals, checkout };
  });
}

/**
 * One vendor (vendor profile "Request booking"):
 *   { vendor, days: [{ date, mode?: 'full_day'|'events', events?: [eventId], packageName? }], notes, expectedTotal? }
 *   or the older single-day form { vendor, weddingDate, event?, packageName? }.
 */
export const create = asyncHandler(async (req, res) => {
  const { bookings } = await saveCheckout(req, [{ vendor: req.body.vendor, days: daysFromBody(req.body) }], { notes: req.body.notes || '', expectedTotal: req.body.expectedTotal });
  res.status(201).json({ booking: bookings[0] });
});

/** Several vendors in one go: { items: [{ vendor, days, notes? }], notes, expectedTotal? }. Creates one booking per vendor. */
export const checkout = asyncHandler(async (req, res) => {
  const result = await saveCheckout(req, req.body.items, { notes: req.body.notes || '', expectedTotal: req.body.expectedTotal });
  res.status(201).json(result);
});

/** Live price for a selection (nothing saved). Same body as checkout, or { vendor, days } for one vendor. */
export const quote = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [{ vendor: req.body.vendor, days: daysFromBody(req.body) }];
  const built = await buildCheckout(req.user, items, { strict: false });
  res.json({ items: built.items.map(itemView), totals: built.totals, priorBookings: built.priorBookings, rules: built.settings.discounts, fullDayPackages: built.settings.fullDayPackages });
});

/**
 * Vendors of one category that can take a selection: { category, city?, days: [...], checkoutDays? }.
 * Each vendor comes with its own price for exactly that selection and whether its calendar is free.
 */
export const availableVendors = asyncHandler(async (req, res) => {
  const cat = await Category.findOne(/^[a-f\d]{24}$/i.test(String(req.body.category)) ? { _id: req.body.category } : { name: String(req.body.category || '') }).select('_id name').lean();
  if (!cat) throw ApiError.badRequest('Choose a category');
  const [settings, wedding, prior] = await Promise.all([getSettings(), Wedding.findOne({ customer: req.user._id }).select('events').lean(), priorBookingCount(req.user._id)]);
  const byDay = eventsByDay(wedding, settings.eventSlotHours);
  const filter = { status: 'approved', category: cat._id };
  if (req.body.city) filter.city = new RegExp(`^${String(req.body.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const vendors = await Vendor.find(filter).sort({ featured: -1, rating: -1 }).limit(40).lean();
  const checkoutDays = Math.max(Number(req.body.checkoutDays) || 0, new Set((req.body.days || []).map((d) => d?.date && day(d.date))).size);
  const out = [];
  for (const v of vendors) {
    try {
      const days = resolveDays(v, req.body.days, { byDay, settings });
      const priced = priceDays(days, { rules: settings.discounts, priorBookings: prior, checkoutDays }, v);
      const issues = await availabilityIssues(v, priced.days, { customerId: req.user._id });
      out.push({ vendor: vendorCard(v), available: !issues.length, issues: issues.map((i) => i.message), pricing: priced.pricing, days: priced.days.map((d) => ({ date: d.date, mode: d.mode, events: d.events, amount: d.amount })) });
    } catch (e) {
      out.push({ vendor: vendorCard(v), available: false, issues: [e.message], pricing: null, days: [] });
    }
  }
  out.sort((a, b) => Number(b.available) - Number(a.available) || (a.pricing?.final ?? 1e12) - (b.pricing?.final ?? 1e12));
  res.json({ category: cat, vendors: out });
});

/** The couple's wedding days and events with what is already booked for each (wizard step 1-2). */
export const plan = asyncHandler(async (req, res) => {
  const [settings, wedding] = await Promise.all([getSettings(), Wedding.findOne({ customer: req.user._id }).select('events weddingDate location').lean()]);
  const byDay = eventsByDay(wedding, settings.eventSlotHours);
  const open = await Booking.find({ customer: req.user._id, status: { $in: OPEN } }).populate({ path: 'vendor', select: 'businessName category', populate: { path: 'category', select: 'name' } }).select('vendor days status').lean();
  const booked = {}; // eventId -> [{ vendor, category, status }]
  for (const b of open) for (const d of b.days || []) for (const e of d.events || []) (booked[String(e.event)] ||= []).push({ vendor: b.vendor?.businessName, category: b.vendor?.category?.name || '', status: b.status, booking: b._id });
  const days = Object.entries(byDay).filter(([d]) => d >= today()).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({ date, events: events.map((e) => ({ ...e, booked: booked[String(e._id)] || [] })) }));
  res.json({ days, location: wedding?.location || '', hasWedding: !!wedding, settings: { fullDayPackages: settings.fullDayPackages, discounts: settings.discounts, eventSlotHours: settings.eventSlotHours }, priorBookings: await priorBookingCount(req.user._id) });
});

export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  if (req.user.role === 'vendor') filter.vendor = (await Vendor.findOne({ owner: req.user._id }).select('_id'))?._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'vendor') filter.status = req.query.status && req.query.status !== 'pending_review' ? req.query.status : { $ne: 'pending_review' };
  const { page, limit, skip } = pageParams(req.query, 20);
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate('vendor', 'businessName images logo city').populate('customer', 'name email phone').sort('-createdAt').skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  // each side sees only KnotNest's note meant for them
  if (req.user.role === 'customer') for (const b of bookings) delete b.adminNoteVendor;
  if (req.user.role === 'vendor') for (const b of bookings) { delete b.adminNote; b.history = (b.history || []).filter((h) => h.status !== 'pending_review'); }
  res.json({ bookings, total, page, pages: Math.ceil(total / limit) || 1 });
});

// allowed transitions per actor
const FLOW = {
  admin: {
    pending_review: ['requested', 'cancelled'],          // approve and forward to vendor, or reject
    requested: ['cancelled'],
    vendor_accepted: ['awaiting_customer', 'cancelled'], // forward the vendor's offer to the couple
    vendor_declined: ['cancelled'],                      // pass the decline on to the couple
    awaiting_customer: ['cancelled'],
    confirmed: ['completed', 'cancelled'],
    cancelled: ['pending_review'],
  },
  vendor: { requested: ['vendor_accepted', 'vendor_declined'], vendor_accepted: ['cancelled'], awaiting_customer: ['cancelled'], confirmed: ['completed', 'cancelled'] },
  customer: {
    pending_review: ['cancelled'], requested: ['cancelled'], vendor_accepted: ['cancelled'], vendor_declined: ['cancelled'],
    awaiting_customer: ['confirmed', 'cancelled'], confirmed: ['cancelled'],
  },
};

export const update = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('vendor');
  if (!booking) throw ApiError.notFound('Booking not found');
  const { role } = req.user;
  if (role === 'customer' && String(booking.customer) !== String(req.user._id)) throw ApiError.forbidden();
  if (role === 'vendor' && String(booking.vendor.owner) !== String(req.user._id)) throw ApiError.forbidden();

  const next = req.body.status;
  const from = booking.status;
  if (!(FLOW[role][from] || []).includes(next)) throw ApiError.badRequest(`Cannot change a ${from.replace('_', ' ')} booking to ${String(next).replace('_', ' ')}`);
  const vendor = booking.vendor;
  const dates = bookingDays(booking);
  const d = dates.length > 1 ? `${dates[0]} to ${dates.at(-1)}` : dates[0];
  const note = String(req.body.note || '').trim().slice(0, 1000);
  if (next === 'completed' && role !== 'admin' && dates.at(-1) > today()) throw ApiError.badRequest(`The last day is ${dates.at(-1)}. You can mark it completed on or after that date.`);
  if (role === 'admin' && next === 'cancelled' && from === 'pending_review' && note.length < 5) throw ApiError.badRequest('Tell the couple why the request was not approved (at least 5 characters)');

  // Before the couple confirms: the vendor must still be listed and still hold every day / time slot of this booking
  if (role === 'customer' && next === 'confirmed' && !(await stillHeld(vendor._id, booking)))
    throw ApiError.conflict(`${vendor.businessName} is no longer available for this booking. KnotNest has been told and will help you find an alternative.`);

  // the vendor holds the days / time slots when accepting; they are released if the booking is cancelled later
  if (next === 'vendor_accepted') await holdBooking(vendor._id, booking);
  if (next === 'cancelled' && HOLDS_DATE.includes(from)) await releaseBooking(vendor._id, booking);

  // the vendor may adjust the price when accepting; KnotNest reviews any change (the original quote stays in pricing)
  let priceChanged = false;
  const adjust = (by, amt) => {
    if (amt === booking.amount) return;
    booking.pricing ||= {};
    booking.pricing.adjustments = [...(booking.pricing.adjustments || []), { by, from: booking.amount, to: amt, note, at: new Date() }];
    booking.amount = amt; priceChanged = true;
  };
  if (role === 'vendor' && next === 'vendor_accepted' && req.body.amount !== undefined) adjust('vendor', Math.max(0, Math.round(Number(req.body.amount) || 0)));
  if (role === 'admin' && req.body.amount !== undefined && ['pending_review', 'vendor_accepted'].includes(from)) adjust('admin', Math.max(0, Math.round(Number(req.body.amount) || 0)));
  // the price the couple confirms is locked; later rule or vendor price changes never touch it
  if (next === 'confirmed' && booking.pricing) booking.pricing.confirmedAt = new Date();
  if (role === 'vendor') booking.vendorNote = note;
  if (role === 'admin' && note) {
    if (next !== 'requested') booking.adminNote = note;              // to the couple
    if (next === 'requested' || next === 'cancelled') booking.adminNoteVendor = note; // to the vendor
  }
  step(booking, next, role, note);

  // auto mode: a verified vendor's unchanged acceptance or decline goes straight to the couple
  const settings = await getSettings();
  if (role === 'vendor' && autoPass(settings, vendor) && !priceChanged) {
    if (next === 'vendor_accepted') step(booking, 'awaiting_customer', 'system', 'Verified vendor: sent straight to you');
    if (next === 'vendor_declined') step(booking, 'cancelled', 'system', 'Verified vendor declined');
  }
  await booking.save();

  if (booking.status === 'confirmed') await linkVenueToEvent(booking, vendor).catch((e) => console.error('venue link failed', e.message));
  if (booking.status === 'cancelled') await unlinkVenueFromEvent(booking).catch(() => {});

  // ---- who hears about it ----
  const cust = booking.customer; const name = vendor.businessName; const cLink = '/customer/bookings'; const vLink = '/vendor/bookings';
  const s = booking.status;
  if (s === 'requested') await notify(vendor.owner, 'New booking request', `A couple requested your services for ${d}${note ? `: ${note}` : '.'}`, 'booking', vLink);
  if (s === 'requested' && role === 'admin') await notify(cust, 'Request approved', `KnotNest approved your request and sent it to ${name}.`, 'booking', cLink);
  if (s === 'vendor_accepted' || s === 'vendor_declined') await notifyAdmins(`Vendor ${s === 'vendor_accepted' ? 'accepted' : 'declined'}: review needed`, `${name} ${s === 'vendor_accepted' ? 'accepted' : 'declined'} the booking for ${d}.`, 'booking', '/admin/booking-reviews');
  if (s === 'awaiting_customer') await notify(cust, `${name} can do your date!`, `Confirm your booking for ${d} to lock it in${booking.adminNote && role === 'admin' ? `. KnotNest: ${booking.adminNote}` : '.'}`, 'booking', cLink);
  if (s === 'confirmed') {
    await notify(vendor.owner, 'Booking confirmed', `The couple confirmed the booking for ${d}.`, 'booking', vLink);
    await notify(cust, 'Booking confirmed', `Pay the advance for ${name} to lock in your date.`, 'booking', cLink);
  }
  if (s === 'cancelled') {
    const why = role === 'admin' ? (from === 'vendor_declined' ? `${name} is not available for ${d}${note ? `. KnotNest: ${note}` : '. Browse similar vendors on KnotNest.'}` : `Your booking with ${name} for ${d} was not approved${note ? `: ${note}` : '.'}`)
      : role === 'vendor' ? (from === 'requested' ? `${name} is not available for ${d}. Browse similar vendors on KnotNest.` : `${name} cancelled the booking for ${d}.`) : null;
    if (why || role === 'vendor') await notify(cust, 'Booking update', why || `${name} is not available for ${d}.`, 'booking', cLink);
    if (role === 'customer' && from !== 'pending_review') await notify(vendor.owner, 'Booking cancelled', `${req.user.name} cancelled the booking for ${d}.`, 'booking', vLink);
    if (role === 'admin' && HOLDS_DATE.concat(['requested']).includes(from)) await notify(vendor.owner, 'Booking cancelled', `KnotNest cancelled the booking for ${d}${note ? `: ${note}` : '.'}`, 'booking', vLink);
  }
  if (s === 'completed') await notify(cust, 'How was your experience?', `Leave a review for ${name}.`, 'review', '/customer/reviews');
  res.json({ booking });
});

/** Admin review queue: everything waiting for KnotNest, oldest first, with how long it has waited. */
export const reviewQueue = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  const bookings = await Booking.find({ status: { $in: ['pending_review', 'vendor_accepted', 'vendor_declined'] } })
    .populate('vendor', 'businessName city verified rating startingPrice packages fullDay').populate('customer', 'name email phone').sort('stageAt').lean();
  const now = Date.now();
  for (const b of bookings) {
    b.waitingHours = Math.round((now - new Date(b.stageAt || b.updatedAt)) / 36e5);
    b.overdue = b.waitingHours > settings.reviewHours;
    const priceOf = (name) => (name ? b.vendor?.packages?.find((p) => p.name === name)?.price : undefined) ?? b.vendor?.startingPrice ?? 0;
    // new bookings: the quote the server calculated; older ones: the vendor's listed package prices
    const listed = b.pricing?.version >= 2 ? b.pricing.final : b.days?.length ? b.days.reduce((t, x) => t + priceOf(x.packageName), 0) : priceOf(b.packageName);
    b.checks = {
      vendorVerified: !!b.vendor?.verified, priceAsListed: listed === b.amount, listedPrice: listed, days: bookingDays(b).length,
      discount: b.pricing?.totalDiscount || 0, events: (b.days || []).reduce((t, d) => t + (d.events?.length || 0), 0), alerts: (b.alerts || []).filter((x) => !x.resolved).length,
    };
    if (b.status === 'pending_review') {
      const v = await Vendor.findById(b.vendor?._id).select('unavailableDates bookedSlots businessName').lean();
      const clash = v ? conflictsWith(v, holdsFor(b), b._id) : [];
      b.checks.calendarFree = !clash.length;
      if (clash.length) b.checks.calendarNote = describeConflicts(clash);
    }
  }
  res.json({ bookings, settings });
});
