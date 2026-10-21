/**
 * Discount engine unit tests: `npm run test:unit` (no server or database needed).
 * Covers the pricing rules in services/pricingEngine.js and the time-slot logic in services/availabilityService.js.
 */
import assert from 'assert/strict';
import { priceBooking, eventPrice, offersEvent, multiEventTier } from '../services/pricingEngine.js';
import { DEFAULT_DISCOUNTS, withDefaults } from '../models/Setting.js';
import { startMinutes, slotFor, holdsFor, conflictsWith } from '../services/availabilityService.js';

let pass = 0; const fails = [];
const t = (name, fn) => { try { fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fails.push(name); console.log(`  FAIL ${name}\n       ${e.message}`); } };
const rules = (patch = {}) => ({ ...JSON.parse(JSON.stringify(DEFAULT_DISCOUNTS)), ...patch });
const ev = (name, price) => ({ name, price });
const D1 = '2030-02-14'; const D2 = '2030-02-15';
const day1 = [ev('Haldi', 15000), ev('Mehendi', 20000), ev('Sangeet', 30000)];
const day2 = [ev('Wedding', 50000), ev('Reception', 40000)];
const types = (p) => [...new Set(p.discounts.filter((d) => d.amount > 0).map((d) => d.type))].sort().join(',');

