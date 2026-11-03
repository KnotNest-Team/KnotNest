/**
 * Availability regression tests: `node server/tests/availability.regression.test.js` (no server or database needed).
 *
 * Complements the "Time slots" section of pricing.unit.test.js. Pins the calendar rules in
 * services/availabilityService.js that decide whether a vendor can take a booking:
 *   - time parsing edge cases (12 AM / 12 PM, 24-hour, no minutes) and slot length / midnight clamp
 *   - overlapping vs adjacent slots (a slot ending at 2 PM does not clash with one starting at 2 PM)
 *   - whole-day holds vs time slots, blocked dates vs other couples' slots
 *   - a booking's own holds are ignored when it is checked again (admin review queue, re-acceptance)
 *   - the in-process lock that serialises calendar writes per vendor
 * The database-backed functions (holdBooking, releaseBooking, stillHeld) are not covered here.
 */
import assert from 'assert/strict';
import mongoose from 'mongoose';
import { startMinutes, slotFor, holdsFor, conflictsWith, describeConflicts, withLock, ymd } from '../services/availabilityService.js';

let pass = 0; const fails = [];
const t = async (name, fn) => { try { await fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fails.push(name); console.log(`  FAIL ${name}\n       ${e.message}`); } };
const D1 = '2030-02-14'; const D2 = '2030-02-15';
const want = (slots = [], whole = []) => ({ whole, slots });
const slot = (date, start, end, booking) => ({ date, start, end, ...(booking && { booking }) });
// vendor busy 10:00 AM - 2:00 PM on D1 for booking "other"
const busy = (extra = {}) => ({ unavailableDates: [], bookedSlots: [slot(D1, 600, 840, 'other')], ...extra });

console.log('Reading event times');
await t('12 AM is midnight and 12 PM is noon', () => {
  assert.equal(startMinutes('12:00 AM'), 0); assert.equal(startMinutes('12:30 AM'), 30);
  assert.equal(startMinutes('12:00 PM'), 720); assert.equal(startMinutes('12:45 pm'), 765);
});
await t('hours without minutes, lower case and no space', () => {
  assert.equal(startMinutes('7 pm'), 1140); assert.equal(startMinutes('7PM'), 1140); assert.equal(startMinutes('9am sharp'), 540);
});
await t('24-hour times: valid ones read, impossible ones ignored', () => {
  assert.equal(startMinutes('00:30'), 30); assert.equal(startMinutes('23:59'), 1439);
  assert.equal(startMinutes('24:00'), null); assert.equal(startMinutes('19:75'), null);
});
await t('a range uses its first time; empty or missing text has no time', () => {
  assert.equal(startMinutes('10:00 AM - 2:00 PM'), 600);
  assert.equal(startMinutes(''), null); assert.equal(startMinutes(undefined), null); assert.equal(startMinutes(null), null);
});
await t('impossible 12-hour times are not read (the event then holds the whole day)', () => {
  assert.equal(startMinutes('7:75 PM'), null); assert.equal(startMinutes('99:99 PM'), null);
  assert.equal(startMinutes('12:60 PM'), null); assert.equal(startMinutes('100 PM'), null);
  assert.deepEqual(slotFor('7:75 PM', 4), { start: null, end: null });
});
await t('hour 0 or 13-23 written with AM/PM still reads as a 24-hour time', () => {
  assert.equal(startMinutes('0:30 AM'), 30); assert.equal(startMinutes('00:00 AM'), 0); assert.equal(startMinutes('13:30 PM'), 810);
});
await t('slot length follows the setting (fractions allowed) and never passes midnight', () => {
  assert.deepEqual(slotFor('10:00 AM', 1.5), { start: 600, end: 690 });
  assert.deepEqual(slotFor('10:00 AM'), { start: 600, end: 840 }, 'default 4 hours');
  assert.deepEqual(slotFor('9:00 PM', 6), { start: 1260, end: 1440 });
  assert.deepEqual(slotFor('Evening', 4), { start: null, end: null });
});

