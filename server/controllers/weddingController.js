import Wedding, { DEFAULT_TASKS } from '../models/Wedding.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';
import Expense from '../models/Expense.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';
import Guest from '../models/Guest.js';
import { liveEvents } from '../services/weddingService.js';
import { flagEventChanges } from '../services/bookingService.js';
import { planEvents, taskDueDate, daysBetween, addDays } from '../services/plannerService.js';
import { TRADITIONS, traditionList } from '../data/weddingTraditions.js';

const FIELDS = ['partnerName', 'weddingDate', 'location', 'guestCount', 'budget', 'weddingStyle', 'inviteMessage', 'coupleNames', 'culture', 'partnerCulture', 'muhurat', 'inviteTheme'];
const EVENT_FIELDS = ['name', 'date', 'time', 'venueName', 'address', 'mapLink', 'dressCode', 'notes', 'meaning', 'hostSide'];

export const get = asyncHandler(async (req, res) => {
  const wedding = await Wedding.findOne({ customer: req.user._id });
  res.json({ wedding, events: wedding ? await liveEvents(wedding) : [] });
});

const checkFields = (body) => {
  for (const k of ['culture', 'partnerCulture']) if (body[k] && !TRADITIONS[body[k]]) throw ApiError.badRequest('Validation failed', { [k]: 'Choose a tradition from the list' });
  if (body.muhurat && !/^\d{1,2}:\d{2}$/.test(body.muhurat)) throw ApiError.badRequest('Validation failed', { muhurat: 'Enter a time like 09:30' });
};

/** Adds suggested events (all defaults) when the plan is empty and we know the tradition and date. */
async function autoPlan(w) {
  if (w.events.length || !w.culture || !w.weddingDate) return 0;
  const picks = planEvents(w, []).filter((x) => x.selected);
  for (const x of picks) w.events.push(toEvent(x));
  await w.save();
  await inviteGuests(w, w.events.map((e) => e._id));
  return picks.length;
}
const toEvent = (x) => pick(x, ['name', 'date', 'time', 'hostSide', 'meaning', 'tradition', 'templateKey']);

/** Invites guests already on the list to new events: bride-side events go to bride-side and "both" guests, etc. */
async function inviteGuests(w, eventIds) {
  const evs = eventIds.map((id) => w.events.id(id)).filter(Boolean);
  if (!evs.length) return;
  const guests = await Guest.find({ wedding: w._id });
  for (const g of guests) {
    let changed = false;
    for (const ev of evs) {
      if (g.events.some((x) => String(x.event) === String(ev._id))) continue;
      if (ev.hostSide === 'both' || g.side === 'both' || g.side === ev.hostSide) { g.events.push({ event: ev._id, status: 'pending', headcount: 0 }); changed = true; }
    }
    if (changed) await g.save();
  }
}

export const create = asyncHandler(async (req, res) => {
  if (await Wedding.exists({ customer: req.user._id })) throw ApiError.conflict('Wedding profile already exists. Use PUT to update it.');
  checkFields(req.body);
  const wedding = await Wedding.create({
    ...pick(req.body, FIELDS), customer: req.user._id,
    checklist: DEFAULT_TASKS.map((title) => ({ title, dueDate: taskDueDate(title, req.body.weddingDate) })),
  });
  await User.updateOne({ _id: req.user._id }, { wedding: wedding._id });
  const planned = await autoPlan(wedding);
  res.status(201).json({ wedding, events: await liveEvents(wedding), planned });
});

export const traditions = asyncHandler(async (_req, res) => res.json({ traditions: traditionList() }));

/** Preview of suggested events. Nothing is saved; the couple ticks, edits and adds before applying. */
export const plan = asyncHandler(async (req, res) => {
  const w = await mine(req);
  const input = { culture: req.body.culture ?? w.culture, partnerCulture: req.body.partnerCulture ?? w.partnerCulture, weddingDate: req.body.weddingDate ?? w.weddingDate, muhurat: req.body.muhurat ?? w.muhurat };
  checkFields(input);
  if (!input.culture) throw ApiError.badRequest('Choose your wedding tradition first');
  if (!input.weddingDate) throw ApiError.badRequest('Set your main wedding date first');
  res.json({ events: planEvents(input, w.events) });
});