console.log('Discount engine');
t('one event: no multi-event discount', () => {
  const { pricing, bookingType } = priceBooking([{ date: D1, mode: 'events', events: [day1[0]] }], { rules: rules() });
  assert.equal(pricing.final, 15000); assert.equal(pricing.totalDiscount, 0); assert.equal(bookingType, 'single_event');
});
t('two events on one day: 5%', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'events', events: [day1[0], day1[2]] }], { rules: rules() });
  assert.equal(pricing.subtotal, 45000); assert.equal(pricing.totalDiscount, 2250); assert.equal(pricing.final, 42750); assert.equal(types(pricing), 'multi_event');
});
t('three events picked one by one: 10% tier (not 5% + 10%)', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'events', events: day1 }], { rules: rules() });
  assert.equal(pricing.discounts.length, 1); assert.equal(pricing.discounts[0].percent, 10); assert.equal(pricing.final, 58500);
});
t('removing an event recalculates (3 -> 2 events: 10% -> 5%)', () => {
  const a = priceBooking([{ date: D1, mode: 'events', events: day1 }], { rules: rules() }).pricing;
  const b = priceBooking([{ date: D1, mode: 'events', events: day1.slice(0, 2) }], { rules: rules() }).pricing;
  assert.equal(a.discounts[0].percent, 10); assert.equal(b.discounts[0].percent, 5); assert.equal(b.final, 33250);
});
t('full day: example from the brief (65,000 -> 55,250)', () => {
  const { pricing, bookingType } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules() });
  assert.equal(pricing.subtotal, 65000); assert.equal(pricing.totalDiscount, 9750); assert.equal(pricing.final, 55250); assert.equal(bookingType, 'full_day');
  assert.equal(types(pricing), 'full_day');
});
t('full day never also gets the multi-event discount', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules() });
  assert.ok(!pricing.discounts.some((d) => d.type === 'multi_event'));
});
t('full day with a single event gets no package discount', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: [day1[0]] }], { rules: rules() });
  assert.equal(pricing.totalDiscount, 0);
});
t('vendor full-day package price replaces the sum (no extra platform full-day %)', () => {
  const { pricing, days } = priceBooking([{ date: D1, mode: 'full_day', events: day1, packagePrice: 52000 }], { rules: rules() });
  assert.equal(pricing.packageSavings, 13000); assert.equal(days[0].amount, 52000); assert.equal(pricing.totalDiscount, 0); assert.equal(pricing.final, 52000);
});
t('vendor package price above the sum is ignored', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1, packagePrice: 90000 }], { rules: rules() });
  assert.equal(pricing.packageSavings, 0); assert.equal(pricing.discounts[0].type, 'full_day');
});
t('events on two days: multi-event per day + multi-day, capped at 20%', () => {
  const { pricing, bookingType } = priceBooking([{ date: D1, mode: 'events', events: day1.slice(0, 2) }, { date: D2, mode: 'events', events: day2 }], { rules: rules() });
  // subtotal 35000 + 90000 = 125000; multi_event 5% each day (1750 + 4500) + multi_day 10% (12500) = 18750 (15%) < 20%
  assert.equal(pricing.subtotal, 125000); assert.equal(pricing.totalDiscount, 18750); assert.equal(pricing.final, 106250); assert.equal(bookingType, 'multi_day');
  assert.ok(!pricing.capped);
});
t('full days on two days + returning couple hits the 20% cap', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }, { date: D2, mode: 'full_day', events: day2 }], { rules: rules(), priorBookings: 2 });
  // 155000: full_day 15% (9750 + 13500) + multi_day 10% (15500) + repeat 5% (7750) = 46500 > cap 31000
  assert.equal(pricing.eligibleSubtotal, 155000); assert.equal(pricing.totalDiscount, 31000); assert.equal(pricing.final, 124000); assert.ok(pricing.capped);
  const repeat = pricing.discounts.find((d) => d.type === 'repeat');
  assert.equal(repeat.amount, 0); assert.ok(repeat.trimmed); assert.match(repeat.reason, /limited to 20%/);
});
t('discounts are calculated on the eligible subtotal, not compounded', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'events', events: [ev('A', 10000)] }, { date: D2, mode: 'events', events: [ev('B', 10000)] }], { rules: rules({ maxPercent: 100 }), priorBookings: 1 });
  // 10% + 5% of 20000 = 3000 (compounding would give 2900)
  assert.equal(pricing.totalDiscount, 3000);
});
t('repeat discount needs prior confirmed bookings (0 -> none)', () => {
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: [day1[0]] }], { rules: rules(), priorBookings: 0 }).pricing.totalDiscount, 0);
  assert.equal(priceBooking([{ date: D1, mode: 'events', events: [day1[0]] }], { rules: rules(), priorBookings: 1 }).pricing.totalDiscount, 750);
});
t('multi-day counts days across the whole checkout (different vendors per day)', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'events', events: [day1[0]] }], { rules: rules(), checkoutDays: 2 });
  assert.equal(types(pricing), 'multi_day'); assert.equal(pricing.totalDiscount, 1500);
});
t('"best" stacking keeps only the largest discount type', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }, { date: D2, mode: 'full_day', events: day2 }], { rules: rules({ stacking: 'best', maxPercent: 100 }), priorBookings: 3 });
  assert.equal(types(pricing), 'full_day'); assert.equal(pricing.totalDiscount, 9750 + 13500);
});
t('priority decides what is trimmed by the cap', () => {
  const r = rules({ maxPercent: 10, priority: ['repeat', 'multi_day', 'full_day', 'multi_event'] });
  const { pricing } = priceBooking([{ date: D1, mode: 'full_day', events: day1 }, { date: D2, mode: 'full_day', events: day2 }], { rules: r, priorBookings: 1 });
  assert.equal(pricing.discounts[0].type, 'repeat'); assert.equal(pricing.discounts[0].amount, 7750); assert.equal(pricing.totalDiscount, 15500);
});
t('switched-off discounts and engine', () => {
  assert.equal(priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: rules({ enabled: false }) }).pricing.totalDiscount, 0);
  const r = rules(); r.fullDay.enabled = false;
  assert.equal(priceBooking([{ date: D1, mode: 'full_day', events: day1 }], { rules: r }).pricing.totalDiscount, 0);
});
t('whole-date (older) days: no day discount, multi-day still applies', () => {
  const { pricing } = priceBooking([{ date: D1, mode: 'date', events: [], subtotal: 100000 }, { date: D2, mode: 'date', events: [], subtotal: 100000 }], { rules: rules() });
  assert.equal(pricing.totalDiscount, 20000); assert.equal(types(pricing), 'multi_day');
});
t('multi-event tiers: highest reached tier only', () => {
  const r = rules(); assert.equal(multiEventTier(r, 1), null); assert.equal(multiEventTier(r, 2).percent, 5); assert.equal(multiEventTier(r, 5).percent, 10);
});
t('settings defaults fill older documents', () => {
  const s = withDefaults({ bookingApproval: 'manual', discounts: { fullDay: { percent: 12 } } });
  assert.equal(s.discounts.fullDay.percent, 12); assert.equal(s.discounts.fullDay.enabled, true); assert.equal(s.discounts.maxPercent, 20); assert.equal(s.fullDayPackages, true);
});

