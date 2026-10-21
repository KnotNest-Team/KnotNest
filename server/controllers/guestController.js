import Guest from '../models/Guest.js';
import Wedding from '../models/Wedding.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pick } from '../utils/validate.js';
import { liveEvents } from '../services/weddingService.js';
import { buildInvite, processQueue, coupleName } from '../services/inviteService.js';
import { mailStatus } from '../services/emailService.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ['name', 'email', 'phone', 'side', 'maxGuests', 'seat'];
const MAX_GUESTS = 1000;

const requireMail = async () => {
  if ((await mailStatus()).mode === 'none') throw new ApiError(503, 'Email is not set up on the server yet. Add SMTP_HOST, SMTP_USER and SMTP_PASS. You can still share invitations on WhatsApp.');
};

const myWedding = async (req) => {
  const w = await Wedding.findOne({ customer: req.user._id });
  if (!w) throw ApiError.notFound('Create your wedding profile first');
  return w;
};

/** Validates guest fields; returns a clean object. */
function clean(body, partial = false) {
  const g = pick(body, FIELDS);
  for (const k of ['name', 'email', 'phone', 'seat']) if (typeof g[k] === 'string') g[k] = g[k].trim();
  if (!partial || g.name !== undefined) if (!g.name || g.name.length < 2) throw ApiError.badRequest('Validation failed', { name: 'Enter the guest or family name' });
  if (g.email) { g.email = g.email.toLowerCase(); if (!EMAIL.test(g.email)) throw ApiError.badRequest('Validation failed', { email: `"${g.email}" is not a valid email` }); }
  if (g.side !== undefined && !['bride', 'groom', 'both'].includes(g.side)) g.side = 'both';
  if (g.maxGuests !== undefined) g.maxGuests = Math.min(20, Math.max(1, parseInt(g.maxGuests) || 1));
  return g;
}

/** Invited events: keep existing replies for events that stay, add new ones as pending. */
function setEvents(guest, eventIds, wedding) {
  const valid = new Set(wedding.events.map((e) => String(e._id)));
  const ids = [...new Set((eventIds || []).map(String))].filter((id) => valid.has(id));
  const prev = Object.fromEntries((guest.events || []).map((e) => [String(e.event), e]));
  guest.events = ids.map((id) => prev[id] || { event: id, status: 'pending', headcount: 0 });
}

function summarize(guests, events) {
  const perEvent = events.map((e) => ({ event: String(e._id), name: e.name, date: e.date, invited: 0, attending: 0, headcount: 0, declined: 0, pending: 0 }));
  const idx = Object.fromEntries(perEvent.map((p, i) => [p.event, i]));
  const food = {};
  let attending = 0; let declined = 0; let pending = 0; let headcount = 0;
  for (const g of guests) {
    for (const r of g.events) {
      const p = perEvent[idx[String(r.event)]];
      if (!p) continue;
      p.invited += 1; p[r.status] += 1;
      if (r.status === 'attending') p.headcount += r.headcount || 1;
    }
    const st = g.events.map((r) => r.status);
    if (st.includes('attending')) {
      attending += 1;
      const people = Math.max(...g.events.filter((r) => r.status === 'attending').map((r) => r.headcount || 1));
      headcount += people;
      if (g.foodPreference) food[g.foodPreference] = (food[g.foodPreference] || 0) + people;
    } else if (st.length && st.every((s) => s === 'declined')) declined += 1; else pending += 1;
  }
  return { invited: guests.length, attending, declined, pending, headcount, perEvent, food };
}

export const list = asyncHandler(async (req, res) => {
  const w = await Wedding.findOne({ customer: req.user._id });
  if (!w) return res.json({ needsWedding: true, guests: [], events: [] });
  const [guests, events, mail] = await Promise.all([Guest.find({ wedding: w._id }).sort('name').lean(), liveEvents(w), mailStatus()]);
  res.json({ guests, events, summary: summarize(guests, events), mail, couple: coupleName(w, req.user) });
});

export const create = asyncHandler(async (req, res) => {
  const w = await myWedding(req);
  if ((await Guest.countDocuments({ wedding: w._id })) >= MAX_GUESTS) throw ApiError.badRequest(`A guest list can have up to ${MAX_GUESTS} invitations`);
  const g = clean(req.body);
  if (g.email && (await Guest.exists({ wedding: w._id, email: g.email }))) throw ApiError.conflict(`${g.email} is already on your guest list`);
  const guest = new Guest({ ...g, wedding: w._id, customer: req.user._id });
  setEvents(guest, req.body.events ?? w.events.map((e) => e._id), w);
  await guest.save();
  res.status(201).json({ guest });
});

