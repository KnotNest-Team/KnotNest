import Wedding from '../models/Wedding.js';
import Booking from '../models/Booking.js';
import Category from '../models/Category.js';

const isVenue = async (vendor) => {
  const cat = await Category.findById(vendor.category).select('name slug').lean();
  return /venue/i.test(cat?.slug || cat?.name || '');
};

/** When a venue booking linked to a wedding event is confirmed, that event takes its venue from the booking. */
const eventIds = (b) => [...new Set([...(b.days || []).map((x) => x.event), b.event].filter(Boolean).map(String))];

export async function linkVenueToEvent(booking, vendor) {
  const ids = eventIds(booking);
  if (!ids.length || !(await isVenue(vendor))) return;
  const w = await Wedding.findOne({ customer: booking.customer });
  if (!w) return;
  for (const id of ids) {
    const ev = w.events.id(id);
    if (!ev) continue;
    ev.venueBooking = booking._id;
    ev.venueName = vendor.businessName;
    ev.address = vendor.address || [vendor.location, vendor.city].filter(Boolean).join(', ');
  }
  await w.save();
}

/** A cancelled venue booking stops feeding the event (the typed-in details stay as they were). */
export async function unlinkVenueFromEvent(booking) {
  const ids = eventIds(booking);
  if (!ids.length) return;
  const w = await Wedding.findOne({ customer: booking.customer });
  if (!w) return;
  let changed = false;
  for (const id of ids) { const ev = w.events.id(id); if (ev && String(ev.venueBooking) === String(booking._id)) { ev.venueBooking = null; changed = true; } }
  if (changed) await w.save();
}

/**
 * Events as guests should see them right now: sorted by date, with venue details read live from the
 * linked venue booking (so a vendor's address change shows up on every invitation and RSVP page).
 */
export async function liveEvents(wedding) {
  const events = (wedding?.events || []).map((e) => (e.toObject ? e.toObject() : { ...e }));
  const ids = events.map((e) => e.venueBooking).filter(Boolean);
  if (ids.length) {
    const bookings = await Booking.find({ _id: { $in: ids }, status: { $in: ['confirmed', 'completed'] } }).populate('vendor', 'businessName address location city').lean();
    const byId = Object.fromEntries(bookings.map((b) => [String(b._id), b]));
    for (const e of events) {
      const v = byId[String(e.venueBooking)]?.vendor;
      if (v) { e.venueName = v.businessName; e.address = v.address || [v.location, v.city].filter(Boolean).join(', '); e.venueFromBooking = true; }
    }
  }
  for (const e of events) if (!e.mapLink && (e.address || e.venueName)) e.mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venueName, e.address].filter(Boolean).join(', '))}`;
  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}
