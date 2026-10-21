import Guest from '../models/Guest.js';
import Wedding from '../models/Wedding.js';
import User from '../models/User.js';
import { renderInvite } from '../templates/invite.js';
import { sendMail, publicAppUrl } from './emailService.js';
import { liveEvents } from './weddingService.js';
import { themeFor } from '../data/weddingTraditions.js';

export const coupleName = (wedding, customer) =>
  wedding.coupleNames || [customer?.name?.split(' ')[0], wedding.partnerName].filter(Boolean).join(' & ') || 'The couple';

export const rsvpUrl = (token) => `${publicAppUrl()}/rsvp/${token}`;

/** Builds the email for one guest (only the events that guest is invited to). */
export async function buildInvite(guest, { wedding, customer, events, reminder = false }) {
  const mine = new Set(guest.events.map((e) => String(e.event)));
  const list = events.filter((e) => mine.has(String(e._id)));
  return renderInvite({
    couple: coupleName(wedding, customer), message: wedding.inviteMessage, guest, events: list.length ? list : events,
    rsvpUrl: rsvpUrl(guest.token), appUrl: publicAppUrl(), reminder, theme: themeFor(wedding),
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends invitations in the background: each guest gets their own email (nobody sees other guests' addresses),
 * a few at a time with a short pause so SMTP providers don't throttle us. Status is stored per guest.
 */
export async function processQueue(weddingId, guestIds, { reminder = false } = {}) {
  const wedding = await Wedding.findById(weddingId);
  if (!wedding) return;
  const customer = await User.findById(wedding.customer).select('name email');
  const events = await liveEvents(wedding);
  const queue = [...guestIds];
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      const guest = await Guest.findById(id);
      if (!guest) continue;
      try {
        const mail = await buildInvite(guest, { wedding, customer, events, reminder });
        const { previewUrl } = await sendMail({ to: `"${guest.name.replace(/"/g, '')}" <${guest.email}>`, ...mail, replyTo: customer?.email });
        guest.set({ 'invite.status': 'sent', 'invite.sentAt': new Date(), 'invite.error': '', 'invite.previewUrl': previewUrl, 'invite.count': (guest.invite?.count || 0) + 1 });
      } catch (e) {
        guest.set({ 'invite.status': 'failed', 'invite.error': String(e.message || e).slice(0, 300) });
      }
      await guest.save();
      await sleep(250);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/** Called on server start: anything still "queued" was interrupted by a restart. */
export const resetStuckInvites = () =>
  Guest.updateMany({ 'invite.status': 'queued' }, { $set: { 'invite.status': 'failed', 'invite.error': 'Sending was interrupted. Send again.' } }).catch(() => {});