/** Bulk add, e.g. pasted from a spreadsheet. Rows with problems are reported back, the rest are added. */
export const importMany = asyncHandler(async (req, res) => {
  const w = await myWedding(req);
  const rows = Array.isArray(req.body.guests) ? req.body.guests.slice(0, 500) : [];
  if (!rows.length) throw ApiError.badRequest('Add at least one guest');
  const existing = new Set((await Guest.find({ wedding: w._id }).select('email').lean()).map((g) => g.email).filter(Boolean));
  if (existing.size + rows.length > MAX_GUESTS) throw ApiError.badRequest(`A guest list can have up to ${MAX_GUESTS} invitations`);
  const events = req.body.events ?? w.events.map((e) => e._id);
  const added = []; const skipped = [];
  for (const [i, row] of rows.entries()) {
    try {
      const g = clean(row);
      if (g.email && existing.has(g.email)) throw new Error(`${g.email} is already on the list`);
      const guest = new Guest({ ...g, wedding: w._id, customer: req.user._id });
      setEvents(guest, events, w);
      await guest.save();
      if (g.email) existing.add(g.email);
      added.push(guest);
    } catch (e) { skipped.push({ row: i + 1, name: row?.name || '', reason: e.details ? Object.values(e.details)[0] : e.message }); }
  }
  res.status(201).json({ added: added.length, skipped });
});

const mine = async (req) => {
  const guest = await Guest.findOne({ _id: req.params.id, customer: req.user._id });
  if (!guest) throw ApiError.notFound('Guest not found');
  return guest;
};

export const update = asyncHandler(async (req, res) => {
  const w = await myWedding(req);
  const guest = await mine(req);
  const g = clean(req.body, true);
  if (g.email && g.email !== guest.email && (await Guest.exists({ wedding: w._id, email: g.email, _id: { $ne: guest._id } }))) throw ApiError.conflict(`${g.email} is already on your guest list`);
  Object.assign(guest, g);
  if (req.body.events) setEvents(guest, req.body.events, w);
  await guest.save();
  res.json({ guest });
});

export const remove = asyncHandler(async (req, res) => {
  const guest = await mine(req);
  await guest.deleteOne();
  res.json({ message: 'Guest removed' });
});

/** Queues invitations. body: { guestIds?: [], onlyNew?: true } */
export const send = asyncHandler(async (req, res) => {
  await requireMail();
  const w = await myWedding(req);
  if (!w.events.length) throw ApiError.badRequest('Add at least one event (date and venue) before sending invitations');
  const filter = { wedding: w._id, email: { $ne: '' } };
  if (Array.isArray(req.body.guestIds) && req.body.guestIds.length) filter._id = { $in: req.body.guestIds };
  else if (req.body.onlyNew !== false) filter['invite.status'] = { $in: ['not_sent', 'failed'] };
  const guests = (await Guest.find(filter).select('_id events invite').lean()).filter((g) => g.events.length && g.invite?.status !== 'queued');
  if (!guests.length) throw ApiError.badRequest('No guests to send to. Guests need an email address and at least one event.');
  const ids = guests.map((g) => g._id);
  await Guest.updateMany({ _id: { $in: ids } }, { $set: { 'invite.status': 'queued', 'invite.error': '' } });
  processQueue(w._id, ids).catch((e) => console.error('[invites] queue failed', e));
  // planning progress: the "Send Invitations" task is done once invitations go out
  const task = w.checklist.find((t) => /send invitations/i.test(t.title));
  if (task && !task.done) { task.done = true; await w.save(); }
  res.status(202).json({ queued: ids.length });
});

/** Reminds guests who received the invitation but haven't answered for every event yet. */
export const remind = asyncHandler(async (req, res) => {
  await requireMail();
  const w = await myWedding(req);
  const guests = (await Guest.find({ wedding: w._id, email: { $ne: '' }, 'invite.status': 'sent' }).select('_id events').lean())
    .filter((g) => g.events.some((e) => e.status === 'pending'));
  if (!guests.length) throw ApiError.badRequest('Everyone who received an invitation has replied');
  const ids = guests.map((g) => g._id);
  await Guest.updateMany({ _id: { $in: ids } }, { $set: { 'invite.status': 'queued' } });
  processQueue(w._id, ids, { reminder: true }).catch((e) => console.error('[invites] reminder queue failed', e));
  res.status(202).json({ queued: ids.length });
});

/** Returns the invitation HTML so the couple can see exactly what guests will get. */
export const preview = asyncHandler(async (req, res) => {
  const w = await myWedding(req);
  if (!w.events.length) throw ApiError.badRequest('Add an event first to preview the invitation');
  const events = await liveEvents(w);
  const guest = (req.query.guest && (await Guest.findOne({ _id: req.query.guest, customer: req.user._id })))
    || { name: 'Sharma Uncle & family', maxGuests: 4, seat: '', token: 'preview', events: events.map((e) => ({ event: e._id })) };
  const mail = await buildInvite(guest, { wedding: w, customer: req.user, events, reminder: req.query.reminder === 'true' });
  res.json({ subject: mail.subject, html: mail.html });
});