/** Saves the events the couple chose (with their edits). Existing events are never changed or removed. */
export const applyPlan = asyncHandler(async (req, res) => {
  const w = await mine(req);
  const list = Array.isArray(req.body.events) ? req.body.events.slice(0, 30) : [];
  if (!list.length) throw ApiError.badRequest('Choose at least one event');
  const names = new Set(w.events.map((e) => e.name.trim().toLowerCase()));
  const added = [];
  for (const raw of list) {
    const ev = toEvent(raw);
    ev.name = String(ev.name || '').trim();
    if (ev.name.length < 2 || !ev.date || Number.isNaN(new Date(ev.date).getTime())) throw ApiError.badRequest(`Each event needs a name and a date${ev.name ? ` (check "${ev.name}")` : ''}`);
    if (names.has(ev.name.toLowerCase())) continue;
    if (w.events.length >= 30) throw ApiError.badRequest('A wedding can have up to 30 events');
    if (!['bride', 'groom', 'both'].includes(ev.hostSide)) ev.hostSide = 'both';
    w.events.push(ev); names.add(ev.name.toLowerCase());
    added.push(w.events[w.events.length - 1]._id);
  }
  await w.save();
  if (req.body.inviteGuests !== false) await inviteGuests(w, added);
  res.status(201).json({ wedding: w, events: await liveEvents(w), added: added.length });
});

const mine = async (req) => {
  const w = await Wedding.findOne({ customer: req.user._id });
  if (!w) throw ApiError.notFound('Create your wedding profile first');
  return w;
};

export const update = asyncHandler(async (req, res) => {
  const w = await mine(req);
  checkFields(req.body);
  const before = w.weddingDate;
  Object.assign(w, pick(req.body, FIELDS));
  // Wedding date moved: optionally move every event and open checklist task by the same number of days,
  // keeping all of the couple's own edits (names, times, venues, custom events) exactly as they are.
  let shifted = 0; let moved = [];
  if (req.body.shiftEvents && before && w.weddingDate && daysBetween(before, w.weddingDate) !== 0) {
    const n = daysBetween(before, w.weddingDate);
    moved = w.events.map((ev) => ({ event: ev._id, name: ev.name, kind: 'moved', from: { date: ev.date, time: ev.time } }));
    for (const ev of w.events) { ev.date = addDays(ev.date, n); shifted += 1; }
    for (const m of moved) { const ev = w.events.id(m.event); m.to = { date: ev.date, time: ev.time }; }
    for (const t of w.checklist) if (!t.done && t.dueDate) t.dueDate = addDays(t.dueDate, n);
  }
  if (!before && w.weddingDate) for (const t of w.checklist) if (!t.dueDate) t.dueDate = taskDueDate(t.title, w.weddingDate);
  await w.save();
  if (moved.length) await flagEventChanges(req.user._id, moved).catch((e) => console.error('booking alert failed', e.message));
  const planned = await autoPlan(w);
  res.json({ wedding: w, events: await liveEvents(w), shifted, planned });
});

// ---- checklist ----
export const addTask = asyncHandler(async (req, res) => {
  const w = await mine(req);
  if (!req.body.title?.trim()) throw ApiError.badRequest('Task title is required');
  w.checklist.push(pick(req.body, ['title', 'dueDate']));
  await w.save();
  res.status(201).json({ wedding: w });
});
export const updateTask = asyncHandler(async (req, res) => {
  const w = await mine(req);
  const t = w.checklist.id(req.params.taskId);
  if (!t) throw ApiError.notFound('Task not found');
  Object.assign(t, pick(req.body, ['title', 'dueDate', 'done']));
  await w.save();
  res.json({ wedding: w });
});
export const deleteTask = asyncHandler(async (req, res) => {
  const w = await mine(req);
  w.checklist = w.checklist.filter((t) => String(t._id) !== req.params.taskId); // full $set: works on every MongoDB-compatible server
  await w.save();
  res.json({ wedding: w });
});

