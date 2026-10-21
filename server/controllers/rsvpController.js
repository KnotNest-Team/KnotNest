import Guest from '../models/Guest.js';
import Wedding from '../models/Wedding.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { liveEvents } from '../services/weddingService.js';
import { coupleName } from '../services/inviteService.js';
import { notify } from '../services/notificationService.js';
import { FOOD } from '../models/Guest.js';
import { themeFor } from '../data/weddingTraditions.js';
import ApiErrorAlias from '../utils/ApiError.js';

const today = () => new Date().toISOString().slice(0, 10);

/** Public: the token in the link is the only key. Never exposes other guests or the couple's account. */
async function load(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token))) throw ApiError.notFound('This invitation link is not valid');
  const guest = await Guest.findOne({ token });
  if (!guest) throw ApiError.notFound('This invitation link is not valid or was removed by the couple');
  const wedding = await Wedding.findById(guest.wedding);
  if (!wedding) throw ApiError.notFound('This wedding is no longer on KnotNest');
  const customer = await User.findById(wedding.customer).select('name');
  return { guest, wedding, customer };
}

async function view({ guest, wedding, customer }, themeOverride) {
  const events = await liveEvents(wedding);
  const byId = Object.fromEntries(events.map((e) => [String(e._id), e]));
  return {
    couple: coupleName(wedding, customer), message: wedding.inviteMessage, location: wedding.location,
    theme: themeOverride || themeFor(wedding),
    guest: {
      name: guest.name, maxGuests: guest.maxGuests, seat: guest.seat, foodPreference: guest.foodPreference, guestNote: guest.guestNote, respondedAt: guest.respondedAt,
      events: guest.events.filter((r) => byId[String(r.event)]).map((r) => {
        const e = byId[String(r.event)];
        return {
          _id: e._id, name: e.name, date: e.date, time: e.time, venueName: e.venueName, address: e.address, mapLink: e.mapLink, dressCode: e.dressCode, notes: e.notes, meaning: e.meaning,
          status: r.status, headcount: r.headcount, closed: new Date(e.date).toISOString().slice(0, 10) < today(),
        };
      }).sort((a, b) => new Date(a.date) - new Date(b.date)),
    },
    foodOptions: FOOD.filter(Boolean),
  };
}

export const get = asyncHandler(async (req, res) => res.json(await view(await load(req.params.token))));

export const respond = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  const { guest } = ctx;
  const responses = Array.isArray(req.body.responses) ? req.body.responses : [];
  const events = await liveEvents(ctx.wedding);
  const dates = Object.fromEntries(events.map((e) => [String(e._id), new Date(e.date).toISOString().slice(0, 10)]));
  const errors = {};
  for (const r of responses) {
    const mine = guest.events.find((x) => String(x.event) === String(r.event));
    if (!mine) continue; // not invited to that event: ignore
    if (dates[String(r.event)] < today()) continue; // event already happened: keep the old answer
    if (!['attending', 'declined', 'pending'].includes(r.status)) { errors[r.event] = 'Choose attending or not attending'; continue; }
    const count = parseInt(r.headcount) || 0;
    if (r.status === 'attending' && (count < 1 || count > guest.maxGuests)) { errors[r.event] = `Enter between 1 and ${guest.maxGuests} people`; continue; }
    mine.status = r.status;
    mine.headcount = r.status === 'attending' ? count : 0;
  }
  if (Object.keys(errors).length) throw ApiError.badRequest('Please check your answers', errors);
  if (req.body.foodPreference !== undefined) {
    if (!FOOD.includes(req.body.foodPreference)) throw ApiError.badRequest('Choose a food preference from the list');
    guest.foodPreference = req.body.foodPreference;
  }
  if (typeof req.body.guestNote === 'string') guest.guestNote = req.body.guestNote.trim().slice(0, 500);
  const first = !guest.respondedAt;
  guest.respondedAt = new Date();
  await guest.save();

  const yes = guest.events.filter((e) => e.status === 'attending').length;
  await notify(ctx.wedding.customer, first ? 'New RSVP' : 'RSVP updated',
    yes ? `${guest.name} is coming to ${yes} ${yes === 1 ? 'event' : 'events'}.` : `${guest.name} can't make it.`, 'rsvp', '/customer/guests');
  res.json(await view(ctx));
});

/** For the couple: their RSVP page exactly as a guest sees it, with a sample guest (optionally another theme). */
export const preview = asyncHandler(async (req, res) => {
  const wedding = await Wedding.findOne({ customer: req.user._id });
  if (!wedding) throw ApiErrorAlias.notFound('Create your wedding profile first');
  const t = String(req.query.theme || '');
  const guest = { name: 'Sharma Uncle & family', maxGuests: 4, seat: 'T4', foodPreference: '', guestNote: '', respondedAt: null, events: wedding.events.map((e) => ({ event: e._id, status: 'pending', headcount: 0 })) };
  res.json({ ...(await view({ guest, wedding, customer: req.user }, /^[a-z]{3,12}$/.test(t) ? t : '')), preview: true });
});