console.log('Vendor prices and coverage');
const vendor = { startingPrice: 25000, packages: [{ name: 'Gold', price: 45000 }], eventPricing: [{ eventName: 'Haldi', price: 15000 }, { eventName: 'Wedding', price: 60000 }], eventsOffered: [] };
t('event price: exact name, partial name, starting price, chosen package', () => {
  assert.equal(eventPrice(vendor, 'Haldi'), 15000);
  assert.equal(eventPrice(vendor, 'Wedding (Pheras)'), 60000);
  assert.equal(eventPrice(vendor, 'Sangeet'), 25000);
  assert.equal(eventPrice(vendor, 'Haldi', 'Gold'), 45000);
});
t('vendors only offer the events they cover', () => {
  const v = { eventsOffered: ['Sangeet', 'Reception'] };
  assert.ok(offersEvent(v, 'Sangeet')); assert.ok(offersEvent(v, 'Bou Bhaat & Reception')); assert.ok(!offersEvent(v, 'Haldi'));
  assert.ok(offersEvent({ eventsOffered: [] }, 'Anything'));
});

console.log('Time slots');
t('reads event times', () => {
  assert.equal(startMinutes('7:30 PM onwards'), 1170); assert.equal(startMinutes('10:00 AM'), 600); assert.equal(startMinutes('9:15 PM (muhurat)'), 1275);
  assert.equal(startMinutes('21:15'), 1275); assert.equal(startMinutes('Evening'), null);
  assert.deepEqual(slotFor('10:00 PM', 4), { start: 1320, end: 1440 });
});
t('overlapping slots clash, separate ones do not', () => {
  const v = { unavailableDates: [], bookedSlots: [{ date: D1, start: 600, end: 840, booking: 'x' }] };
  assert.equal(conflictsWith(v, { whole: [], slots: [{ date: D1, start: 1200, end: 1440 }] }).length, 0);
  assert.equal(conflictsWith(v, { whole: [], slots: [{ date: D1, start: 720, end: 960 }] }).length, 1);
  assert.equal(conflictsWith(v, { whole: [D1], slots: [] }).length, 1, 'a full day cannot take a partly booked day');
  assert.equal(conflictsWith(v, { whole: [], slots: [{ date: D1, start: 720, end: 960 }] }, 'x').length, 0, 'own holds ignored');
});
t('full-day and whole-date bookings hold the day; event bookings hold slots', () => {
  const h = holdsFor({ _id: 'b', days: [{ date: D1, mode: 'full_day', events: [{ start: 600, end: 840 }] }, { date: D2, mode: 'events', events: [{ start: 600, end: 840 }, { start: null }] }] });
  assert.deepEqual(h.whole, [D1, D2]); assert.equal(h.slots.length, 0, 'an event without a time holds its whole day');
  const h2 = holdsFor({ _id: 'b', days: [{ date: D2, mode: 'events', events: [{ start: 600, end: 840 }] }] });
  assert.deepEqual(h2.whole, []); assert.equal(h2.slots.length, 1);
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