// ---- events (haldi, mehendi, sangeet, wedding, reception ...) ----
const cleanEvent = (body) => {
  const e = pick(body, EVENT_FIELDS);
  if (e.mapLink && !/^https?:\/\//i.test(e.mapLink)) throw ApiError.badRequest('Map link must start with http:// or https://');
  return e;
};
const eventsResponse = async (res, w, status = 200) => res.status(status).json({ wedding: w, events: await liveEvents(w) });

export const addEvent = asyncHandler(async (req, res) => {
  const w = await mine(req);
  if (w.events.length >= 30) throw ApiError.badRequest('A wedding can have up to 30 events');
  w.events.push(cleanEvent(req.body));
  await w.save();
  if (req.body.inviteGuests !== false) await inviteGuests(w, [w.events[w.events.length - 1]._id]);
  await eventsResponse(res, w, 201);
});
export const updateEvent = asyncHandler(async (req, res) => {
  const w = await mine(req);
  const ev = w.events.id(req.params.eventId);
  if (!ev) throw ApiError.notFound('Event not found');
  const from = { date: ev.date, time: ev.time };
  Object.assign(ev, cleanEvent(req.body));
  if (req.body.detachVenue) ev.venueBooking = null;
  await w.save();
  await flagEventChanges(req.user._id, [{ event: ev._id, name: ev.name, kind: 'moved', from, to: { date: ev.date, time: ev.time } }]).catch((e) => console.error('booking alert failed', e.message));
  await eventsResponse(res, w);
});
export const deleteEvent = asyncHandler(async (req, res) => {
  const w = await mine(req);
  const gone = w.events.id(req.params.eventId);
  if (!gone) throw ApiError.notFound('Event not found');
  const removed = { event: gone._id, name: gone.name, kind: 'removed', from: { date: gone.date, time: gone.time } };
  w.events = w.events.filter((e) => String(e._id) !== req.params.eventId);
  await w.save();
  // guests stop being invited to a deleted event
  const guests = await Guest.find({ wedding: w._id, 'events.event': req.params.eventId });
  for (const g of guests) { g.events = g.events.filter((x) => String(x.event) !== req.params.eventId); await g.save(); }
  await flagEventChanges(req.user._id, [removed]).catch((e) => console.error('booking alert failed', e.message));
  await eventsResponse(res, w);
});

/** Dashboard overview numbers for the customer area. */
export const summary = asyncHandler(async (req, res) => {
  const [wedding, bookedVendors, pendingEnquiries, spent, upcoming, guests] = await Promise.all([
    Wedding.findOne({ customer: req.user._id }),
    Booking.countDocuments({ customer: req.user._id, status: { $in: ['confirmed', 'completed'] } }),
    Enquiry.countDocuments({ customer: req.user._id, status: 'pending' }),
    Expense.find({ customer: req.user._id }).select('amount').lean(),
    Booking.find({ customer: req.user._id, status: { $in: ['pending_review', 'requested', 'vendor_accepted', 'vendor_declined', 'awaiting_customer', 'confirmed'] } }).populate('vendor', 'businessName images').sort('weddingDate').limit(4).lean(),
    Guest.find({ customer: req.user._id }).select('events').lean(),
  ]);
  const rsvp = { invited: guests.length, attending: 0, declined: 0, pending: 0 };
  for (const g of guests) {
    const st = g.events.map((e) => e.status);
    if (st.includes('attending')) rsvp.attending += 1; else if (st.length && st.every((x) => x === 'declined')) rsvp.declined += 1; else rsvp.pending += 1;
  }
  const headcount = guests.reduce((s, g) => s + Math.max(0, ...g.events.filter((e) => e.status === 'attending').map((e) => e.headcount || 1)), 0);
  const total = wedding?.checklist.length || 0;
  const done = wedding?.checklist.filter((t) => t.done).length || 0;
  res.json({
    wedding, bookedVendors, pendingEnquiries, totalSpent: spent.reduce((s, e) => s + e.amount, 0),
    checklist: { total, done, percent: total ? Math.round((done / total) * 100) : 0 }, upcoming,
    events: wedding ? await liveEvents(wedding) : [], rsvp: { ...rsvp, headcount },
  });
});