console.log('Overlapping and adjacent slots');
await t('adjacent slots on either side do not clash', () => {
  assert.equal(conflictsWith(busy(), want([slot(D1, 840, 1080)])).length, 0, 'starts when the other ends');
  assert.equal(conflictsWith(busy(), want([slot(D1, 360, 600)])).length, 0, 'ends when the other starts');
});
await t('a one-minute overlap clashes', () => {
  assert.equal(conflictsWith(busy(), want([slot(D1, 839, 900)])).length, 1);
  assert.equal(conflictsWith(busy(), want([slot(D1, 300, 601)])).length, 1);
});
await t('a slot inside, or wrapping, the booked one clashes', () => {
  assert.equal(conflictsWith(busy(), want([slot(D1, 660, 720)])).length, 1);
  assert.equal(conflictsWith(busy(), want([slot(D1, 540, 900)])).length, 1);
});
await t('the same time on another date does not clash', () => {
  assert.equal(conflictsWith(busy(), want([slot(D2, 600, 840)])).length, 0);
});
await t('each wanted slot is checked: one free and one taken gives one conflict', () => {
  const out = conflictsWith(busy(), want([slot(D1, 1200, 1440), slot(D1, 700, 760)]));
  assert.equal(out.length, 1); assert.equal(out[0].why, 'booked 10:00 AM to 2:00 PM');
});
await t('the conflict message names the clashing booking time', () => {
  const v = { unavailableDates: [], bookedSlots: [slot(D1, 720, 750, 'other')] };
  assert.equal(conflictsWith(v, want([slot(D1, 700, 800)]))[0].why, 'booked 12:00 PM to 12:30 PM');
});
await t('a slot that runs to midnight ends at 12:00 AM, and one at midnight starts at 12:00 AM', () => {
  const late = { unavailableDates: [], bookedSlots: [slot(D1, 1320, 1440, 'other'), slot(D2, 0, 120, 'other')] };
  assert.equal(conflictsWith(late, want([slot(D1, 1380, 1440)]))[0].why, 'booked 10:00 PM to 12:00 AM');
  assert.equal(conflictsWith(late, want([slot(D2, 60, 90)]))[0].why, 'booked 12:00 AM to 2:00 AM');
});

console.log('Whole-day holds');
await t('a whole day cannot be taken when the date is blocked or partly booked', () => {
  assert.deepEqual(conflictsWith(busy({ unavailableDates: [D2] }), want([], [D1, D2])), [{ date: D1, why: 'partly booked' }, { date: D2, why: 'blocked' }]);
});
await t('a slot cannot be taken on a blocked (whole-day) date', () => {
  assert.deepEqual(conflictsWith({ unavailableDates: [D1], bookedSlots: [] }, want([slot(D1, 1200, 1440)])), [{ date: D1, why: 'blocked' }]);
});
await t('a vendor with no calendar data is free', () => {
  assert.deepEqual(conflictsWith({}, want([slot(D1, 600, 840)], [D2])), []);
});
await t('full-day, whole-date and timeless-event days hold the whole day; timed events hold slots', () => {
  const h = holdsFor({ _id: 'b', days: [
    { date: D1, mode: 'full_day', events: [] },
    { date: D2, mode: 'events', events: [] },                                   // events mode without events
    { date: '2030-02-16', mode: 'events', events: [{ start: 1300 }] },          // no end: 4 hours, clamped at midnight
    { date: '2030-02-17', mode: 'date' },
  ] });
  assert.deepEqual(h.whole, [D1, D2, '2030-02-17']);
  assert.deepEqual(h.slots, [{ date: '2030-02-16', start: 1300, end: 1440, booking: 'b' }]);
});
await t('older bookings without days hold their weddingDate, normalised to YYYY-MM-DD', () => {
  assert.deepEqual(holdsFor({ _id: 'b', weddingDate: new Date(`${D1}T00:00:00.000Z`) }), { whole: [D1], slots: [] });
  assert.equal(ymd(new Date(`${D2}T00:00:00.000Z`)), D2);
});
await t('a booking holds each of its slots, tagged with the booking id', () => {
  const h = holdsFor({ _id: 'b1', days: [{ date: D1, mode: 'events', events: [{ start: 600, end: 840 }, { start: 1140, end: 1380 }] }] });
  assert.deepEqual(h.slots.map((s) => [s.start, s.end, s.booking]), [[600, 840, 'b1'], [1140, 1380, 'b1']]);
});

console.log("A booking's own holds");
const id = new mongoose.Types.ObjectId();
const mine = { _id: id, days: [{ date: D1, mode: 'events', events: [{ start: 600, end: 840 }] }] };
await t('re-checking a booking against a calendar that already holds it finds no conflict (ObjectId vs string)', () => {
  const v = { unavailableDates: [], bookedSlots: [slot(D1, 600, 840, String(id))] };
  assert.equal(conflictsWith(v, holdsFor(mine), id).length, 0);
  assert.equal(conflictsWith(v, holdsFor(mine)).length, 1, 'without the id it is a clash');
});
await t("ignoring own holds never hides another couple's overlapping slot", () => {
  const v = { unavailableDates: [], bookedSlots: [slot(D1, 600, 840, String(id)), slot(D1, 800, 900, 'other')] };
  const out = conflictsWith(v, holdsFor(mine), id);
  assert.equal(out.length, 1); assert.equal(out[0].why, 'booked 1:20 PM to 3:00 PM');
});
await t('own slots do not make the day "partly booked" for a whole-day request of the same booking', () => {
  const v = { unavailableDates: [], bookedSlots: [slot(D1, 600, 840, String(id))] };
  assert.equal(conflictsWith(v, want([], [D1]), id).length, 0);
});
await t('blocked dates carry no owner, so they still conflict even for the same booking', () => {
  // unavailableDates is a plain list of dates: a whole day already held by this booking cannot be told apart from a
  // vendor block. Callers only re-check bookings that do not hold their dates yet (pending_review).
  assert.equal(conflictsWith({ unavailableDates: [D1], bookedSlots: [] }, want([], [D1]), id).length, 1);
});
await t('slots without a booking id are never treated as own', () => {
  const v = { unavailableDates: [], bookedSlots: [slot(D1, 600, 840)] };
  assert.equal(conflictsWith(v, holdsFor(mine), id).length, 1);
});

console.log('Conflict summary');
await t('dates are listed once each, blocked dates without a reason', () => {
  const list = [{ date: D1, why: 'blocked' }, { date: D1, why: 'blocked' }, { date: D2, why: 'booked 10:00 AM to 2:00 PM' }, { date: D2, why: 'booked 10:00 AM to 2:00 PM' }];
  assert.equal(describeConflicts(list), `${D1}, ${D2} (booked 10:00 AM to 2:00 PM)`);
  assert.equal(describeConflicts([]), '');
});

console.log('Calendar lock');
const tick = () => new Promise((r) => setTimeout(r, 5));
await t('work on the same vendor runs one at a time, in order', async () => {
  const log = [];
  const job = (n) => withLock('vendor-a', async () => { log.push(`start ${n}`); await tick(); log.push(`end ${n}`); return n; });
  assert.deepEqual(await Promise.all([job(1), job(2), job(3)]), [1, 2, 3]);
  assert.deepEqual(log, ['start 1', 'end 1', 'start 2', 'end 2', 'start 3', 'end 3']);
});
await t('different vendors do not wait for each other', async () => {
  const log = [];
  const job = (key) => withLock(key, async () => { log.push(`start ${key}`); await tick(); log.push(`end ${key}`); });
  await Promise.all([job('vendor-b'), job('vendor-c')]);
  assert.deepEqual(log.slice(0, 2), ['start vendor-b', 'start vendor-c']);
});
await t('a failed job releases the lock and passes its error on', async () => {
  await assert.rejects(withLock('vendor-d', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await withLock('vendor-d', async () => 'next'), 'next');
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
